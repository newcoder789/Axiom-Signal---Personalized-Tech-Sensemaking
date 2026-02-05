"""
Memory Write Policy Engine for Axiom.
Strict gates controlling what gets stored in memory.
"""

from dataclasses import dataclass
from typing import Tuple, Dict, Any, List
from enum import Enum

from .schemas import MemoryWriteContext


class PolicyResult(str, Enum):
    """Possible outcomes of policy checks"""

    APPROVED = "approved"
    CONTRACT_VIOLATION = "contract_violation"
    INSUFFICIENT_SIGNAL = "insufficient_signal"
    LOW_CONFIDENCE = "low_confidence"
    HIGH_HYPE = "high_hype"
    WEAK_MARKET = "weak_market"
    NO_STABLE_TRAIT = "no_stable_trait"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"


class MemoryPolicyEngine:
    """
    Gatekeeper for memory writes.
    Enforces strict rules about what gets remembered.
    """

    def __init__(self):
        # Configuration thresholds
        self.MIN_CONFIDENCE = 0.6  # "medium" confidence or higher
        self.MAX_HYPE = 8  # Don't store memories about pure hype (>8)
        self.MIN_TRAIT_OCCURRENCES = 2  # User traits need 2+ occurrences

        # Confidence string to float mapping
        self.CONFIDENCE_MAP = {"low": 0.3, "medium": 0.6, "high": 0.9}

    def should_write_user_memory(
        self, ctx: MemoryWriteContext
    ) -> Tuple[bool, PolicyResult]:
        """
        Check if we should write USER memory.
        User memories require stable, repeated patterns.
        """
        # Universal gates
        universal_allowed, universal_reason = self._check_universal_gates(ctx)
        if not universal_allowed:
            return False, universal_reason

        # User memory specific gates

        # 1. Check for stable trait patterns in reasoning
        reasoning_lower = ctx.reasoning.lower()
        user_context_lower = ctx.user_context.lower()

        # Look for trait indicators
        trait_detected = False

        # Performance focus trait
        perf_words = [
            "performance",
            "speed",
            "latency",
            "fast",
            "optimize",
            "throughput",
        ]
        if any(word in reasoning_lower for word in perf_words):
            if any(role in user_context_lower for role in ["backend", "devops", "sre"]):
                trait_detected = True

        # Stability focus trait
        stable_words = [
            "stable",
            "reliable",
            "production",
            "enterprise",
            "mature",
            "battle-tested",
        ]
        if any(word in reasoning_lower for word in stable_words):
            trait_detected = True

        # Learning focus trait
        learn_words = ["learn", "education", "tutorial", "beginner", "fundamental"]
        if any(word in reasoning_lower for word in learn_words):
            if any(
                level in user_context_lower for level in ["junior", "student", "new"]
            ):
                trait_detected = True

        if not trait_detected:
            return False, PolicyResult.NO_STABLE_TRAIT

        # Note: We'll need to check trait occurrence count elsewhere
        # (Requires looking up existing traits from Redis)
        # For now, we'll store first occurrence and reinforce later

        return True, PolicyResult.APPROVED

    def should_write_topic_memory(
        self, ctx: MemoryWriteContext
    ) -> Tuple[bool, PolicyResult]:
        """
        Check if we should write TOPIC memory.
        Topic memories require reliable patterns, not hype.
        """
        # Universal gates
        universal_allowed, universal_reason = self._check_universal_gates(ctx)
        if not universal_allowed:
            return False, universal_reason

        # Topic memory specific gates

        # 1. Don't store weak market signals (unreliable patterns)
        if ctx.market_signal == "weak":
            return False, PolicyResult.WEAK_MARKET

        # 2. Don't store pure hype (hype_score > MAX_HYPE)
        if ctx.hype_score > self.MAX_HYPE:
            return False, PolicyResult.HIGH_HYPE

        # 3. Look for clear patterns in risk factors
        risk_text = " ".join(ctx.risk_factors).lower()

        # Valid patterns to remember
        valid_patterns = [
            "steep learning curve",
            "production adoption",
            "documentation quality",
            "community support",
            "ecosystem maturity",
        ]

        pattern_detected = any(pattern in risk_text for pattern in valid_patterns)

        # Also store strong market signals with low hype
        if ctx.market_signal == "strong" and ctx.hype_score < 5:
            pattern_detected = True

        if not pattern_detected:
            return False, PolicyResult.INSUFFICIENT_EVIDENCE

        return True, PolicyResult.APPROVED

    def should_write_decision_memory(
        self, ctx: MemoryWriteContext
    ) -> Tuple[bool, PolicyResult]:
        """
        Check if we should write DECISION memory.
        Decision memories store all valid verdicts for similarity search.
        """
        # Universal gates
        universal_allowed, universal_reason = self._check_universal_gates(ctx)
        if not universal_allowed:
            return False, universal_reason

        # Decision memory specific rules

        # Special handling for "ignore" verdicts
        if ctx.verdict == "ignore":
            verdict_conf = self.CONFIDENCE_MAP.get(ctx.confidence, 0.3)

            # Only store high-confidence ignore verdicts about vaporware
            if verdict_conf >= 0.85 and ctx.market_signal == "weak":
                return True, PolicyResult.APPROVED
            else:
                # Don't store low-confidence ignores
                return False, PolicyResult.LOW_CONFIDENCE

        # Store all other valid verdicts (pursue, explore)
        return True, PolicyResult.APPROVED

    def _check_universal_gates(
        self, ctx: MemoryWriteContext
    ) -> Tuple[bool, PolicyResult]:
        """
        Check universal gates that apply to ALL memory types.
        """
        # Gate 1: Contract violations
        if ctx.contract_violation:
            return False, PolicyResult.CONTRACT_VIOLATION

        # Gate 2: Insufficient signal
        if ctx.signal_status == "insufficient_signal":
            return False, PolicyResult.INSUFFICIENT_SIGNAL

        # Gate 3: Confidence threshold
        verdict_conf = self.CONFIDENCE_MAP.get(ctx.confidence, 0.3)
        if verdict_conf < self.MIN_CONFIDENCE:
            return False, PolicyResult.LOW_CONFIDENCE

        return True, PolicyResult.APPROVED

    def confidence_to_float(self, confidence_str: str) -> float:
        """Convert confidence string to float"""
        return self.CONFIDENCE_MAP.get(confidence_str, 0.3)
