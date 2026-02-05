"""
Integration hooks for Axiom Memory System.
Easy drop-in integration with your existing pipeline.
"""

from typing import Dict, Any, Optional
# import json

from .manager import AxiomMemoryManager
from .schemas import MemoryContext


# Global memory manager instance (singleton pattern)
_memory_manager_instance = None


def get_memory_manager(redis_url: str = "redis://localhost:6379") -> AxiomMemoryManager:
    """
    Get or create the global memory manager instance.

    Args:
        redis_url: Redis Stack connection URL

    Returns:
        AxiomMemoryManager instance
    """
    global _memory_manager_instance

    if _memory_manager_instance is None:
        _memory_manager_instance = AxiomMemoryManager(redis_url)

    return _memory_manager_instance


def enhance_verdict_prompt(base_prompt: str, memory_context: MemoryContext) -> str:
    """
    Enhance verdict prompt with memory context.

    Args:
        base_prompt: Original verdict prompt
        memory_context: Memory context from manager

    Returns:
        Enhanced prompt with memory hints
    """
    memory_hints = memory_context.to_prompt_string()

    # Only enhance if we have memories
    if memory_hints == "No relevant memories found.":
        return base_prompt

    enhanced_prompt = f"""{base_prompt}

════════════════════════════════════════════════════════════════
MEMORY CONTEXT (READ-ONLY HINTS - DO NOT OVERRIDE EVIDENCE)
════════════════════════════════════════════════════════════════

{memory_hints}

════════════════════════════════════════════════════════════════
MEMORY USAGE RULES:
1. Memory is OLD CONTEXT, not current evidence
2. If memory contradicts current analysis, TRUST CURRENT ANALYSIS
3. Use memory to understand patterns, not to make decisions
4. Memory confidence < 60% should be treated as weak signals
5. Never let memory override contract violations or reality checks

════════════════════════════════════════════════════════════════
"""

    return enhanced_prompt


def integrate_with_axiom_pipeline(
    pipeline_func, memory_manager: Optional[AxiomMemoryManager] = None
):
    """
    Decorator to integrate memory system with existing Axiom pipeline.

    Usage:
        @integrate_with_axiom_pipeline
        def run_axiom_pipeline(topic, user_profile):
            # Your existing pipeline logic
            pass
    """
    if memory_manager is None:
        memory_manager = get_memory_manager()

    def wrapper(topic: str, user_profile: str, *args, **kwargs):
        # 1. READ PHASE: Get memory context BEFORE running pipeline
        memory_context = memory_manager.create_memory_context(
            user_profile=user_profile,
            topic=topic,
            current_query=f"{topic} for {user_profile}",
        )

        # Store context for later injection
        memory_hints = memory_context.to_prompt_string()

        # 2. Run original pipeline (you'll need to inject memory_hints into verdict node)
        # This requires modifying your pipeline to accept memory_hints
        pipeline_result = pipeline_func(topic, user_profile, *args, **kwargs)

        # 3. WRITE PHASE: Store memories AFTER pipeline completes
        if isinstance(pipeline_result, dict):
            memory_write_result = memory_manager.process_verdict(
                user_profile=user_profile,
                topic=topic,
                verdict_data=pipeline_result.get("verdict", {}),
                signal_data=pipeline_result.get("signal", {}),
                reality_check_data=pipeline_result.get("reality_check", {}),
                pipeline_state=pipeline_result,
            )

            # Add memory results to pipeline output
            pipeline_result["memory"] = {
                "context_used": memory_hints,
                "storage_result": memory_write_result,
                "user_id": memory_write_result.get("user_id"),
            }

        return pipeline_result

    return wrapper


# Quick integration function for minimal changes
def quick_integrate(
    topic: str, user_profile: str, pipeline_output: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Quick integration for existing code without decorators.

    Args:
        topic: Analysis topic
        user_profile: User profile
        pipeline_output: Your existing pipeline output

    Returns:
        Enhanced pipeline output with memory
    """
    memory_manager = get_memory_manager()

    # Get memory context (you need to use this in your verdict node)
    memory_context = memory_manager.create_memory_context(
        user_profile=user_profile, topic=topic, current_query=f"Analysis of {topic}"
    )

    # Process verdict for memory storage
    memory_result = memory_manager.process_verdict(
        user_profile=user_profile,
        topic=topic,
        verdict_data=pipeline_output.get("verdict", {}),
        signal_data=pipeline_output.get("signal", {}),
        reality_check_data=pipeline_output.get("reality_check", {}),
        pipeline_state=pipeline_output,
    )

    # Return enhanced result
    enhanced = pipeline_output.copy()
    enhanced["memory"] = {
        "context": memory_context.to_prompt_string(),
        "storage_result": memory_result,
        "user_id": memory_result.get("user_id"),
    }

    return enhanced


if __name__ == "__main__":
    # Example showing how to use the decorator with an existing pipeline
    @integrate_with_axiom_pipeline
    def example_pipeline(topic: str, user_profile: str):
        # Minimal placeholder pipeline output expected by the decorator
        return {
            "verdict": {"verdict": "ignore", "confidence": "low", "reasoning": "placeholder"},
            "signal": {"user_context_summary": user_profile, "status": "sufficient"},
            "reality_check": {"market_signal": "weak", "hype_score": 2, "risk_factors": []},
        }

    res = example_pipeline("Redis caching", "Backend developer, 3 years")
    print("Decorator example — memory attached:", res.get("memory"))
