"""
Axiom v0 with Memory System Integration
Wraps your existing graph with memory capabilities.
"""

# import hashlib
from typing import Dict, Any, Optional 
from datetime import datetime, timezone
from opik import track
from langsmith.run_trees import RunTree

# 🩹 PATCH: Resolve Pydantic V2 compatibility issue with Opik/LangSmith
try:
    RunTree.model_rebuild()
except Exception:
    pass

# Import your existing graph
from graph.graph_utils import  AxiomState, derive_user_id  # , run_axiom_query

# Import memory system
from memory.integration import get_memory_manager, enhance_verdict_prompt
from memory.schemas import MemoryContext


class AxiomWithMemory:
    """
    Main class that integrates memory system with existing Axiom graph.
    """

    def __init__(self, redis_url: str = "redis://localhost:6379", debug: bool = False):
        self.debug = debug

        # Initialize memory manager
        self.memory_manager = get_memory_manager(redis_url)

        # Health check
        health = self.memory_manager.health_check()
        if debug:
            print(f"[MEMORY] Memory system initialized: {health['status']}")
            print(f"   Embeddings: {health['embeddings_available']}")
            print(f"   Redis: {health['redis_connected']}")

    def run_with_memory(self, topic: str, user_profile: str) -> Dict[str, Any]:
        """
        Run Axiom pipeline with memory enhancement.

        Args:
            topic: Technology/topic to analyze
            user_profile: User context description

        Returns:
            Enhanced pipeline result with memory context
        """
        return self._run_with_memory_tracked(topic, user_profile)

    @track(name="axiom_with_memory", project_name="axiom-v0")
    def _run_with_memory_tracked(self, topic: str, user_profile: str) -> Dict[str, Any]:
        """
        Internal implementation with Opik tracking.
        Wraps logic so @track decorator can capture project_name="axiom-v0"
        """
        memory_context = None
        memory_hints = "No memory context available."

        # PHASE 1: READ MEMORY (before running graph)
        memory_context, memory_hints = self._read_memory_phase(topic, user_profile)

        # PHASE 2: RUN GRAPH WITH ENHANCED VERDICT
        result_dict = self._run_graph_phase(topic, user_profile, memory_context)

        result = AxiomState(**result_dict)

        # PHASE 3: STORE MEMORIES (after graph completes)
        storage_result = self._store_memory_phase(topic, user_profile, result, memory_hints)

        # Add memory info to result
        result_dict["memory"] = {
            "context_used": memory_hints,
            "storage_result": storage_result,
            "user_id": derive_user_id(user_profile),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        return result_dict

    @track(name="read_memory", project_name="axiom-v0")
    def _read_memory_phase(self, topic: str, user_profile: str) -> tuple:
        """PHASE 1: Read memory context from Redis"""
        memory_context = None
        memory_hints = "No memory context available."

        try:
            memory_context = self.memory_manager.create_memory_context(
                user_profile=user_profile,
                topic=topic,
                current_query=f"Analysis of {topic} for {user_profile}",
            )
            memory_hints = memory_context.to_prompt_string()

            if self.debug:
                print(f"[REDS] Memory context loaded ({len(memory_hints)} chars)")
                if memory_hints != "No relevant memories found.":
                    print("   Contains memory hints")

        except Exception as e:
            print(f"[WARN] Failed to load memory context: {e}")
            memory_hints = "Memory system error. Proceeding without context."

        return memory_context, memory_hints

    @track(name="run_verdict_graph", project_name="axiom-v0")
    def _run_graph_phase(self, topic: str, user_profile: str, memory_context: Optional[MemoryContext]) -> Dict[str, Any]:
        """PHASE 2: Run graph with enhanced verdict node"""
        from langchain_core.prompts import ChatPromptTemplate
        from graph.graph_utils import (
            BASE_VERDICT_PROMPT,
            llm,
            JsonOutputParser,
            VerdictOutput,
            evidence_strength_from_market,
            check_contract,
            calculate_alignment,
            OpikTracer,
            signal_framing_node,
            reality_check_node,
            resolve_decision_trajectory,
            validate_and_fix_verdict_result,
        )
        from langgraph.graph import StateGraph, END

        # Create enhanced verdict prompt
        enhanced_prompt_content = enhance_verdict_prompt(
            BASE_VERDICT_PROMPT.messages[0].prompt.template,
            memory_context if memory_context else MemoryContext(),
        )

        # Create enhanced prompt template
        VERDICT_WITH_MEMORY_PROMPT = ChatPromptTemplate.from_messages(
            [
                ("system", enhanced_prompt_content),
                ("human", "Signal: {signal}\nReality Check: {reality_check}"),
            ]
        )

        # Create memory-enhanced verdict function
        def verdict_node_with_memory(state: AxiomState) -> AxiomState:
            """Enhanced verdict node with memory hints (Scout: knowledge_gap → watchlist)."""

            hype = state.reality_check.hype_score
            market = state.reality_check.market_signal
            evidence_strength = evidence_strength_from_market(market, hype)

            # Knowledge gap: model prior weak but market strong/mixed → do not downgrade to ignore
            state.knowledge_gap = (
                state.signal.status == "insufficient_signal"
                and state.reality_check.market_signal in ("strong", "mixed")
            )

            if state.signal.status == "insufficient_signal":
                if state.knowledge_gap:
                    state.verdict = VerdictOutput(
                        verdict="watchlist",
                        reasoning="Model knowledge is lagging but market evidence suggests established or emerging. Re-evaluate with fresher sources.",
                        action_items=[
                            "Re-evaluate when external evidence is available",
                            "Do not ignore based on model prior alone",
                        ],
                        timeline="re-evaluate in 3 months",
                        confidence="low",
                    )
                    return state
                state.verdict = VerdictOutput(
                    verdict="ignore",
                    reasoning="The topic lacks sufficient public clarity or substance to justify investment of time.",
                    action_items=[
                        "Do not allocate learning time unless clearer signal emerges",
                        "Focus on established technologies with proven value",
                    ],
                    timeline="wait 6+ months",
                    confidence="low",
                )
                return state

            check_contract(
                condition=state.signal.confidence_level == "high"
                and evidence_strength < 0.5,
                reason="High confidence signal contradicts weak evidence strength",
                state=state,
            )

            if state.contract_violation:
                violation_items = [f"- {v}" for v in state.violations]
                if len(violation_items) < 2:
                    violation_items.append("- Re-evaluate when evidence is clearer")
                if state.knowledge_gap:
                    state.verdict = VerdictOutput(
                        verdict="watchlist",
                        reasoning="Contract violations (model vs evidence). Market suggests established tech; treat as knowledge gap.",
                        action_items=violation_items,
                        timeline="re-evaluate in 3 months",
                        confidence="low",
                    )
                    return state
                state.verdict = VerdictOutput(
                    verdict="ignore",
                    reasoning="Contract violations detected during evaluation",
                    action_items=violation_items,
                    timeline="wait 6+ months",
                    confidence="low",
                )
                return state

            # DECISION TRAJECTORY RESOLVER: Check if we should upgrade "explore" → "pursue"
            # This happens BEFORE LLM call to prevent decision inertia
            memory_context_obj = None
            if state.memory_context:
                try:
                    memory_context_obj = MemoryContext(**state.memory_context)
                except Exception:
                    memory_context_obj = MemoryContext()
            
            forced_verdict = resolve_decision_trajectory(state, memory_context_obj)
            
            if forced_verdict == "pursue":
                # Force pursue verdict with trajectory-aware reasoning
                state.verdict = VerdictOutput(
                    verdict="pursue",
                    reasoning=f"Previous exploration of similar topics combined with current market signal ({market}) and feasibility ({state.reality_check.feasibility}) indicates this is worth pursuing now. Conditions have strengthened since initial exploration.",
                    action_items=[
                        "Begin hands-on implementation or deeper learning",
                        "Allocate dedicated time for skill development",
                        "Build a practical project to validate understanding",
                    ],
                    timeline="now",
                    confidence="high",
                )
                return state

            # Create verdict WITH memory-enhanced prompt
            parser = JsonOutputParser(pydantic_object=VerdictOutput)
            chain = VERDICT_WITH_MEMORY_PROMPT | llm | parser

            result = chain.invoke(
                {
                    "signal": state.signal.model_dump(),
                    "reality_check": state.reality_check.model_dump(),
                    "format_instructions": parser.get_format_instructions(),
                }
            )
            
            # Validate and fix result to ensure action_items meets schema requirements
            result = validate_and_fix_verdict_result(result, result.get("verdict"))

            state.verdict = VerdictOutput(**result)

            # Calculate alignments (your existing logic)
            state.evidence_verdict_alignment = calculate_alignment(
                state.verdict.confidence, evidence_strength
            )

            # Calculate overall chain coherence
            if state.signal_evidence_alignment is not None:
                state.chain_coherence_score = round(
                    (state.signal_evidence_alignment + state.evidence_verdict_alignment)
                    / 2.0,
                    3,
                )

            return state

        # Create new workflow with enhanced verdict node
        workflow = StateGraph(AxiomState)
        workflow.add_node("signal_framing", signal_framing_node)
        workflow.add_node("reality_check", reality_check_node)
        workflow.add_node("verdict", verdict_node_with_memory)

        workflow.add_edge("signal_framing", "reality_check")
        workflow.add_edge("reality_check", "verdict")
        workflow.add_edge("verdict", END)
        workflow.set_entry_point("signal_framing")

        app = workflow.compile()

        # Run the graph (with Opik tracing if needed)
        opik_tracer = OpikTracer(tags=["axiom-v0", "day-6-memory"])

        result_dict = app.invoke(
            {"topic": topic, "user_profile": user_profile},
            config={"callbacks": [opik_tracer]},
        )

        return result_dict

    @track(name="store_memory", project_name="axiom-v0")
    def _store_memory_phase(self, topic: str, user_profile: str, result: AxiomState, memory_hints: str) -> Dict[str, Any]:
        """PHASE 3: Store memories from verdict"""
        try:
            storage_result = self.memory_manager.process_verdict(
                user_profile=user_profile,
                topic=topic,
                verdict_data=result.verdict.model_dump() if result.verdict else {},
                signal_data=result.signal.model_dump() if result.signal else {},
                reality_check_data=result.reality_check.model_dump()
                if result.reality_check
                else {},
                pipeline_state=result.model_dump(),
            )

            if self.debug and storage_result.get("memory_stored"):
                print(f"[*] Memories stored for {topic}")

            return storage_result

        except Exception as e:
            print(f"[WARN] Failed to store memories: {e}")
            return {"error": str(e)}

    def get_user_insights(self, user_profile: str) -> Dict[str, Any]:
        """Get user insights from memory system"""
        return self.memory_manager.get_user_profile_summary(user_profile)

    def clear_memories(self, user_profile: str = None) -> Dict[str, Any]:
        """Clear memories for a user or all users"""
        deleted = self.memory_manager.clear_user_memories(user_profile)
        return {"deleted": deleted, "scope": "user" if user_profile else "all"}

    def health_check(self) -> Dict[str, Any]:
        """Check memory system health"""
        return self.memory_manager.health_check()


# Convenience function for easy integration
def run_axiom_with_memory(
    topic: str, user_profile: str, debug: bool = False
) -> Dict[str, Any]:
    """
    One-liner to run Axiom with memory system.

    Example:
        result = run_axiom_with_memory(
            topic="Redis for caching",
            user_profile="Backend developer",
            debug=True
        )
    """
    axiom = AxiomWithMemory(debug=debug)
    return axiom.run_with_memory(topic, user_profile)


# Quick test function
def test_integration():
    """Test the integration"""
    print("[TEST] Testing Axiom Graph + Memory Integration")
    print("=" * 50)

    # Test 1: Run with memory
    print("\n1. Running Axiom with memory system...")
    result = run_axiom_with_memory(
        topic="Redis 7 for caching",
        user_profile="Backend developer, optimizing API performance",
        debug=True,
    )

    print("\n📊 Results:")
    print(f"  Verdict: {result.get('verdict', {}).get('verdict', 'unknown')}")
    print(f"  Confidence: {result.get('verdict', {}).get('confidence', 'unknown')}")

    if "memory" in result:
        print("\n🧠 Memory Info:")
        memory_data = result["memory"]
        if "storage_result" in memory_data:
            storage = memory_data["storage_result"]
            print(f"  Memories stored: {storage.get('memory_stored', False)}")

    # Test 2: Health check
    print("\n2. System health:")
    axiom = AxiomWithMemory()
    health = axiom.health_check()
    print(f"  Status: {health.get('status')}")

    print("\n[OK] Integration test complete!")
    return result


if __name__ == "__main__":
    test_integration()
