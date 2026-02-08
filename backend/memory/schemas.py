"""
Memory schemas for Axiom v0.
Preserving inheritance hierarchy with Redis Stack integration.
"""

import numpy as np
from pydantic import BaseModel, Field, ConfigDict
from datetime import UTC, datetime, timezone
from typing import Optional, Literal, Dict, Any, List
from enum import Enum
# import json
# import pickle


class MemoryType(str, Enum):
    """What kind of memory is this?"""

    USER = "user"
    TOPIC = "topic"
    DECISION = "decision"

"""
BaseMemory is acting as the parent class / contract that enforces a consistent way for all memory types (user traits, topic patterns, decisions, etc.) to interact with Redis. By centralizing the rules in one place, you avoid mismatches and guarantee that every subclass follows the same “path” into Redis.
in database we uses it also have function to searialise the datatype form one holding to tother and vice versa (like here np.float32 to bytes and vice-versa)
"""
class BaseMemory(BaseModel):
    """BASE: All memories have these fields
    so when a new decision is logged
    Redis indexes can filter/search by type and confidence, so queries stay consistent."""

    # Core fields
    id: str = Field(default_factory=lambda: f"mem_{datetime.now(timezone.utc).timestamp()}")
    memory_type: MemoryType
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Confidence in this memory"
    )

    # Configuration
    model_config = ConfigDict(
        frozen=False,  # Allow updates for reinforcement
        arbitrary_types_allowed=True,  # For numpy arrays  lets you store np.ndarray directly in the model.
        json_encoders={
            np.ndarray: lambda arr: arr.tolist(),  # Convert numpy arrays to lists for JSON
            datetime: lambda dt: dt.isoformat(),
        },
    )
    """ ensures if you dump the memory to JSON (for logs or APIs), the embedding becomes a list, not raw bytes.
        Why it matters: Without this, serialization would break when saving to Redis or exporting"""

    # Core methods
    def age_in_days(self) -> float:
        """How old is this memory in days?"""
        return (datetime.now(timezone.utc) - self.updated_at).total_seconds() / 86400


    def decayed_confidence(self, decay_rate: float = 0.98) -> float:
        """Apply exponential decay to confidence based on age,
        so  Redis queries can rank fresher signals higher, preventing outdated data from skewing results."""
        age = self.age_in_days()
        decayed = self.confidence * (decay_rate**age)
        return max(0.0, min(decayed, 1.0))

    # Redis integration methods
    def to_redis_dict(self) -> Dict[str, Any]:
        """
        Convert memory to dict suitable for Redis storage.
        Handles numpy arrays and datetime objects.
         Ensures Redis doesn’t choke on Python‑specific types (like datetime or numpy).
        """


        data = self.model_dump(exclude_none=True)
        """Converts a Pydantic model instance into a Python dict.
        class User(BaseModel): 
                id: int 
                name: str 
                nickname: str | None = None 
            user = User(id=1, name="Levi") 
            print(user.model_dump()) 
            # {'id': 1, 'name': 'Levi', 'nickname': None"""
        # Convert embeddings to bytes for Redis
        if hasattr(self, "embedding") and self.embedding is not None:
            if isinstance(self.embedding, np.ndarray):
                data["embedding"] = self.embedding.astype(np.float32).tobytes()

        if (
            hasattr(self, "reasoning_embedding")
            and self.reasoning_embedding is not None
        ):
            if isinstance(self.reasoning_embedding, np.ndarray):
                data["reasoning_embedding"] = self.reasoning_embedding.astype(
                    np.float32
                ).tobytes()

        # Convert datetime to timestamp for Redis
        for field in ["created_at", "updated_at"]:
            if field in data and isinstance(data[field], datetime):
                data[field] = data[field].timestamp()

        return data


    """return cls(**processed)
    Calls the class constructor with the processed dictionary.
    If you call this on BaseMemory, it returns a BaseMemory instance.
    If you call it on a subclass (e.g., DecisionMemory.from_redis_dict(...)), it returns a DecisionMemory instance.
    That’s the key difference from @staticmethod: it respects inheritance."""
    @classmethod
    def from_redis_dict(cls, data: Dict[str, Any]) -> "BaseMemory":
        """
        Create memory from Redis-stored dict.
        Handles byte→array conversion and timestamp→datetime.
        """
        processed = data.copy()

        # Convert bytes back to numpy arrays
        if "embedding" in processed and isinstance(processed["embedding"], bytes):
            processed["embedding"] = np.frombuffer(
                processed["embedding"], dtype=np.float32
            )

        if "reasoning_embedding" in processed and isinstance(
            processed["reasoning_embedding"], bytes
        ):
            processed["reasoning_embedding"] = np.frombuffer(
                processed["reasoning_embedding"], dtype=np.float32
            )

        # Convert timestamps back to datetime
        for field in ["created_at", "updated_at"]:
            if field in processed and isinstance(processed[field], (int, float)):
                processed[field] = datetime.fromtimestamp(processed[field], UTC)

        return cls(**processed)


