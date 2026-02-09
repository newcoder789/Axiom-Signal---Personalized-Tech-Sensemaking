from graph.graph_utils import reality_check_node, AxiomState, SignalFramingOutput
import json
import os
from dotenv import load_dotenv

load_dotenv()

def test_ledger_generation():
    state = AxiomState(
        topic="AutoGPT",
        user_profile="Senior Backend Engineer, 10 years experience, Python expert",
        signal=SignalFramingOutput(
            status="ok",
            signal_summary="Growing interest in autonomous agents in production",
            domain="AI/ML",
            time_horizon="short",
            confidence_level="medium",
            user_context_summary="Senior Python Backend Engineer"
        )
    )
    
    print("Running reality_check_node...")
    new_state = reality_check_node(state)
    
    print("\n--- RESULTS ---")
    print(f"Hype Score: {new_state.reality_check.hype_score}")
    print(f"Feasibility: {new_state.reality_check.feasibility}")
    print(f"Market Signal: {new_state.reality_check.market_signal}")
    
    print("\n--- DECISION LEDGER ---")
    print(json.dumps(new_state.ledger, indent=2))
    
    # Check if we hit fallbacks
    if new_state.ledger.get("context_evidence") == ["Manual evaluation triggered"]:
        print("\n⚠️  WARNING: Hit fallback ledger!")
    else:
        print("\n✅ SUCCESS: LLM generated custom ledger data")

if __name__ == "__main__":
    test_ledger_generation()
