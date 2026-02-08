"""
Memory Manager for Axiom - Orchestrates the complete memory system.
Bridges between your Axiom pipeline and the Redis vector memory system.
"""

# import hashlib
# import json
from datetime import datetime, timezone
import hashlib
from typing import Dict, Any, Optional #, List, Tuple
# from dataclasses import dataclass

from redis.commands.search.query import Query
from .schemas import (
    MemoryWriteContext,
    MemoryContext,
    # UserMemory,
    # TopicMemory,
    # DecisionMemory,
)
from .redis_vector import RedisVectorMemory
from .policy import MemoryPolicyEngine#, PolicyResult


class AxiomMemoryManager:
    """
    Main orchestrator for Axiom's memory system.
    Handles user ID derivation, memory lifecycle, and integration with Axiom pipeline.
    """

    def __init__(
        self, redis_url: str = "redis://localhost:6379", use_embeddings: bool = True
    ):
        """
        Initialize the memory manager.

        Args:
            redis_url: Redis Stack connection URL
            use_embeddings: Whether to use semantic embeddings (disable for faster testing)
        """
        # Core components
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

        Args:
            user_profile: User profile description
            topic: Current topic being queried
            current_query: Optional query text for semantic search

        Returns:
            MemoryContext with relevant memories as hints
        """
        # Derive user ID
        user_id = self.derive_user_id(user_profile)

        # Get memory context from vector store
        memory_context = self.vector_memory.get_memory_context(
            user_id=user_id,
            topic=topic,
            current_query=current_query if self.use_embeddings else "",
        )

        return memory_context

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

        Args:
            user_profile: User profile description
            topic: Topic that was analyzed
            verdict_data: Verdict node output
            signal_data: Signal framing node output
            reality_check_data: Reality check node output
            pipeline_state: Full pipeline state

        Returns:
            Dictionary with processing results
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

        # Process verdict through vector memory system
        memory_results = self.vector_memory.process_verdict(ctx)

        # Log what happened
        self._log_memory_operations(ctx, memory_results)

        # Return comprehensive results
        return {
            "user_id": user_id,
            "memory_stored": any(
                [
                    memory_results["user_traits"],
                    memory_results["topic_patterns"],
                    memory_results["decision_stored"],
                ]
            ),
            "details": memory_results,
            "context_used": None,  # Context was used in verdict node, not here
        }

    def get_user_profile_summary(self, user_profile: str) -> Dict[str, Any]:
        """
        Get comprehensive user profile from memory system.

        Args:
            user_profile: User profile description

        Returns:
            Dictionary with user traits and statistics
        """
        user_id = self.derive_user_id(user_profile)

        # Get user traits (via fallback method since we don't have a query)
        traits = self.vector_memory._get_user_traits(user_id, limit=10)

        # Get recent decisions
        decisions = self.vector_memory._get_recent_decisions(user_id, limit=5)

        # Calculate statistics
        total_traits = len(traits)
        total_decisions = len(decisions)

        # Find strongest trait
        strongest_trait = None
        if traits:
            strongest_trait = max(traits, key=lambda x: x.get("confidence", 0))

        # Calculate decision distribution
        verdict_counts = {}
        for decision in decisions:
            verdict = decision.get("verdict", "")
            verdict_counts[verdict] = verdict_counts.get(verdict, 0) + 1

        return {
            "user_id": user_id,
            "traits": traits,
            "total_traits": total_traits,
            "strongest_trait": strongest_trait,
            "recent_decisions": decisions,
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
            print(f"💾 Stored memories for user {ctx.user_id}:")

            if results["user_traits"]:
                print(f"  👤 User traits: {len(results['user_traits'])}")
                for trait in results["user_traits"]:
                    print(f"    • {trait.get('description', 'Unknown')}")

            if results["topic_patterns"]:
                print(f"  📊 Topic patterns: {len(results['topic_patterns'])}")
                for pattern in results["topic_patterns"]:
                    print(f"    • {pattern.get('description', 'Unknown')}")

            if results["decision_stored"]:
                print(f"  🕰️  Decision stored: {ctx.verdict} on {ctx.topic}")
        else:
            print(
                f"⏭️  No memories stored for {ctx.topic} (reasons: {results.get('reasons', {})})"
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
