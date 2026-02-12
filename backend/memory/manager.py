"""
Memory Manager for Axiom - Orchestrates the complete memory system.
Bridges between your Axiom pipeline and the Redis vector memory system.
"""

# import hashlib
# import json
from datetime import datetime, timezone
import hashlib
from typing import Dict, Any, Optional, List, Literal
# from dataclasses import dataclass

try:
    from redis.commands.search.query import Query
except (ImportError, ModuleNotFoundError):
    class Query:
        def __init__(self, *args, **kwargs): pass
        def sort_by(self, *args, **kwargs): return self
        def limit_fields(self, *args, **kwargs): return self
        def paging(self, *args, **kwargs): return self
        def dialect(self, *args, **kwargs): return self
from .schemas import (
    MemoryWriteContext,
    MemoryContext,
    InteractionMemory,
    MemoryType,
    # UserMemory,
    # TopicMemory,
    # DecisionMemory,
)
from .redis_vector import RedisVectorMemory
from .policy import MemoryPolicyEngine#, PolicyResult
from .memory_service import MemoryService


class AxiomMemoryManager:
    """
    Main orchestrator for Axiom's memory system.
    Handles user ID derivation, memory lifecycle, and integration with Axiom pipeline.
    """

    def __init__(
        self, redis_url: str = None, use_embeddings: bool = True
    ):
        """
        Initialize the memory manager.

        Args:
            redis_url: Redis Stack connection URL (defaults to REDIS_URL env or localhost)
            use_embeddings: Whether to use semantic embeddings
        """
        import os
        if not redis_url:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            
        # Core components
        self.sql_memory = MemoryService()
        self.vector_memory = RedisVectorMemory(redis_url)
        self.policy_engine = MemoryPolicyEngine()

        # User ID cache (user_profile → user_id)
        self.user_id_cache: Dict[str, str] = {}

        # Configuration
        self.use_embeddings = use_embeddings and (
            self.vector_memory.embedder is not None
        )

        if not self.use_embeddings:
            print(
                "[WARN]  Embeddings disabled or not available - using keyword-based fallback"
            )

        print("[BRAIN] Axiom Memory Manager initialized")

    def derive_user_id(self, user_profile: str) -> str:
        """
        Derive a stable user ID from user profile string.

        Args:
            user_profile: The user profile description string

        Returns:
            Stable user ID for memory storage
        """
        # Check cache first
        if user_profile in self.user_id_cache:
            return self.user_id_cache[user_profile]

        # Create deterministic hash from profile
        # In production, you'd use actual user ID from auth system
        profile_hash = hashlib.sha256(user_profile.encode()).hexdigest()[:16]
        user_id = f"axiom_user_{profile_hash}"

        # Cache for future use
        self.user_id_cache[user_profile] = user_id

        return user_id

    def create_memory_context(
        self, user_profile: str, topic: str, current_query: str = ""
    ) -> MemoryContext:
        """
        Create memory context for a new query (READ-ONLY phase).
        Pivoted: Now uses SQL search primarily, Redis Vector as 'bonus' if available.
        """
        # Derive user ID
        user_id = self.derive_user_id(user_profile)

        # 1. Primary Context from SQL (Keyword search + Recency)
        sql_memories = self.sql_memory.get_recent_memories(user_id, limit=5, content_type=None)
        if current_query:
            search_results = self.sql_memory.search_memories(user_id, current_query, limit=5)
            # Combine and deduplicate
            seen_ids = {m.id for m in sql_memories}
            for m in search_results:
                if m.id not in seen_ids:
                    sql_memories.append(m)

        # Convert SQL models to MemoryContext categories
        user_traits = [m.content for m in sql_memories if m.content_type == "trait"]
        topic_patterns = [m.content for m in sql_memories if m.content_type == "pattern"]
        decisions = [m.content for m in sql_memories if m.content_type == "decision"]

        # 2. Secondary/Legacy Context from Vector (Safe call)
        try:
            vector_context = self.vector_memory.get_memory_context(
                user_id=user_id,
                topic=topic,
                current_query=current_query if self.use_embeddings else "",
            )
            # Merge vector findings into context strings
            user_traits.extend(vector_context.user_traits)
            topic_patterns.extend(vector_context.topic_patterns)
            decisions.extend([d.verdict for d in vector_context.historical_decisions])
        except Exception as e:
             print(f"[WARN] Vector memory lookup skipped (likely Upstash/Search disabled): {e}")

        return MemoryContext(
            user_id=user_id,
            user_traits=list(set(user_traits)),
            topic_patterns=list(set(topic_patterns)),
            historical_decisions=[], # We'll just use the strings in simplified view for now
            status="sql_primary"
        )

    def process_verdict(
        self,
        user_profile: str,
        topic: str,
        verdict_data: Dict[str, Any],
        signal_data: Dict[str, Any],
        reality_check_data: Dict[str, Any],
        pipeline_state: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Process a completed verdict and store relevant memories (WRITE phase).
        Pivoted: Writes to SQL primary, Redis Vector secondary (safe).
        """
        # Derive user ID
        user_id = self.derive_user_id(user_profile)

        # Create memory write context
        ctx = MemoryWriteContext(
            user_id=user_id,
            topic=topic,
            verdict=verdict_data.get("verdict", ""),
            confidence=verdict_data.get("confidence", "low"),
            reasoning=verdict_data.get("reasoning", ""),
            user_context=signal_data.get("user_context_summary", ""),
            market_signal=reality_check_data.get("market_signal", "weak"),
            hype_score=reality_check_data.get("hype_score", 0),
            risk_factors=reality_check_data.get("risk_factors", []),
            signal_status=signal_data.get("status", "insufficient_signal"),
            contract_violation=pipeline_state.get("contract_violation", False),
        )

        # 1. Primary Storage: SQL
        sql_ids = []
        if ctx.verdict:
            sql_id = self.sql_memory.store_memory(
                user_id=user_id,
                content_type="decision",
                content=f"Topic: {topic} | Verdict: {ctx.verdict} | Reasoning: {ctx.reasoning}",
                metadata={"topic": topic, "confidence": ctx.confidence}
            )
            sql_ids.append(sql_id)

        # 2. Secondary Storage: Vector (Safe call)
        memory_results = {"user_traits": [], "topic_patterns": [], "decision_stored": False}
        try:
            memory_results = self.vector_memory.process_verdict(ctx)
        except Exception as e:
            print(f"[WARN] Redis Vector storage skipped: {e}")

        # Log what happened
        self._log_memory_operations(ctx, memory_results)

        # Return comprehensive results
        return {
            "user_id": user_id,
            "memory_stored": len(sql_ids) > 0 or any(
                [
                    memory_results["user_traits"],
                    memory_results["topic_patterns"],
                    memory_results["decision_stored"],
                ]
            ),
            "sql_ids": sql_ids,
            "details": memory_results,
        }

    def store_interaction(
        self,
        user_profile: str,
        interaction_type: Literal["query", "response", "notification"],
        content: str,
        topic: Optional[str] = None,
        role: Literal["user", "assistant", "system"] = "assistant",
        confidence: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Store a user/agent interaction in memory.
        Pivoted: SQL primary, Redis secondary.
        """
        user_id = self.derive_user_id(user_profile)

        # 1. Store in SQL
        sql_id = self.sql_memory.record_interaction(
            user_id=user_id,
            interaction_type=interaction_type,
            content=content,
            related_memory_ids=[]
        )

        # 2. Store in Redis (Safe call)
        key = None
        try:
            interaction = InteractionMemory(
                user_id=user_id,
                interaction_type=interaction_type,
                content=content,
                topic=topic,
                role=role,
                confidence=confidence,
            )
            # Generate embedding if enabled
            if self.use_embeddings:
                try:
                    interaction.embedding = self.vector_memory.encode_vec(content)
                except: pass
                
            key = f"axiom:interaction:{user_id}:{interaction.id}"
            self.vector_memory.redis.hset(key, mapping=interaction.to_redis_dict())
        except Exception as e:
            print(f"[WARN] Interaction storage in Redis skipped: {e}")

        return {"user_id": user_id, "interaction_id": sql_id, "redis_key": key}

    def get_interaction_history(
        self, user_profile: str, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Retrieve recent interaction history for a user.

        Args:
            user_profile: User profile description
            limit: Max interactions to return

        Returns:
            List of interactions sorted by time
        """
        user_id = self.derive_user_id(user_profile)
        interactions = []

        # 1. Primary: SQL Interaction History
        sql_interactions = self.sql_memory.get_interaction_history(user_id, limit=limit)
        for si in sql_interactions:
             interactions.append({
                 "id": str(si.id),
                 "type": si.interaction_type,
                 "content": si.content,
                 "created_at": si.created_at.timestamp() if si.created_at else None,
                 "source": "sql"
             })

        # 2. Secondary: Redis Interaction History (Safe Call)
        if self.vector_memory.search_available:
            try:
                query = (
                    Query(f"@user_id:{user_id}")
                    .sort_by("created_at", asc=False)
                    .paging(0, limit)
                )
                results = self.vector_memory.redis.ft("idx:axiom:interactions").search(query)
                
                for doc in results.docs:
                    try:
                        raw_data = self.vector_memory.redis.hgetall(doc.id)
                        if raw_data:
                            interaction = InteractionMemory.from_redis_dict(raw_data).model_dump()
                            interaction["source"] = "redis"
                            interactions.append(interaction)
                    except: pass
            except Exception as e:
                print(f"[WARN] Redis interaction history search skipped: {e}")

        # Return combined list sorted by time
        return sorted(interactions, key=lambda x: x.get("created_at", 0), reverse=True)[:limit]

    def get_user_profile_summary(self, user_profile: str) -> Dict[str, Any]:
        """
        Get comprehensive user profile from memory system.

        Args:
            user_profile: User profile description

        Returns:
            Dictionary with user traits and statistics
        """
        user_id = self.derive_user_id(user_profile)

        # 1. Primary data from SQL
        sql_memories = self.sql_memory.get_recent_memories(user_id, limit=50)
        
        traits = [{"fact": m.content, "confidence": 0.9, "id": str(m.id)} for m in sql_memories if m.content_type == "trait"]
        decisions = []
        for m in sql_memories:
            if m.content_type == "decision":
                # Decision content is stored as "Topic: ... | Verdict: ... | Reasoning: ..."
                # Simple extraction for summary view
                content = m.content
                topic = "Unknown"
                if "Topic: " in content:
                    topic = content.split("Topic: ")[1].split(" | Verdict:")[0]
                
                decisions.append({
                    "id": str(m.id),
                    "topic": topic,
                    "content": content,
                    "created_at": m.created_at.timestamp() if m.created_at else None
                })

        # 2. Secondary data from Redis (Safe Call)
        if self.vector_memory.search_available:
            try:
                vector_traits = self.vector_memory._get_user_traits(user_id, limit=10)
                vector_decisions = self.vector_memory._get_recent_decisions(user_id, limit=5)
                # Merge (simple append for now)
                traits.extend(vector_traits)
                decisions.extend(vector_decisions)
            except: pass

        # Calculate statistics
        total_traits = len(traits)
        total_decisions = len(decisions)

        # Find strongest trait
        strongest_trait = None
        if traits:
            strongest_trait = max(traits, key=lambda x: x.get("confidence", 0))

        # Calculate decision distribution
        verdict_counts = {}
        for d in decisions:
            verdict = d.get("verdict", "Unknown")
            verdict_counts[verdict] = verdict_counts.get(verdict, 0) + 1

        return {
            "user_id": user_id,
            "traits": traits[:20],
            "total_traits": total_traits,
            "strongest_trait": strongest_trait,
            "recent_decisions": decisions[:10],
            "total_decisions": total_decisions,
            "verdict_distribution": verdict_counts,
            "profile_age_days": self._calculate_profile_age(user_id),
        }

    def clear_user_memories(self, user_profile: str = None) -> int:
        """
        Clear memories for a specific user or all users.

        Args:
            user_profile: If provided, clear only this user's memories

        Returns:
            Number of keys deleted
        """
        if user_profile:
            # Clear specific user's memories
            user_id = self.derive_user_id(user_profile)

            # Get all keys for this user
            patterns = [f"axiom:user_trait:{user_id}:*", f"axiom:decision:{user_id}:*"]

            keys_to_delete = []
            for pattern in patterns:
                keys = self.vector_memory.redis.keys(pattern)
                keys_to_delete.extend(keys)

            if keys_to_delete:
                deleted = self.vector_memory.redis.delete(*keys_to_delete)
                print(f"[CLEAN] Deleted {deleted} memories for user: {user_id}")
                return deleted

            return 0
        else:
            # Clear all memories
            return self.vector_memory.clear_all_memories()

    def health_check(self) -> Dict[str, Any]:
        """
        Perform system health check.

        Returns:
            Dictionary with health status and statistics
        """
        try:
            # Test Redis connection
            redis_ok = self.vector_memory.redis.ping()

            # Test indexes
            indexes_ok = True
            index_names = [
                "idx:axiom:user_traits",
                "idx:axiom:topic_patterns",
                "idx:axiom:decisions",
            ]

            for index in index_names:
                try:
                    self.vector_memory.redis.ft(index).info()
                except Exception:
                    indexes_ok = False
                    break

            # Get memory statistics
            patterns = [
                "axiom:user_trait:*",
                "axiom:topic_pattern:*",
                "axiom:decision:*",
            ]
            stats = {}

            for pattern in patterns:
                keys = self.vector_memory.redis.keys(pattern)
                stats[pattern.split(":")[1]] = len(keys)

            # Check embedding model
            embeddings_ok = self.vector_memory.embedder is not None

            return {
                "status": "healthy" if redis_ok and indexes_ok else "degraded",
                "redis_connected": redis_ok,
                "indexes_healthy": indexes_ok,
                "embeddings_available": embeddings_ok,
                "memory_counts": stats,
                "user_cache_size": len(self.user_id_cache),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    # ============================================================================
    # PRIVATE METHODS
    # ============================================================================

    def _log_memory_operations(self, ctx: MemoryWriteContext, results: Dict[str, Any]):
        """Log memory operations for debugging and observability."""
        if any(
            [
                results["user_traits"],
                results["topic_patterns"],
                results["decision_stored"],
            ]
        ):
            print(f"[*] Stored memories for user {ctx.user_id}:")

            if results["user_traits"]:
                print(f"  [USER] User traits: {len(results['user_traits'])}")
                for trait in results["user_traits"]:
                    print(f"    - {trait.get('description', 'Unknown')}")

            if results["topic_patterns"]:
                print(f"  [TOPIC] Topic patterns: {len(results['topic_patterns'])}")
                for pattern in results["topic_patterns"]:
                    print(f"    - {pattern.get('description', 'Unknown')}")

            if results["decision_stored"]:
                print(f"  [DATE] Decision stored: {ctx.verdict} on {ctx.topic}")
        else:
            print(
                f"[SKIP] No memories stored for {ctx.topic} (reasons: {results.get('reasons', {})})"
            )

    def _calculate_profile_age(self, user_id: str) -> Optional[float]:
        """Calculate profile age in days based on earliest memory."""
        try:
            # Find earliest user trait
            query = (
                Query(f"@user_id:{{{user_id}}}")
                .sort_by("created_at", asc=True)
                .paging(0, 1)
            )
            result = self.vector_memory.redis.ft("idx:axiom:user_traits").search(query)

            if result.docs:
                created_at = float(result.docs[0].created_at)
                age_seconds = datetime.now(timezone.utc).timestamp() - created_at
                return age_seconds / 86400  # Convert to days
        except Exception:
            pass

        return None