class UserMemory(BaseMemory):
    """Stable facts about a USER"""

    user_id: str
    fact: str = Field(..., description="Human-readable fact about user")
    source_topic: Optional[str] = Field(
        None, description="Topic that revealed this trait"
    )
    usage_count: int = Field(0, description="How many times this trait was used")

    # Vector field for semantic search
    embedding: Optional[np.ndarray] = Field(
        None, description="384-dim embedding of the fact description"
    )

    @property
    def memory_type(self) -> MemoryType:
        return MemoryType.USER

    def reinforce(self, new_confidence: float = None):
        """Reinforce this trait with new evidence"""
        self.usage_count += 1
        self.updated_at = datetime.now(timezone.utc)

        if new_confidence:
            # Weighted average of old and new confidence
            old_weight = self.usage_count - 1
            new_weight = 1
            total_weight = old_weight + new_weight

            self.confidence = (
                (self.confidence * old_weight) + (new_confidence * new_weight)
            ) / total_weight


class TopicMemory(BaseMemory):
    """Patterns about a TECHNOLOGY"""

    topic: str = Field(..., description="Normalized topic name")
    pattern: str = Field(..., description="Observed pattern about this topic")
    evidence_count: int = Field(1, description="Number of observations supporting this")
    market_signal: Literal["weak", "mixed", "strong"] = Field(
        ..., description="Market adoption signal strength"
    )
    hype_score: int = Field(..., ge=0, le=10, description="Hype level 0-10")

    # Vector field for semantic search
    embedding: Optional[np.ndarray] = Field(
        None, description="384-dim embedding of the pattern description"
    )

    @property
    def memory_type(self) -> MemoryType:
        return MemoryType.TOPIC

    def add_evidence(self, new_confidence: float, new_hype_score: int = None):
        """Add new evidence to this pattern"""
        self.evidence_count += 1
        self.updated_at = datetime.now(timezone.utc)

        # Weighted average for confidence
        old_weight = self.evidence_count - 1
        new_weight = 1
        total_weight = old_weight + new_weight

        self.confidence = (
            (self.confidence * old_weight) + (new_confidence * new_weight)
        ) / total_weight

        if new_hype_score is not None:
            self.hype_score = new_hype_score


class DecisionMemory(BaseMemory):
    """Past DECISIONS Axiom made"""

    user_id: str
    topic: str
    verdict: Literal["pursue", "explore", "watchlist", "ignore"]
    reasoning: str
    ttl_days: int = Field(7, description="Days until this memory expires")

    # Vector field for semantic similarity search
    reasoning_embedding: Optional[np.ndarray] = Field(
        None, description="384-dim embedding of the reasoning text"
    )

    @property
    def memory_type(self) -> MemoryType:
        return MemoryType.DECISION

    def is_expired(self) -> bool:
        """Check if this decision has expired based on TTL"""
        age_days = self.age_in_days()
        return age_days > self.ttl_days


# Helper schemas for policy and context
class MemoryWriteContext(BaseModel):
    """Context for memory write decisions"""

    user_id: str
    topic: str
    verdict: str
    confidence: str  # "low", "medium", "high"
    reasoning: str
    user_context: str
    market_signal: str  # "weak", "mixed", "strong"
    hype_score: int
    risk_factors: List[str]
    signal_status: str  # "ok", "insufficient_signal"
    contract_violation: bool = False


class MemoryContext(BaseModel):
    """Memory context loaded for a query"""

    user_traits: List[Dict[str, Any]] = Field(default_factory=list)
    topic_patterns: List[Dict[str, Any]] = Field(default_factory=list)
    similar_decisions: List[Dict[str, Any]] = Field(default_factory=list)

    def to_prompt_string(self) -> str:
        """Format memory context for LLM prompt injection"""
        if not any([self.user_traits, self.topic_patterns, self.similar_decisions]):
            return "No relevant memories found."

        sections = []

        # User traits section
        if self.user_traits:
            sections.append("[BRAIN] USER PREFERENCES (from past interactions):")
            for trait in self.user_traits[:3]:  # Top 3 only
                desc = trait.get("fact", trait.get("description", ""))
                conf = trait.get("confidence", 0.5)
                sections.append(f"• {desc} (confidence: {conf:.0%})")

        # Topic patterns section
        if self.topic_patterns:
            sections.append("\n📊 TOPIC PATTERNS:")
            for pattern in self.topic_patterns[:2]:  # Top 2 only
                desc = pattern.get("pattern", pattern.get("description", ""))
                sections.append(f"• {desc}")
                if "evidence_count" in pattern:
                    sections.append(
                        f"  Based on {pattern['evidence_count']} observations"
                    )

        # Similar decisions section
        if self.similar_decisions:
            sections.append("\n🕰️ SIMILAR PAST DECISIONS:")
            for decision in self.similar_decisions[:3]:  # Last 3
                verdict = decision.get("verdict", "").upper()
                topic = decision.get("topic", "")

                verdict_emoji = {"PURSUE": "[OK]", "EXPLORE": "[SEARCH]", "WATCHLIST": "[NOTE]", "IGNORE": "[X]"}.get(
                    verdict, "•"
                )

                sections.append(f"{verdict_emoji} {topic} → {verdict}")

                if "days_ago" in decision:
                    sections.append(f"  ({decision['days_ago']:.0f} days ago)")
                if "reasoning" in decision and decision["reasoning"]:
                    sections.append(f"  Reason: {decision['reasoning'][:100]}...")

        return "\n".join(sections)
