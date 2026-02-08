"""
Axiom with Power - FULL INTEGRATION TEST
Runs the complete pipeline: Memory → Signal → Reality → Tools → Verdict → Memory Store
With Opik tracing on all nodes

This is the proper test that shows everything in Opik.
"""

import sys
import os

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from typing import Dict, Any
from datetime import datetime, timezone


def print_separator(title: str = "", char: str = "="):
    """Print a separator line"""
    if title:
        padding = (70 - len(title) - 2) // 2
        print(f"\n{char * padding} {title} {char * padding}")
    else:
        print(char * 70)


def test_full_pipeline():
    """
    Test the FULL Axiom pipeline with memory + tools.
    This will show up in Opik with all nodes traced.
    """
    print_separator("FULL PIPELINE TEST (Memory + Tools)")
    
    # Import the full graph
    from graph.graph_utils import app, run_axiom_query, OpikTracer
    
    test_cases = [
        # (topic, profile, description)
        ("FastAPI for building REST APIs", "Backend Python developer", "Should PURSUE (low friction + strong market)"),
        ("PostgreSQL 17 features", "Database administrator", "Should WATCHLIST (freshness outdated)"),
        ("Rust for CLI tools", "Frontend developer", "Should go to LLM (mixed signals)"),
    ]
    
    results = []
    
    for topic, profile, expected in test_cases:
        print_separator(f"Testing: {topic[:40]}", "-")
        print(f"Profile: {profile}")
        print(f"Expected: {expected}")
        print()
        
        try:
            # Run the full query (this includes memory + tools + verdict)
            result = run_axiom_query(topic, profile)
            
            # Extract results
            verdict = result.verdict if hasattr(result, 'verdict') else result.get('verdict')
            tool_evidence = result.tool_evidence if hasattr(result, 'tool_evidence') else result.get('tool_evidence')
            memory_context = result.memory_context if hasattr(result, 'memory_context') else result.get('memory_context')
            
            print("[RESULT]")
            
            # Verdict info
            if verdict:
                v_text = verdict.verdict if hasattr(verdict, 'verdict') else verdict.get('verdict', 'N/A')
                v_conf = verdict.confidence if hasattr(verdict, 'confidence') else verdict.get('confidence', 'N/A')
                print(f"  Verdict: {v_text.upper() if v_text else 'N/A'}")
                print(f"  Confidence: {v_conf}")
            
            # Tool evidence
            if tool_evidence:
                print(f"\n  [TOOL EVIDENCE]")
                
                freshness = tool_evidence.get("freshness", {})
                market = tool_evidence.get("market", {})
                friction = tool_evidence.get("friction", {})
                
                print(f"    Freshness outdated: {freshness.get('is_model_likely_outdated', 'N/A')}")
                print(f"    Market adoption: {market.get('adoption', 'N/A')}")
                print(f"    Friction: {friction.get('overall_friction', 'N/A')}")
                print(f"    Watchlist triggered: {tool_evidence.get('watchlist_triggered', False)}")
            
            # Memory context
            if memory_context:
                print(f"\n  [MEMORY CONTEXT]")
                if hasattr(memory_context, 'user_traits'):
                    print(f"    User traits: {len(memory_context.user_traits or [])}")
                if hasattr(memory_context, 'topic_patterns'):
                    print(f"    Topic patterns: {len(memory_context.topic_patterns or [])}")
                if hasattr(memory_context, 'similar_decisions'):
                    print(f"    Similar decisions: {len(memory_context.similar_decisions or [])}")
            
            results.append((topic, expected, "PASS", v_text if verdict else "N/A"))
            print(f"\n  [OK] Test completed")
            
        except Exception as e:
            print(f"\n  [ERROR] {e}")
            import traceback
            traceback.print_exc()
            results.append((topic, expected, "FAIL", str(e)[:50]))
    
    # Summary
    print_separator("TEST SUMMARY")
    
    passed = sum(1 for r in results if r[2] == "PASS")
    total = len(results)
    
    print(f"\nResults: {passed}/{total} completed")
    print()
    
    for topic, expected, status, verdict in results:
        status_icon = "[OK]" if status == "PASS" else "[!!]"
        print(f"  {status_icon} {topic[:40]}")
        print(f"      Expected: {expected[:40]}")
        print(f"      Got: {verdict}")
    
    print_separator()
    
    return passed == total


def test_tools_only():
    """Quick test of just the tool system (for comparison)"""
    print_separator("TOOLS ONLY TEST")
    
    from tools.orchestrator import ToolOrchestrator
    
    orchestrator = ToolOrchestrator()
    
    topic = "FastAPI"
    print(f"\nTesting: {topic}")
    
    evidence = orchestrator.execute_tools(topic, {"user_profile": "Backend dev"})
    
    print(f"\n[RESULT]")
    print(f"  Watchlist: {evidence.get('watchlist_triggered')}")
    print(f"  Market: {evidence.get('market', {}).get('adoption')}")
    print(f"  Friction: {evidence.get('friction', {}).get('overall_friction')}")
    
    print_separator()


def show_opik_info():
    """Show how to view traces in Opik"""
    print_separator("OPIK TRACING")
    
    print("""
To view traces in Opik:

1. Go to: https://app.opik.com/
2. Select project: axiom-v0
3. Look for traces named:
   - axiom_query (full pipeline)
   - memory_context_node
   - signal_framing_node
   - reality_check_node
   - tool_evidence_node
   - verdict_node
   - memory_store_node
   
4. Each trace shows:
   - Input/output for each node
   - Execution time
   - LLM calls made
    """)
    
    print_separator()


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("AXIOM WITH POWER - FULL INTEGRATION TEST")
    print("Memory + Tools + Verdict with Opik Tracing")
    print("=" * 70)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Show Opik info
    show_opik_info()
    
    # Test tools only first (quick sanity check)
    test_tools_only()
    
    # Run full pipeline test
    test_full_pipeline()
    
    print("\n" + "=" * 70)
    print("[COMPLETE] Check Opik at https://app.opik.com/ for traces")
    print("Project: axiom-v0")
    print("=" * 70 + "\n")
