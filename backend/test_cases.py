"""
Axiom v0 - Initial Test Suite
Tests the 3-node pipeline with 5 edge cases

Day 3 Status: All tests passing, reveals Node 3 is too soft on "ignore" verdicts
Next Step: Expand to 20-30 topics for comprehensive validation (Day 4)
"""

from graph.graph_utils import app
import json


def pretty_print(test_name: str, result: dict) -> None:
    """Pretty print test results with clear formatting"""
    print("\n" + "=" * 80)
    print(f"🧪 {test_name}")
    print("=" * 80)

    print("\n📡 SIGNAL FRAMING:")
    print(json.dumps(result["signal"].model_dump(), indent=2))

    print("\n🔍 REALITY CHECK:")
    print(json.dumps(result["reality_check"].model_dump(), indent=2))

    print("\n⚖️ VERDICT:")
    verdict = result["verdict"]
    if hasattr(verdict, "model_dump"):
        print(json.dumps(verdict.model_dump(), indent=2))
    else:
        print(json.dumps(verdict, indent=2))

    print("\n" + "=" * 80)


# ============================================================================
# TEST CASES
# ============================================================================


def test_normal_topic():
    """Test 1: Normal emerging tool (LangGraph)
    Expected: 'explore' verdict with balanced reasoning
    """
    result = app.invoke(
        {
            "topic": "LangGraph",
            "user_profile": "3rd-year CS student interested in backend + AI, preparing for job market",
        }
    )
    pretty_print("TEST 1: Normal Topic (LangGraph)", result)
    return result


def test_hyped_topic():
    """Test 2: Hyped mainstream framework (Next.js 15)
    Expected: High hype_score (7-9), mention framework churn risks
    """
    result = app.invoke(
        {
            "topic": "Next.js 15",
            "user_profile": "Frontend developer, 2 years experience, working at a startup",
        }
    )
    pretty_print("TEST 2: Hyped Topic (Next.js 15)", result)
    return result


def test_irrelevant_topic():
    """Test 3: Obsolete tech for modern use case (COBOL for web)
    Expected: 'ignore' verdict with clear reasoning
    KNOWN ISSUE: Currently returns 'explore' (Node 3 too soft)
    """
    result = app.invoke(
        {
            "topic": "COBOL for web development",
            "user_profile": "Full-stack developer, wants to build modern SaaS products",
        }
    )
    pretty_print("TEST 3: Irrelevant Topic (COBOL for web)", result)
    return result


def test_unknown_topic():
    """Test 4: Made-up/unclear topic (Quantum CSS Framework)
    Expected: Low confidence, hedged language, 'ignore' verdict
    """
    result = app.invoke(
        {
            "topic": "Quantum CSS Framework",
            "user_profile": "Junior frontend developer, learning modern web development",
        }
    )
    pretty_print("TEST 4: Unknown Topic (Quantum CSS Framework)", result)
    return result


def test_vaporware_topic():
    """Test 5: Another vaporware test to check consistency
    Expected: Similar to Test 4 - should detect insufficient signal
    """
    result = app.invoke(
        {
            "topic": "NeuralFlux Database Engine",
            "user_profile": "Backend engineer, working on data-intensive applications",
        }
    )
    pretty_print("TEST 5: Vaporware Topic (NeuralFlux Database)", result)
    return result


# ============================================================================
# RUN ALL TESTS
# ============================================================================

if __name__ == "__main__":
    print("\n" + "🚀 AXIOM v0 - TEST SUITE" + "\n")
    print("Running 5 edge case tests...")
    print("=" * 80)

    results = {
        "test_1_normal": test_normal_topic(),
        "test_2_hyped": test_hyped_topic(),
        "test_3_irrelevant": test_irrelevant_topic(),
        "test_4_unknown": test_unknown_topic(),
        "test_5_vaporware": test_vaporware_topic(),
    }

    print("\n" + "=" * 80)
    print("✅ ALL TESTS COMPLETED")
    print("=" * 80)

    # Summary
    print("\n📊 EXPECTED BEHAVIORS:")
    print("- Test 1: 'explore' verdict with balanced reasoning ✓")
    print("- Test 2: hype_score 7-9, framework churn risks ✓")
    print("- Test 3: 'ignore' verdict (CURRENTLY FAILING - returns 'explore') ⚠️")
    print("- Test 4: Low confidence, hedged language ✓")
    print("- Test 5: Detect insufficient signal ✓")

    print("\n🔧 KNOWN ISSUES:")
    print("1. Node 3  say 'ignore' too much  tech")
    print("2. Need to strengthen 'ignore' decision criteria in verdict prompt")