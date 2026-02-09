"""
Axiom with Power - Full Integration
Combines: Memory System + Tool System (Week 1 + Week 2)

Uses the integrated graph from graph_utils.py which has:
- Memory nodes (memory_context, memory_store)
- Tool node (tool_evidence)
- All verdict rules (freshness, friction+market)
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
from opik import track
from langsmith.run_trees import RunTree

# 🩹 PATCH: Resolve Pydantic V2 compatibility issue with Opik/LangSmith
try:
    RunTree.model_rebuild()
except Exception:
    pass

from graph.graph_utils import (
    AxiomState,
    app as compiled_graph,
    derive_user_id,
    OpikTracer,
)
from memory.integration import get_memory_manager
from memory.schemas import MemoryContext


class AxiomWithPower:
    """
    Full Axiom integration with Memory + Tools.
    
    Features:
    - Memory context from Redis (LTM + STM)
    - Tool evidence (freshness, market, friction)
    - Deterministic verdict rules (Week 2)
    - LLM fallback for mixed signals
    """
    
    def __init__(self, redis_url: str = "redis://localhost:6379", debug: bool = False):
        self.debug = debug
        self.redis_url = redis_url
        
        try:
            self.memory_manager = get_memory_manager(redis_url)
            print("[POWER] Memory system connected")
        except Exception as e:
            print(f"[POWER] Memory unavailable: {e}")
            self.memory_manager = None
    
    def run(self, topic: str, user_profile: str) -> Dict[str, Any]:
        """
        Run full Axiom pipeline with memory + tools.
        
        Args:
            topic: Technology/topic to analyze
            user_profile: User context description
            
        Returns:
            Complete pipeline result with memory, tools, and verdict
        """
        return self._run_tracked(topic, user_profile)
    
    @track(name="axiom_power_run", project_name="axiom-v0")
    def _run_tracked(self, topic: str, user_profile: str) -> Dict[str, Any]:
        """Internal tracked run"""
        
        print(f"\n{'='*60}")
        print(f"[POWER] Starting Axiom with Power")
        print(f"[POWER] Topic: {topic}")
        print(f"[POWER] User: {user_profile[:50]}...")
        print(f"{'='*60}")
        
        start_time = datetime.now(timezone.utc)
        
        # Build initial state
        initial_state = {
            "topic": topic,
            "user_profile": user_profile,
        }
        
        # Run the integrated graph (memory + tools + verdict)
        opik_tracer = OpikTracer(tags=["axiom-v0", "power", "week2"])
        
        try:
            result_dict = compiled_graph.invoke(
                initial_state,
                config={"callbacks": [opik_tracer]},
            )
            
            # Extract key info
            verdict = result_dict.get("verdict")
            tool_evidence = result_dict.get("tool_evidence", {})
            
            # Log summary
            self._log_summary(result_dict, start_time)
            
            return result_dict
            
        except Exception as e:
            print(f"[POWER] Error: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    def _log_summary(self, result: Dict[str, Any], start_time: datetime):
        """Log execution summary"""
        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
        
        verdict = result.get("verdict")
        tool_evidence = result.get("tool_evidence", {})
        
        print(f"\n{'='*60}")
        print("[POWER] Execution Summary")
        print(f"{'='*60}")
        
        # Verdict
        if verdict:
            print(f"[VERDICT] {verdict.verdict.upper()}")
            print(f"[CONFIDENCE] {verdict.confidence}")
            print(f"[REASONING] {verdict.reasoning[:100]}...")
        
        # Tool evidence
        if tool_evidence:
            freshness = tool_evidence.get("freshness", {})
            market = tool_evidence.get("market", {})
            friction = tool_evidence.get("friction", {})
            
            print(f"\n[TOOLS]")
            print(f"  Freshness: outdated={freshness.get('is_model_likely_outdated', False)}")
            print(f"  Market: adoption={market.get('adoption')}, hiring={market.get('hiring_signal')}")
            print(f"  Friction: {friction.get('overall_friction', 'N/A')}")
            print(f"  Watchlist triggered: {tool_evidence.get('watchlist_triggered', False)}")
        
        # Memory
        memory_context = result.get("memory_context")
        if memory_context:
            print(f"\n[MEMORY] Context loaded")
        
        print(f"\n[TIME] {elapsed:.2f}s")
        print(f"{'='*60}\n")
    
    def health_check(self) -> Dict[str, Any]:
        """Check all systems"""
        from tools.orchestrator import ToolOrchestrator
        
        health = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "memory": {"status": "unknown"},
            "tools": {"status": "unknown"},
            "graph": {"status": "healthy"},
        }
        
        # Memory health
        if self.memory_manager:
            try:
                self.memory_manager.health_check()
                health["memory"]["status"] = "healthy"
            except Exception as e:
                health["memory"]["status"] = "error"
                health["memory"]["error"] = str(e)
        else:
            health["memory"]["status"] = "unavailable"
        
        # Tool health
        try:
            orchestrator = ToolOrchestrator()
            tool_health = orchestrator.health_check()
            health["tools"] = tool_health
        except Exception as e:
            health["tools"]["status"] = "error"
            health["tools"]["error"] = str(e)
        
        return health


def run_axiom_power(topic: str, user_profile: str, debug: bool = False) -> Dict[str, Any]:
    """
    One-liner to run Axiom with full power.
    
    Example:
        result = run_axiom_power(
            topic="Redis 7.4 for caching",
            user_profile="Backend developer",
            debug=True
        )
    """
    axiom = AxiomWithPower(debug=debug)
    return axiom.run(topic, user_profile)


def test_power_integration():
    """Test the full integration"""
    print("\n" + "=" * 60)
    print("AXIOM WITH POWER - INTEGRATION TEST")
    print("=" * 60)
    
    test_cases = [
        # Should trigger Rule 1 (freshness -> watchlist)
        ("PostgreSQL 17", "Backend developer"),
        
        # Should trigger Rule 3 (low friction + strong market -> pursue)
        ("FastAPI", "Backend developer"),
        
        # Should go to LLM (mixed signals)
        ("Rust for CLI tools", "Frontend developer"),
        
        # Should trigger Rule 2 (high friction + weak market -> ignore)
        ("Zig programming", "Web developer"),
    ]
    
    axiom = AxiomWithPower(debug=True)
    
    for topic, profile in test_cases:
        print(f"\n{'='*60}")
        print(f"TEST: {topic}")
        print(f"{'='*60}")
        
        try:
            result = axiom.run(topic, profile)
            
            verdict = result.get("verdict")
            if verdict:
                print(f"\n[RESULT] Verdict: {verdict.verdict}")
            else:
                print(f"\n[RESULT] No verdict returned")
                
        except Exception as e:
            print(f"\n[ERROR] {e}")
    
    print("\n" + "=" * 60)
    print("[DONE] Integration tests complete")
    print("=" * 60)


if __name__ == "__main__":
    test_power_integration()
