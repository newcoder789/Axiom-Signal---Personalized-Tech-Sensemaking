"""
Axiom with Power - Full Integration Test
Tests Tool System + Verdict Rules with detailed logging
Logs are saved to: backend/tools/logs/
"""

import sys
import os

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from typing import Dict, Any
from datetime import datetime, timezone


def simulate_verdict_rules(tool_evidence: Dict[str, Any]) -> str:
    """
    Simulate the verdict rules from verdict_node.
    Returns: 'watchlist', 'ignore', 'pursue', or 'llm'
    """
    freshness = tool_evidence.get("freshness", {})
    market = tool_evidence.get("market", {})
    friction = tool_evidence.get("friction", {})
    
    # RULE 1: Freshness outdated -> Watchlist (absolute)
    if freshness.get("is_model_likely_outdated", False):
        return "watchlist"
    
    # RULE 2: High friction + weak market -> Ignore (absolute)
    overall_friction = friction.get("overall_friction", 0.5)
    market_adoption = market.get("adoption", "medium")
    
    if overall_friction >= 0.75 and market_adoption == "low":
        return "ignore"
    
    # RULE 3: Low friction + strong market -> Pursue (force)
    hiring = market.get("hiring_signal", "moderate")
    if overall_friction < 0.4 and market_adoption == "high" and hiring in ("strong", "moderate"):
        return "pursue"
    
    # RULE 4: Mixed -> LLM decides
    return "llm"


def print_separator(title: str = "", char: str = "="):
    """Print a separator line"""
    if title:
        padding = (60 - len(title) - 2) // 2
        print(f"\n{char * padding} {title} {char * padding}")
    else:
        print(char * 60)


def test_single_topic():
    """Test a single topic with detailed output"""
    print_separator("SINGLE TOPIC TEST")
    
    from tools.orchestrator import ToolOrchestrator
    
    # Create orchestrator (this creates a session-specific log file)
    orchestrator = ToolOrchestrator()
    
    # Test a topic
    topic = "FastAPI for building REST APIs"
    profile = "Backend Python developer with 3 years experience"
    
    print(f"\nTesting: {topic}")
    print(f"Profile: {profile}")
    
    # Execute tools (all output is logged)
    evidence = orchestrator.execute_tools(topic, {"user_profile": profile})
    
    # Get the simulated verdict
    verdict = simulate_verdict_rules(evidence)
    
    print_separator("FINAL VERDICT")
    print(f"Verdict: {verdict.upper()}")
    print(f"Watchlist Triggered: {evidence.get('watchlist_triggered')}")
    print(f"Combined Confidence: {evidence.get('combined_confidence')}")
    print_separator()


def test_all_rules():
    """Test all verdict rules with different technologies"""
    print_separator("ALL RULES TEST")
    
    from tools.orchestrator import ToolOrchestrator
    
    # Create a single orchestrator for all tests
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S_batch")
    orchestrator = ToolOrchestrator(session_id=session_id)
    
    test_cases = [
        # (topic, profile, expected_rule, expected_verdict)
        ("PostgreSQL 17", "DBA", "RULE 1", "watchlist"),
        ("Python 3.13", "Backend dev", "RULE 1", "watchlist"),
        ("Zig programming", "Web developer", "RULE 2", "ignore"),
        ("FastAPI", "Backend developer", "RULE 3", "pursue"),
        ("React", "Frontend developer", "RULE 3", "pursue"),
        ("Rust for CLI", "Frontend developer", "RULE 4", "llm"),
        ("Svelte", "Full stack dev", "RULE 4", "llm"),
    ]
    
    results = []
    
    for topic, profile, expected_rule, expected_verdict in test_cases:
        print_separator(topic, "-")
        
        evidence = orchestrator.execute_tools(topic, {"user_profile": profile})
        actual_verdict = simulate_verdict_rules(evidence)
        
        match = actual_verdict == expected_verdict
        results.append((topic, expected_rule, expected_verdict, actual_verdict, match))
        
        status = "[PASS]" if match else "[FAIL]"
        print(f"\n{status} {topic}")
        print(f"  Expected: {expected_rule} -> {expected_verdict}")
        print(f"  Got: {actual_verdict}")
    
    # Summary
    print_separator("TEST SUMMARY")
    passed = sum(1 for r in results if r[4])
    total = len(results)
    
    print(f"\nResults: {passed}/{total} passed\n")
    
    for topic, rule, expected, actual, match in results:
        status = "[OK]" if match else "[!!]"
        print(f"  {status} {topic}: {rule} -> {actual}")
    
    if passed == total:
        print(f"\n[SUCCESS] All tests passed!")
    else:
        print(f"\n[FAILURES]")
        for topic, rule, expected, actual, match in results:
            if not match:
                print(f"  - {topic}: expected {expected}, got {actual}")
    
    print(f"\nLog file: tools/logs/tools_{session_id}.log")
    print_separator()
    
    return passed == total


def show_log_location():
    """Show where logs are stored"""
    from pathlib import Path
    log_dir = Path(__file__).parent / "tools" / "logs"
    
    print_separator("LOG FILES")
    
    if log_dir.exists():
        logs = list(log_dir.glob("*.log"))
        print(f"\nLog directory: {log_dir}")
        print(f"Log files: {len(logs)}")
        
        if logs:
            print("\nRecent logs:")
            for log in sorted(logs, key=lambda x: x.stat().st_mtime, reverse=True)[:5]:
                size_kb = log.stat().st_size / 1024
                print(f"  - {log.name} ({size_kb:.1f} KB)")
    else:
        print(f"\nLog directory will be created at: {log_dir}")
    
    print_separator()


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("AXIOM WITH POWER - INTEGRATION TESTS")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run tests
    test_single_topic()
    test_all_rules()
    show_log_location()
    
    print("\n" + "=" * 60)
    print("[COMPLETE] All tests finished")
    print("Check tools/logs/ for detailed execution logs")
    print("=" * 60 + "\n")
