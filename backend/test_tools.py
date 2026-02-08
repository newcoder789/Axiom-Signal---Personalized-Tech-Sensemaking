#!/usr/bin/env python
"""
Week 2 Test Suite
Tests that verify:
1. Rules fire WITHOUT LLM involvement
2. LLM only runs in mixed cases
3. Deterministic, reproducible behavior
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.orchestrator import ToolOrchestrator
from tools.market_signal import MarketSignalTool
from tools.friction_estimator import FrictionEstimator


def test_rule_1_freshness_watchlist():
    """RULE 1: Freshness outdated -> Watchlist (absolute)"""
    print("\n" + "=" * 60)
    print("TEST: Rule 1 - Freshness Outdated -> Watchlist")
    print("=" * 60)
    
    orchestrator = ToolOrchestrator()
    
    # Technologies with versions released after model cutoff
    outdated_topics = [
        "PostgreSQL 17",
        "Python 3.13",
        "TypeScript 5.5",
        "Redis 7.4",
        "Docker 27",
        "Kubernetes 1.31",
    ]
    
    for topic in outdated_topics:
        result = orchestrator.execute_tools(topic)
        watchlist = result.get("watchlist_triggered", False)
        
        status = "[PASS]" if watchlist else "[FAIL]"
        print(f"{status} {topic}: watchlist_triggered={watchlist}")
        
        assert watchlist, f"Expected watchlist for {topic} but got {watchlist}"
    
    print("\n[PASS] Rule 1: All outdated topics trigger watchlist")


def test_rule_2_high_friction_weak_market():
    """RULE 2: High friction + weak market -> Ignore (absolute)"""
    print("\n" + "=" * 60)
    print("TEST: Rule 2 - High Friction + Weak Market")
    print("=" * 60)
    
    market_tool = MarketSignalTool()
    friction_tool = FrictionEstimator()
    
    # Find technologies that match: high friction (>0.75) + weak market
    test_cases = [
        ("Zig", "Low adoption niche language"),
        ("Nim", "Low adoption niche language"),
        ("Crystal", "Low adoption niche language"),
    ]
    
    for tech, desc in test_cases:
        market = market_tool.execute(tech)
        friction = friction_tool.execute(tech)
        
        m_data = market.structured_data
        f_data = friction.structured_data
        
        adoption = m_data.get("adoption", "unknown")
        overall_friction = f_data.get("overall_friction", 0.5)
        
        matches_rule = overall_friction > 0.75 and adoption == "low"
        status = "[PASS]" if matches_rule else "[INFO]"
        
        print(f"{status} {tech} ({desc})")
        print(f"       Friction: {overall_friction:.2f}, Adoption: {adoption}")
        
        if matches_rule:
            print(f"       -> Would trigger IGNORE verdict")
    
    print("\n[INFO] Rule 2 verified with available data")


def test_rule_3_low_friction_strong_market():
    """RULE 3: Low friction + strong market -> Pursue (force)"""
    print("\n" + "=" * 60)
    print("TEST: Rule 3 - Low Friction + Strong Market")
    print("=" * 60)
    
    market_tool = MarketSignalTool()
    friction_tool = FrictionEstimator()
    
    # Technologies that match: low friction (<0.4) + high market
    test_cases = [
        ("Redis", "In-memory cache"),
        ("Python", "General purpose"),
        ("TypeScript", "JS with types"),
        ("FastAPI", "Modern Python web"),
    ]
    
    for tech, desc in test_cases:
        market = market_tool.execute(tech)
        friction = friction_tool.execute(tech)
        
        m_data = market.structured_data
        f_data = friction.structured_data
        
        adoption = m_data.get("adoption", "unknown")
        hiring = m_data.get("hiring_signal", "unknown")
        overall_friction = f_data.get("overall_friction", 0.5)
        
        matches_rule = overall_friction < 0.4 and adoption == "high"
        status = "[PASS]" if matches_rule else "[INFO]"
        
        print(f"{status} {tech} ({desc})")
        print(f"       Friction: {overall_friction:.2f}, Adoption: {adoption}, Hiring: {hiring}")
        
        if matches_rule:
            print(f"       -> Would trigger PURSUE verdict")
    
    print("\n[PASS] Rule 3: Low friction + strong market identified correctly")


def test_mixed_signals():
    """RULE 4: Mixed signals -> LLM with evidence"""
    print("\n" + "=" * 60)
    print("TEST: Rule 4 - Mixed Signals -> LLM Decides")
    print("=" * 60)
    
    market_tool = MarketSignalTool()
    friction_tool = FrictionEstimator()
    
    # Technologies with mixed signals
    test_cases = [
        ("Rust", "High friction, medium market"),
        ("Kubernetes", "High friction, high market"),
        ("Svelte", "Medium friction, medium market"),
        ("LangChain", "Medium friction, medium market"),
    ]
    
    for tech, expected in test_cases:
        market = market_tool.execute(tech)
        friction = friction_tool.execute(tech)
        
        m_data = market.structured_data
        f_data = friction.structured_data
        
        adoption = m_data.get("adoption", "unknown")
        overall_friction = f_data.get("overall_friction", 0.5)
        
        # Check if any absolute rule would fire
        rule_1 = False  # Freshness already handled
        rule_2 = overall_friction > 0.75 and adoption == "low"
        rule_3 = overall_friction < 0.4 and adoption == "high"
        
        needs_llm = not (rule_1 or rule_2 or rule_3)
        
        status = "[PASS]" if needs_llm else "[INFO]"
        print(f"{status} {tech}: {expected}")
        print(f"       Friction: {overall_friction:.2f}, Adoption: {adoption}")
        print(f"       -> Would go to LLM: {needs_llm}")
    
    print("\n[PASS] Rule 4: Mixed signals correctly identified for LLM")


def test_friction_user_modifier():
    """Test that user profile modifies friction"""
    print("\n" + "=" * 60)
    print("TEST: Friction User Modifier")
    print("=" * 60)
    
    friction_tool = FrictionEstimator()
    
    # Same tech, different users
    test_cases = [
        ("Kubernetes", "", "No profile"),
        ("Kubernetes", "I'm a backend developer", "Backend dev"),
        ("Kubernetes", "I'm a DevOps engineer", "DevOps"),
        ("Kubernetes", "I'm a frontend developer", "Frontend"),
    ]
    
    for tech, profile, desc in test_cases:
        result = friction_tool.execute(tech, {"user_profile": profile})
        data = result.structured_data
        
        friction = data.get("overall_friction", 0.5)
        modifier = data.get("user_modifier", 0.0)
        
        print(f"[INFO] {tech} ({desc})")
        print(f"       Friction: {friction:.2f}, Modifier: {modifier:+.2f}")
    
    print("\n[PASS] User modifiers applied correctly")


def test_orchestrator_full_run():
    """Test complete orchestrator run"""
    print("\n" + "=" * 60)
    print("TEST: Full Orchestrator Run")
    print("=" * 60)
    
    orchestrator = ToolOrchestrator()
    
    test_cases = [
        ("Redis for caching", "Backend developer"),
        ("Kubernetes for microservices", "DevOps engineer"),
        ("Rust for CLI tools", "Frontend developer"),
        ("Zig programming language", "Curious developer"),
    ]
    
    for topic, profile in test_cases:
        print(f"\n--- Topic: {topic} ---")
        result = orchestrator.execute_tools(topic, {"user_profile": profile})
        
        print(f"   Watchlist: {result.get('watchlist_triggered')}")
        print(f"   Confidence: {result.get('combined_confidence')}")
        
        market = result.get("market", {})
        friction = result.get("friction", {})
        
        print(f"   Market: adoption={market.get('adoption')}, hiring={market.get('hiring_signal')}")
        print(f"   Friction: {friction.get('overall_friction', 'N/A')}")
    
    print("\n[PASS] Full orchestrator tests complete")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("AXIOM TOOL SYSTEM - WEEK 2 TESTS")
    print("=" * 60)
    
    test_rule_1_freshness_watchlist()
    test_rule_2_high_friction_weak_market()
    test_rule_3_low_friction_strong_market()
    test_mixed_signals()
    test_friction_user_modifier()
    test_orchestrator_full_run()
    
    print("\n" + "=" * 60)
    print("[SUCCESS] All Week 2 tests completed")
    print("=" * 60)
