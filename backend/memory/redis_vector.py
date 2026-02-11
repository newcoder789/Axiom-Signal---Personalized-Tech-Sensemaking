"""
Redis Stack integration with vector similarity search.
Handles storage, retrieval, and semantic search of memories.
"""

# import json
import hashlib
import os
import numpy as np
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional#, Tuple, Union
import redis
from redis.commands.search.field import VectorField, TagField, TextField, NumericField
from redis.commands.search.index_definition import IndexDefinition, IndexType
from redis.commands.search.query import Query
# import pickle

from .schemas import (
    # BaseMemory,
    # UserMemory,
    # TopicMemory,
    # DecisionMemory,
    MemoryWriteContext,
    MemoryContext,
)
from .policy import MemoryPolicyEngine#, PolicyResult


# ============================================================================
# METRICS & MONITORING
# ============================================================================
class MemoryMetrics:
    """Track Redis memory operations"""
    def __init__(self):
        self.writes = 0
        self.reads = 0
        self.search_queries = 0
        self.encoding_errors = 0
        self.vector_mismatches = 0
    
    def increment_write(self): self.writes += 1
    def increment_read(self): self.reads += 1
    def increment_search(self): self.search_queries += 1
    def increment_encoding_error(self): self.encoding_errors += 1
    def increment_vector_mismatch(self): self.vector_mismatches += 1
    
    def summary(self) -> Dict[str, int]:
        return {
            "writes": self.writes,
            "reads": self.reads,
            "search_queries": self.search_queries,
            "encoding_errors": self.encoding_errors,
            "vector_mismatches": self.vector_mismatches,
        }


class RedisVectorMemory:
    """
    Redis Stack vector memory system for Axiom.
    Handles semantic search, storage, and retrieval with embeddings.
    """

    def __init__(self, redis_url: str = "redis://localhost:6379", index_algorithm: str = "FLAT", memory_threshold_mb: int = 512):
        # Connect to Redis Stack using the provided URL
        self.redis = redis.Redis.from_url(
            redis_url,
            decode_responses=False,  # Keep bytes for embeddings
            socket_connect_timeout=5,
            socket_keepalive=True,
            retry_on_timeout=True,
        )

        # Test connection
        try:
            self.redis.ping()
            print("[OK] Connected to Redis Stack")
        except Exception as e:
            print(f"[X] Redis Stack connection failed: {e}")
            print(
                "   Make sure Redis Stack is running: docker run -p 6379:6379 redis/redis-stack:latest"
            )
            raise

        # Initialize embedding model
        self._init_embeddings()

        # Initialize Redis Search indexes
        self.index_algorithm = index_algorithm.upper()  # "FLAT" or "HNSW"
        if self.index_algorithm not in ("FLAT", "HNSW"):
            print(f"[WARN]  Unknown index algorithm '{self.index_algorithm}', using FLAT")
            self.index_algorithm = "FLAT"
        self._init_indexes()

        # Initialize policy engine
        self.policy = MemoryPolicyEngine()
        
        # Initialize metrics
        self.metrics = MemoryMetrics()
        # Whether RediSearch / FT.* commands are available
        self.search_available = True
        
        # Memory monitoring
        self.memory_threshold_mb = memory_threshold_mb

        # TTL settings (in seconds)
        self.USER_TRAIT_TTL = 90 * 86400  # 90 days
        self.TOPIC_PATTERN_TTL = 180 * 86400  # 180 days
        self.DECISION_TTL = 7 * 86400  # 7 days

        print(f"[BRAIN] Redis Vector Memory initialized (algorithm: {self.index_algorithm}, memory limit: {memory_threshold_mb}MB)")

    def _init_embeddings(self):
        """Initialize sentence transformer for embeddings"""
        try:
            from sentence_transformers import SentenceTransformer

            model_name = os.environ.get("SENTENCE_TRANSFORMER_MODEL", "all-MiniLM-L6-v2")
            try:
                self.embedder = SentenceTransformer(model_name)
                # Prefer embedder-provided dim if available
                try:
                    self.VECTOR_DIM = self.embedder.get_sentence_embedding_dimension()
                except Exception:
                    self.VECTOR_DIM = 384

                print(f"   [OK] Embedding model loaded (dim: {self.VECTOR_DIM})")
            except Exception as e:
                # Network or HF errors can occur while downloading model files
                print(f"   [WARN]  Could not load embedding model '{model_name}': {e}")
                print("   Tip: set HF_TOKEN environment variable or ensure network access, or set SENTENCE_TRANSFORMER_MODEL to a local model path")
                self.embedder = None
                self.VECTOR_DIM = 384
        except ImportError as e:
            print(f"   [WARN]  sentence-transformers not installed: {e}")
            print("   Install: pip install sentence-transformers")
            self.embedder = None
            self.VECTOR_DIM = 384

    # ============================================================================
    # DETERMINISTIC EMBEDDING HANDLER
    # ============================================================================
    def encode_vec(self, text: str) -> np.ndarray:
        """
        Encode text to deterministic float32 vector.
        GUARD: ensures exact dtype, shape, and validates dimensions.
        Raises ValueError if embedding dimension mismatch.
        """
        if not self.embedder:
            raise RuntimeError("Embedder not initialized. Cannot encode text.")
        
        try:
            # Encode to numpy array
            vec = self.embedder.encode(text, convert_to_numpy=True)
            
            # CRITICAL: Force float32 and validate shape
            vec = np.asarray(vec, dtype=np.float32)
            
            if vec.ndim != 1:
                vec = vec.flatten()
            
            if vec.shape[0] != self.VECTOR_DIM:
                self.metrics.increment_vector_mismatch()
                raise ValueError(
                    f"embedding dim mismatch: expected {self.VECTOR_DIM}, got {vec.shape[0]}"
                )
            
            return vec
        
        except Exception as e:
            self.metrics.increment_encoding_error()
            print(f"[X] Encoding error for text: {text[:50]}... - {e}")
            raise

    def decision_sig(self, topic: str, reasoning: str) -> str:
        """
        Create deterministic signature for decision idempotency.
        Prevents duplicate storage of same decision.
        """
        sig_str = f"{topic}|{reasoning}".encode()
        return hashlib.sha256(sig_str).hexdigest()[:16]

    def detect_contract_violation(
        self, signal_status: str, market_signal: str, verdict: str,
        hype_score: int, reasoning: str, confidence: str
    ) -> bool:
        """
        Detect contradictions between signal/reality/verdict.
        Returns True if violation detected.
        
        Edge cases handled:
        - None/empty inputs → gracefully handled with defaults
        - Case-insensitive string matching
        - Multiple violation patterns checked comprehensively
        """
        # FIXED: Add input validation and null safety
        if not signal_status or not confidence:
            return False  # Cannot check without required fields
        
        signal_status = signal_status.lower().strip()
        if isinstance(confidence, (int, float)):
            conf_score = float(confidence)
        else:
            confidence = str(confidence).lower().strip()
            conf_score = 0.5
            if "high" in confidence: conf_score = 0.9
            elif "medium" in confidence: conf_score = 0.7
            elif "low" in confidence: conf_score = 0.4
            
        if conf_score < 0.3:
            return False # Too low confidence to matter for contract violation
        
        # Ensure hype_score is valid integer
        try:
            hype_score = int(hype_score) if hype_score is not None else 0
        except (ValueError, TypeError):
            hype_score = 0
        
        # 1. Insufficient signal → should not be high confidence
        if signal_status == "insufficient_signal" and confidence == "high":
            print("   [WARN]  CONTRACT VIOLATION: insufficient signal but high confidence")
            return True
        
        # 2. Weak market + strong hype → contradictory signals (only if pursuing)
        if market_signal == "weak" and hype_score >= 9 and verdict == "pursue":
            print("   [WARN]  CONTRACT VIOLATION: weak market but high hype, yet pursuing")
            return True
        
        # 3. FIXED: No evidence in reasoning → high confidence mismatch (removed redundant check)
        # Check for multiple patterns indicating lack of evidence
        no_evidence_patterns = [
            "no direct evidence",
            "no evidence",
            "insufficient evidence",
            "lack of evidence",
            "no clear evidence",
            "evidence is lacking"
        ]
        has_no_evidence = any(pattern in reasoning for pattern in no_evidence_patterns)
        if has_no_evidence and confidence == "high":
            print("   [WARN]  CONTRACT VIOLATION: no evidence but high confidence")
            return True
        
        # 4. NEW: Weak market + high confidence → contradiction
        if market_signal == "weak" and confidence == "high" and verdict == "pursue":
            print("   [WARN]  CONTRACT VIOLATION: weak market signal but high confidence in pursuing")
            return True
        
        # 5. NEW: High hype (10) + weak market → always violation
        if hype_score == 10 and market_signal == "weak":
            print("   [WARN]  CONTRACT VIOLATION: maximum hype (10) contradicts weak market signal")
            return True
        
        return False

    def _check_memory_threshold(self) -> bool:
        """
        Check if Redis memory usage exceeds threshold.
        Returns True if memory OK, False if over limit.
        """
        try:
            info = self.redis.info("memory")
            used_mb = info.get("used_memory", 0) / (1024 * 1024)
            
            if used_mb > self.memory_threshold_mb:
                print(f"   [ALERT] MEMORY ALERT: {used_mb:.1f}MB / {self.memory_threshold_mb}MB threshold")
                self.metrics.increment_encoding_error()  # Track as error
                return False
            
            return True
        except Exception as e:
            print(f"   [WARN]  Memory check failed: {e}")
            return True  # Allow write if check fails

    def _init_indexes(self):
        """Create Redis Search indexes for vector similarity search"""
        
        # Determine index params based on algorithm
        algo_config = self._get_algo_config()

        # 1. User Traits Index
        try:
            self.redis.ft("idx:axiom:user_traits").info()
            print(f"   [OK] User traits index exists ({self.index_algorithm})")
        except Exception:
            schema = (
                TextField("user_id"),
                TagField("trait_type"),
                TextField("fact"),
                VectorField(
                    "embedding",
                    self.index_algorithm,
                    algo_config,
                ),
                NumericField("confidence"),
                NumericField("created_at"),
                NumericField("updated_at"),
                TagField("context_tags"),
                NumericField("usage_count"),
            )

            try:
                self.redis.ft("idx:axiom:user_traits").create_index(
                    fields=schema,
                    definition=IndexDefinition(
                        prefix=["axiom:user_trait:"], index_type=IndexType.HASH
                    ),
                )
                print(f"   [OK] Created user traits index ({self.index_algorithm})")
            except Exception as e:
                print(f"   [WARN]  Could not create user_traits index: {e}")
                print("   Make sure you're connected to Redis Stack with RediSearch (redis/redis-stack)")
                self.search_available = False

        # 2. Topic Patterns Index
        try:
            self.redis.ft("idx:axiom:topic_patterns").info()
            print(f"   [OK] Topic patterns index exists ({self.index_algorithm})")
        except Exception:
            schema = (
                TextField("topic"),
                TagField("pattern"),
                TextField("description"),
                VectorField(
                    "embedding",
                    self.index_algorithm,
                    algo_config,
                ),
                NumericField("confidence"),
                NumericField("evidence_count"),
                NumericField("created_at"),
                NumericField("updated_at"),
                TagField("market_signal"),
                NumericField("hype_score"),
            )

            try:
                self.redis.ft("idx:axiom:topic_patterns").create_index(
                    fields=schema,
                    definition=IndexDefinition(
                        prefix=["axiom:topic_pattern:"], index_type=IndexType.HASH
                    ),
                )
                print(f"   [OK] Created topic patterns index ({self.index_algorithm})")
            except Exception as e:
                print(f"   [WARN]  Could not create topic_patterns index: {e}")
                print("   Make sure you're connected to Redis Stack with RediSearch (redis/redis-stack)")
                self.search_available = False

        # 3. Decisions Index
        try:
            self.redis.ft("idx:axiom:decisions").info()
            print(f"   [OK] Decisions index exists ({self.index_algorithm})")
        except Exception:
            schema = (
                TextField("user_id"),
                TextField("topic"),
                TagField("verdict"),
                TextField("reasoning"),
                VectorField(
                    "reasoning_embedding",
                    self.index_algorithm,
                    algo_config,
                ),
                NumericField("confidence"),
                NumericField("created_at"),
                NumericField("ttl_days"),
                TagField("categories"),
                TagField("market_signal"),
                NumericField("hype_score"),
            )

            try:
                self.redis.ft("idx:axiom:decisions").create_index(
                    fields=schema,
                    definition=IndexDefinition(
                        prefix=["axiom:decision:"], index_type=IndexType.HASH
                    ),
                )
                print(f"   [OK] Created decisions index ({self.index_algorithm})")
            except Exception as e:
                print(f"   [WARN]  Could not create decisions index: {e}")
                print("   Make sure you're connected to Redis Stack with RediSearch (redis/redis-stack)")
                self.search_available = False

        # 4. Interactions Index
        try:
            self.redis.ft("idx:axiom:interactions").info()
            print(f"   [OK] Interactions index exists ({self.index_algorithm})")
        except Exception:
            schema = (
                TextField("user_id"),
                TagField("interaction_type"),
                TextField("content"),
                TextField("topic"),
                TagField("role"),
                VectorField(
                    "embedding",
                    self.index_algorithm,
                    algo_config,
                ),
                NumericField("created_at"),
            )

            try:
                self.redis.ft("idx:axiom:interactions").create_index(
                    fields=schema,
                    definition=IndexDefinition(
                        prefix=["axiom:interaction:"], index_type=IndexType.HASH
                    ),
                )
                print(f"   [OK] Created interactions index ({self.index_algorithm})")
            except Exception as e:
                print(f"   [WARN]  Could not create interactions index: {e}")
                self.search_available = False

    def _get_algo_config(self) -> Dict[str, Any]:
        """Get algorithm configuration for vector field"""
        if self.index_algorithm == "HNSW":
            return {
                "TYPE": "FLOAT32",
                "DIM": self.VECTOR_DIM,
                "DISTANCE_METRIC": "COSINE",
                "INITIAL_CAP": 200,
                "M": 16,
                "EF_CONSTRUCTION": 200,
                "EF_RUNTIME": 10,
            }
        else:  # FLAT
            return {
                "TYPE": "FLOAT32",
                "DIM": self.VECTOR_DIM,
                "DISTANCE_METRIC": "COSINE",
            }

    # ============================================================================
    # PUBLIC API
    # ============================================================================

    def process_verdict(self, ctx: MemoryWriteContext) -> Dict[str, Any]:
        """
        Process a completed verdict and store relevant memories.
        Returns what was stored.
        """
        results = {
            "user_traits": [],
            "topic_patterns": [],
            "decision_stored": False,
            "reasons": {},
            "metrics": {},
        }

        # CHECK: Memory threshold before proceeding
        if not self._check_memory_threshold():
            results["reasons"]["memory"] = "memory_threshold_exceeded"
            return results

        # CHECK: Contract violation detection
        if self.detect_contract_violation(
            signal_status=ctx.signal_status,
            market_signal=ctx.market_signal,
            verdict=ctx.verdict,
            hype_score=ctx.hype_score,
            reasoning=ctx.reasoning,
            confidence=ctx.confidence
        ):
            results["reasons"]["violation"] = "contract_violation_detected"
            print("   [STOP] Memory write blocked by contract violation")
            return results

        # 1. Process user traits
        user_allowed, user_reason = self.policy.should_write_user_memory(ctx)
        results["reasons"]["user"] = user_reason.value

        if user_allowed:
            traits = self._extract_user_traits(ctx)
            for trait in traits:
                trait_id = self._store_or_reinforce_user_trait(ctx.user_id, trait)
                if trait_id:
                    results["user_traits"].append(
                        {
                            "trait": trait["trait_type"],
                            "description": trait["description"],
                            "confidence": trait["confidence"],
                        }
                    )
                    self.metrics.increment_write()

        # 2. Process topic pattern
        topic_allowed, topic_reason = self.policy.should_write_topic_memory(ctx)
        results["reasons"]["topic"] = topic_reason.value

        if topic_allowed:
            pattern = self._extract_topic_pattern(ctx)
            if pattern:
                pattern_id = self._store_or_reinforce_topic_pattern(ctx.topic, pattern)
                if pattern_id:
                    results["topic_patterns"].append(
                        {
                            "pattern": pattern["pattern_type"],
                            "description": pattern["description"],
                            "confidence": pattern["confidence"],
                        }
                    )
                    self.metrics.increment_write()

        # 3. Process decision (with idempotency check)
        decision_allowed, decision_reason = self.policy.should_write_decision_memory(
            ctx
        )
        results["reasons"]["decision"] = decision_reason.value

        if decision_allowed:
            decision_id = self._store_decision(ctx)
            if decision_id:
                results["decision_stored"] = True
                results["decision_id"] = decision_id
                self.metrics.increment_write()

        results["metrics"] = self.metrics.summary()
        return results

    def get_memory_context(
        self, user_id: str, topic: str, current_query: str = ""
    ) -> MemoryContext:
        """Get relevant memories for a query"""
        context = MemoryContext()

        try:
            # NORMALIZE TOPIC CONSISTENTLY
            normalized_topic = self._normalize_topic(topic)
            print(
                f"[SEARCH] Searching for normalized topic: '{normalized_topic}' (original: '{topic}')"
            )

            # Get user traits
            context.user_traits = self._get_user_traits(user_id, limit=5)

            # Get topic patterns - search with BOTH exact and fuzzy
            topic_patterns = []

            # Try exact topic match first
            exact_patterns = self._search_topic_patterns(normalized_topic, limit=3)
            topic_patterns.extend(exact_patterns)

            # If no exact matches, try semantic search
            if not exact_patterns and current_query and self.embedder:
                semantic_patterns = self._semantic_search_topic_patterns(
                    current_query, limit=3
                )
                topic_patterns.extend(semantic_patterns)

            # Also try partial matches (e.g., "redis" should match "redis caching")
            if not topic_patterns:
                # Search for any pattern containing topic words
                for word in normalized_topic.split():
                    if len(word) > 3:  # Only meaningful words
                        partial_patterns = self._search_topic_patterns(
                            f"*{word}*",  # Wildcard search
                            limit=2,
                        )
                        topic_patterns.extend(partial_patterns)

            context.topic_patterns = topic_patterns[:3]  # Limit to 3

            # Get similar decisions
            context.similar_decisions = self._get_recent_decisions(user_id, limit=5)

            print(
                f"[OK] Found {len(context.user_traits)} traits, "
                f"{len(context.topic_patterns)} patterns, "
                f"{len(context.similar_decisions)} decisions"
            )

        except Exception as e:
            print(f"[WARN] Error getting memory context: {e}")

        return context
    def clear_all_memories(self) -> int:
        """
        COMPLETELY CLEAR all Axiom memories (for testing).
        Returns number of keys deleted.
        """
        # Delete all axiom:* keys
        keys = self.redis.keys("axiom:*")
        if keys:
            deleted = self.redis.delete(*keys)
            print(f"[CLEAN] Deleted {deleted} memory keys")

            # Try to drop indexes
            try:
                self.redis.ft("idx:axiom:user_traits").dropindex()
                self.redis.ft("idx:axiom:topic_patterns").dropindex()
                self.redis.ft("idx:axiom:decisions").dropindex()
                self.redis.ft("idx:axiom:interactions").dropindex()
                print("[OK] Dropped search indexes")
            except Exception:
                pass

            return deleted

        return 0

    # ============================================================================
    # PRIVATE: MEMORY EXTRACTION & STORAGE
    # ============================================================================

    def _extract_user_traits(self, ctx: MemoryWriteContext) -> List[Dict[str, Any]]:
        """Extract user traits from reasoning using embeddings"""
        if not self.embedder or not ctx.reasoning:
            return []

        # Define trait patterns with example phrases
        trait_patterns = [
            {
                "trait_type": "performance_focus",
                "description": "Prioritizes performance, speed, and optimization",
                "example_phrases": [
                    "improves performance",
                    "reduces latency",
                    "optimized for speed",
                    "high throughput",
                    "fast response times",
                ],
            },
            {
                "trait_type": "stability_focus",
                "description": "Prefers stable, reliable, production-ready solutions",
                "example_phrases": [
                    "production ready",
                    "battle tested",
                    "enterprise grade",
                    "stable release",
                    "reliable performance",
                ],
            },
            {
                "trait_type": "learning_focus",
                "description": "Values educational opportunities and learning",
                "example_phrases": [
                    "good for learning",
                    "educational value",
                    "teaches fundamentals",
                    "learning opportunity",
                    "understand concepts",
                ],
            },
            {
                "trait_type": "cost_sensitive",
                "description": "Mindful of costs and budget constraints",
                "example_phrases": [
                    "cost effective",
                    "within budget",
                    "affordable solution",
                    "pricing reasonable",
                    "free alternative",
                ],
            },
        ]

        try:
            # GUARD: Use deterministic encoding
            reasoning_embedding = self.encode_vec(ctx.reasoning)
        except Exception as e:
            print(f"[WARN]  Could not extract traits: {e}")
            return []

        traits = []
        for pattern in trait_patterns:
            # Create embeddings for example phrases with GUARD
            example_embeddings = []
            for phrase in pattern["example_phrases"]:
                try:
                    emb = self.encode_vec(phrase)
                    example_embeddings.append(emb)
                except Exception:
                    continue
            
            if not example_embeddings:
                continue

            # Calculate max similarity
            similarities = []
            for example_embed in example_embeddings:
                sim = np.dot(reasoning_embedding, example_embed) / (
                    np.linalg.norm(reasoning_embedding) * np.linalg.norm(example_embed)
                )
                similarities.append(sim)

            max_similarity = np.max(similarities) if similarities else 0

            # Threshold for trait detection
            if max_similarity > 0.65:
                # Calculate confidence
                confidence = self.policy.confidence_to_float(ctx.confidence)
                adjusted_confidence = max_similarity * 0.7 + confidence * 0.3

                traits.append(
                    {
                        "trait_type": pattern["trait_type"],
                        "description": pattern["description"],
                        "confidence": float(adjusted_confidence),
                        "embedding": self.encode_vec(pattern["description"]),
                        "context_tags": self._extract_context_tags(ctx.user_context),
                    }
                )

        return traits

    def _store_or_reinforce_user_trait(
        self, user_id: str, trait: Dict[str, Any]
    ) -> Optional[str]:
        """Store new user trait or reinforce existing one"""
        trait_id = f"axiom:user_trait:{user_id}:{trait['trait_type']}"

        # Check if trait already exists
        existing = self.redis.hgetall(trait_id)

        if existing:
            # Reinforce existing trait
            try:
                current_conf_bytes = existing.get(b"confidence", b"0.5")
                current_conf = float(current_conf_bytes.decode() if isinstance(current_conf_bytes, bytes) else current_conf_bytes)
                
                usage_count_bytes = existing.get(b"usage_count", b"1")
                usage_count = int(usage_count_bytes.decode() if isinstance(usage_count_bytes, bytes) else usage_count_bytes)

                # Weighted average
                new_conf = (current_conf * usage_count + trait["confidence"]) / (
                    usage_count + 1
                )

                self.redis.hset(
                    trait_id,
                    mapping={
                        "confidence": str(new_conf),
                        "usage_count": str(usage_count + 1),
                        "updated_at": str(int(datetime.now(timezone.utc).timestamp())),
                    },
                )
            except (ValueError, TypeError) as e:
                print(f"[WARN]  Error reinforcing trait: {e}")
                return None
        else:
            # Store new trait
            try:
                if trait.get("embedding") is not None:
                    embedding = trait["embedding"]
                    if isinstance(embedding, np.ndarray):
                        embedding_bytes = embedding.astype(np.float32).tobytes()
                    else:
                        embedding_bytes = embedding
                else:
                    embedding_bytes = b""

                self.redis.hset(
                    trait_id,
                    mapping={
                        "user_id": user_id,
                        "trait_type": trait["trait_type"],
                        "fact": trait["description"],
                        "embedding": embedding_bytes,
                        "confidence": str(trait["confidence"]),
                        "created_at": str(int(datetime.now(timezone.utc).timestamp())),
                        "updated_at": str(int(datetime.now(timezone.utc).timestamp())),
                        "context_tags": ",".join(trait.get("context_tags", [])),
                        "usage_count": "1",
                    },
                )
            except Exception as e:
                print(f"[WARN]  Error storing trait: {e}")
                return None

        # Set TTL
        self.redis.expire(trait_id, self.USER_TRAIT_TTL)
        return trait_id

    def _extract_topic_pattern(
        self, ctx: MemoryWriteContext
    ) -> Optional[Dict[str, Any]]:
        """Extract topic pattern from context"""
        # Determine pattern type
        pattern_type = None
        description = ""

        if ctx.market_signal == "weak":
            pattern_type = "vaporware_risk"
            description = (
                f"Limited adoption, high vaporware risk (hype: {ctx.hype_score}/10)"
            )
        elif ctx.market_signal == "strong" and ctx.hype_score < 5:
            pattern_type = "production_ready"
            description = f"Widely adopted in production (hype: {ctx.hype_score}/10)"
        elif ctx.market_signal == "mixed" and ctx.hype_score > 6:
            pattern_type = "emerging_hyped"
            description = f"Emerging with some hype (hype: {ctx.hype_score}/10)"

        # Check for learning curve in risk factors
        risk_text = " ".join(ctx.risk_factors).lower()
        if "steep" in risk_text or "learning curve" in risk_text:
            if pattern_type:
                description += " | Has steep learning curve"
            else:
                pattern_type = "steep_learning"
                description = "Known for steep learning curve"

        if not pattern_type:
            return None

        # Create embedding if model available - GUARD with encode_vec
        embedding = None
        if self.embedder:
            try:
                embedding = self.encode_vec(description)
            except Exception as e:
                print(f"[WARN]  Could not encode topic pattern: {e}")

        return {
            "pattern_type": pattern_type,
            "description": description,
            "market_signal": ctx.market_signal,
            "hype_score": ctx.hype_score,
            "confidence": self.policy.confidence_to_float(ctx.confidence),
            "embedding": embedding,
        }

    def _store_or_reinforce_topic_pattern(
        self, topic: str, pattern: Dict[str, Any]
    ) -> Optional[str]:
        """Store or reinforce topic pattern"""
        normalized_topic = self._normalize_topic(topic)
        pattern_id = f"axiom:topic_pattern:{normalized_topic}:{pattern['pattern_type']}"

        # Check if pattern exists
        existing = self.redis.hgetall(pattern_id)

        if existing:
            # Reinforce existing pattern
            try:
                evidence_count_bytes = existing.get(b"evidence_count", b"1")
                evidence_count = int(evidence_count_bytes.decode() if isinstance(evidence_count_bytes, bytes) else evidence_count_bytes) + 1
                
                current_conf_bytes = existing.get(b"confidence", b"0.5")
                current_conf = float(current_conf_bytes.decode() if isinstance(current_conf_bytes, bytes) else current_conf_bytes)

                # Weighted average
                new_conf = (
                    current_conf * (evidence_count - 1) + pattern["confidence"]
                ) / evidence_count

                self.redis.hset(
                    pattern_id,
                    mapping={
                        "evidence_count": str(evidence_count),
                        "confidence": str(new_conf),
                        "updated_at": str(int(datetime.now(timezone.utc).timestamp())),
                    },
                )
            except (ValueError, TypeError) as e:
                print(f"[WARN]  Error reinforcing pattern: {e}")
                return None
        else:
            # Store new pattern
            try:
                embedding_bytes = b""
                if pattern.get("embedding") is not None:
                    embedding = pattern["embedding"]
                    if isinstance(embedding, np.ndarray):
                        embedding_bytes = embedding.astype(np.float32).tobytes()
                    else:
                        embedding_bytes = embedding

                self.redis.hset(
                    pattern_id,
                    mapping={
                        "topic": normalized_topic,
                        "pattern": pattern["pattern_type"],
                        "description": pattern["description"],
                        "embedding": embedding_bytes,
                        "confidence": str(pattern["confidence"]),
                        "evidence_count": "1",
                        "created_at": str(int(datetime.now(timezone.utc).timestamp())),
                        "updated_at": str(int(datetime.now(timezone.utc).timestamp())),
                        "market_signal": pattern["market_signal"],
                        "hype_score": str(pattern["hype_score"]),
                    },
                )
            except Exception as e:
                print(f"[WARN]  Error storing pattern: {e}")
                return None

        self.redis.expire(pattern_id, self.TOPIC_PATTERN_TTL)
        return pattern_id

    def _store_decision(self, ctx: MemoryWriteContext) -> Optional[str]:
        """Store decision with vector embedding (IDEMPOTENT)"""
        # GUARD: Compute signature for idempotency
        sig = self.decision_sig(ctx.topic, ctx.reasoning)
        sig_key = f"axiom:decision_sig:{sig}"
        
        # CHECK: If signature exists, reinforce existing instead of creating duplicate
        existing_sig = self.redis.get(sig_key)
        if existing_sig:
            existing_id = existing_sig.decode() if isinstance(existing_sig, bytes) else existing_sig
            print(f"   [INFO] Decision already exists (sig: {sig}), skipping duplicate")
            return existing_id
        
        decision_id = f"axiom:decision:{ctx.user_id}:{hashlib.md5(ctx.topic.encode()).hexdigest()[:12]}"

        # Create embedding for reasoning - GUARD with encode_vec
        reasoning_embedding = None
        if self.embedder:
            try:
                reasoning_embedding = self.encode_vec(ctx.reasoning).astype(np.float32).tobytes()
            except Exception as e:
                print(f"[WARN]  Could not encode decision reasoning: {e}")

        # Extract categories
        categories = self._extract_categories(
            ctx.topic, ctx.reasoning, ctx.user_context
        )

        confidence_score = self.policy.confidence_to_float(ctx.confidence)

        self.redis.hset(
            decision_id,
            mapping={
                "user_id": ctx.user_id,
                "topic": ctx.topic,
                "verdict": ctx.verdict,
                "reasoning": ctx.reasoning,
                "reasoning_embedding": reasoning_embedding or b"",
                "confidence": str(confidence_score),
                "created_at": str(int(datetime.now(timezone.utc).timestamp())),
                "ttl_days": "7",
                "categories": ",".join(categories),
                "market_signal": ctx.market_signal,
                "hype_score": str(ctx.hype_score),
            },
        )
        
        # Store signature with same TTL to track idempotency
        self.redis.setex(sig_key, self.DECISION_TTL, decision_id)

        self.redis.expire(decision_id, self.DECISION_TTL)
        return decision_id

    # ============================================================================
    # PRIVATE: MEMORY RETRIEVAL (VECTOR SIMILARITY)
    # ============================================================================

    def _find_similar_user_traits(
        self, user_id: str, query: str, limit: int = 3
    ) -> List[Dict[str, Any]]:
        """Find similar user traits using vector similarity"""
        if not self.embedder or not query:
            return self._get_user_traits(user_id, limit)

        try:
            # Create embedding for query - GUARD with encode_vec
            query_embedding = self.encode_vec(query).astype(np.float32).tobytes()
            self.metrics.increment_search()

            # Build vector similarity query
            base_query = f"@user_id:{user_id}"
            search_query = (
                Query(base_query).sort_by("confidence", asc=False).paging(0, limit)
            )

            params_dict = {"vector": query_embedding, "distance_threshold": 0.5}

            result = self.redis.ft("idx:axiom:user_traits").search(
                search_query, query_params=params_dict
            )

            traits = []
            for doc in result.docs:
                traits.append(
                    {
                        "fact": doc.fact,
                        "trait_type": getattr(doc, "trait_type", "unknown"),
                        "confidence": float(doc.confidence),
                        "usage_count": int(getattr(doc, "usage_count", 1)),
                    }
                )
            
            self.metrics.increment_read()
            return traits

        except Exception as e:
            print(f"Vector search error for user traits: {e}")
            return self._get_user_traits(user_id, limit)

    def _get_user_traits(self, user_id: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Get user traits sorted by confidence (fallback)"""
        try:
            query = (
                Query(f"@user_id:{user_id}")
                .sort_by("confidence", asc=False)
                .paging(0, limit)
            )
            result = self.redis.ft("idx:axiom:user_traits").search(query)

            traits = []
            for doc in result.docs:
                traits.append({"fact": doc.fact, "confidence": float(doc.confidence)})

            return traits
        except Exception as e:
            print(f"Error getting user traits: {e}")
            return []

    def _find_similar_topic_patterns(
        self, topic: str, query: str, limit: int = 2
    ) -> List[Dict[str, Any]]:
        """Find similar topic patterns using vector similarity"""
        normalized_topic = self._normalize_topic(topic)

        if not self.embedder or not query:
            return self._get_topic_patterns(normalized_topic, limit)

        try:
            query_embedding = self.encode_vec(query).astype(np.float32).tobytes()
            self.metrics.increment_search()

            # Search for patterns about this topic
            base_query = f"@topic:{normalized_topic}"
            search_query = (
                Query(base_query).sort_by("evidence_count", asc=False).paging(0, limit)
            )

            params_dict = {"vector": query_embedding, "distance_threshold": 0.6}

            result = self.redis.ft("idx:axiom:topic_patterns").search(
                search_query, query_params=params_dict
            )

            patterns = []
            for doc in result.docs:
                patterns.append(
                    {
                        "pattern": doc.pattern,
                        "description": doc.description,
                        "evidence_count": int(doc.evidence_count),
                        "confidence": float(doc.confidence),
                        "market_signal": getattr(doc, "market_signal", "unknown"),
                        "hype_score": int(getattr(doc, "hype_score", 0)),
                    }
                )
            
            self.metrics.increment_read()
            return patterns

        except Exception as e:
            print(f"Vector search error for topic patterns: {e}")
            return self._get_topic_patterns(normalized_topic, limit)

    def _search_topic_patterns(self, topic: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Search topic patterns by name (exact or wildcard)"""
        try:
            # Support wildcard searches (e.g., "*redis*")
            query = (
                Query(f"@topic:{topic}")
                .sort_by("evidence_count", asc=False)
                .paging(0, limit)
            )
            result = self.redis.ft("idx:axiom:topic_patterns").search(query)

            patterns = []
            for doc in result.docs:
                patterns.append(
                    {
                        "pattern": doc.pattern,
                        "description": doc.description,
                        "evidence_count": int(doc.evidence_count),
                        "confidence": float(doc.confidence),
                        "market_signal": getattr(doc, "market_signal", "unknown"),
                        "hype_score": int(getattr(doc, "hype_score", 0)),
                    }
                )

            self.metrics.increment_read()
            return patterns
        except Exception as e:
            print(f"Error searching topic patterns: {e}")
            return []

    def _semantic_search_topic_patterns(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Search topic patterns using semantic similarity with embeddings"""
        if not self.embedder or not query:
            return []

        try:
            # Create embedding for query - GUARD with encode_vec
            query_embedding = self.encode_vec(query).astype(np.float32).tobytes()
            self.metrics.increment_search()

            # Search all patterns for semantic similarity
            search_query = (
                Query("*")
                .sort_by("confidence", asc=False)
                .paging(0, limit)
            )

            params_dict = {"vector": query_embedding, "distance_threshold": 0.5}

            result = self.redis.ft("idx:axiom:topic_patterns").search(
                search_query, query_params=params_dict
            )

            patterns = []
            for doc in result.docs:
                patterns.append(
                    {
                        "pattern": doc.pattern,
                        "description": doc.description,
                        "evidence_count": int(doc.evidence_count),
                        "confidence": float(doc.confidence),
                        "market_signal": getattr(doc, "market_signal", "unknown"),
                        "hype_score": int(getattr(doc, "hype_score", 0)),
                    }
                )

            self.metrics.increment_read()
            return patterns

        except Exception as e:
            print(f"Semantic search error for topic patterns: {e}")
            return []

    def _get_topic_patterns(self, topic: str, limit: int = 2) -> List[Dict[str, Any]]:
        """Get topic patterns sorted by evidence count (fallback)"""
        try:
            query = (
                Query(f"@topic:{topic}")
                .sort_by("evidence_count", asc=False)
                .paging(0, limit)
            )
            result = self.redis.ft("idx:axiom:topic_patterns").search(query)

            patterns = []
            for doc in result.docs:
                patterns.append(
                    {
                        "pattern": doc.pattern,
                        "description": doc.description,
                        "evidence_count": int(doc.evidence_count),
                    }
                )

            return patterns
        except Exception as e:
            print(f"Error getting topic patterns: {e}")
            return []

    def _find_similar_decisions(
        self, user_id: str, topic: str, query: str, limit: int = 3
    ) -> List[Dict[str, Any]]:
        """Find similar past decisions using vector similarity"""
        if not self.embedder or not query:
            return self._get_recent_decisions(user_id, limit)

        try:
            query_embedding = self.encode_vec(query).astype(np.float32).tobytes()
            self.metrics.increment_search()

            # Build query: user's decisions, vector similarity
            base_query = f"@user_id:{user_id}"
            search_query = (
                Query(base_query).sort_by("created_at", asc=False).paging(0, limit)
            )

            params_dict = {"vector": query_embedding, "distance_threshold": 0.5}

            result = self.redis.ft("idx:axiom:decisions").search(
                search_query, query_params=params_dict
            )

            decisions = []
            current_time = datetime.now(timezone.utc).timestamp()

            for doc in result.docs:
                created_at = int(doc.created_at)
                days_ago = (current_time - created_at) / 86400

                decisions.append(
                    {
                        "topic": doc.topic,
                        "verdict": doc.verdict,
                        "reasoning": doc.reasoning[:150] + "..."
                        if len(doc.reasoning) > 150
                        else doc.reasoning,
                        "confidence": float(doc.confidence),
                        "days_ago": round(days_ago, 1),
                        "market_signal": getattr(doc, "market_signal", "unknown"),
                    }
                )
            
            self.metrics.increment_read()
            return decisions

        except Exception as e:
            print(f"Vector search error for decisions: {e}")
            return self._get_recent_decisions(user_id, limit)

    def _get_recent_decisions(
        self, user_id: str, limit: int = 3
    ) -> List[Dict[str, Any]]:
        """Get recent decisions sorted by creation time (fallback)"""
        try:
            query = (
                Query(f"@user_id:{user_id}")
                .sort_by("created_at", asc=False)
                .paging(0, limit)
            )
            result = self.redis.ft("idx:axiom:decisions").search(query)

            decisions = []
            current_time = datetime.now(timezone.utc).timestamp()

            for doc in result.docs:
                created_at = int(doc.created_at)
                days_ago = (current_time - created_at) / 86400

                decisions.append(
                    {
                        "topic": doc.topic,
                        "verdict": doc.verdict,
                        "reasoning": doc.reasoning[:100] + "..."
                        if len(doc.reasoning) > 100
                        else doc.reasoning,
                        "days_ago": round(days_ago, 1),
                    }
                )

            return decisions
        except Exception as e:
            print(f"Error getting recent decisions: {e}")
            return []

    # ============================================================================
    # UTILITIES
    # ============================================================================

    def _normalize_topic(self, topic: str) -> str:
        """Normalize topic for consistent storage"""
        import re

        # Remove version numbers, special chars, lowercase
        normalized = re.sub(r"[\d\.]+", "", topic.lower())
        normalized = re.sub(r"[^\w\s]", "", normalized)
        return " ".join(normalized.split()).strip()

    def _extract_context_tags(self, user_context: str) -> List[str]:
        """Extract context tags from user context"""
        tags = []
        context_lower = user_context.lower()

        # Role tags
        roles = ["backend", "frontend", "devops", "full-stack", "mobile", "data", "ai"]
        for role in roles:
            if role in context_lower:
                tags.append(role)

        # Seniority
        seniorities = ["junior", "senior", "lead", "architect", "principal"]
        for seniority in seniorities:
            if seniority in context_lower:
                tags.append(seniority)

        return tags if tags else ["general"]

    def _extract_categories(
        self, topic: str, reasoning: str, user_context: str
    ) -> List[str]:
        """Extract categories for decision indexing"""
        categories = []

        # Topic categories
        topic_lower = topic.lower()
        topic_cats = {
            "database": ["sql", "postgres", "mysql", "redis", "mongodb", "database"],
            "frontend": ["react", "vue", "angular", "javascript", "typescript", "css"],
            "backend": ["api", "server", "backend", "fastapi", "django", "flask"],
            "devops": ["docker", "kubernetes", "ci/cd", "terraform", "aws", "cloud"],
            "ai_ml": ["llm", "ai", "machine learning", "tensorflow", "pytorch"],
        }

        for cat, keywords in topic_cats.items():
            if any(keyword in topic_lower for keyword in keywords):
                categories.append(cat)

        # Reasoning categories
        reasoning_lower = reasoning.lower()
        if any(word in reasoning_lower for word in ["performance", "speed", "latency"]):
            categories.append("performance")
        if any(word in reasoning_lower for word in ["cost", "price", "budget"]):
            categories.append("cost")
        if any(word in reasoning_lower for word in ["learn", "education", "tutorial"]):
            categories.append("learning")

        return list(set(categories))
