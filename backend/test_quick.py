"""Run comprehensive test suite through AxiomWithMemory and save results.

This script runs the canonical test cases (from `backend/test_cases.py`) but
uses `AxiomWithMemory.run_with_memory()` so memory context is injected into
the verdict node. Results are written to `test_results/` with timestamp.
"""

from datetime import datetime
import json
import os

from axiom_with_memory import AxiomWithMemory
import test_cases as tc


def run_suite_with_memory(redis_url: str = "redis://localhost:6379"):
    print("🧪 Running comprehensive suite with memory injection")
    print("=" * 60)

    axiom = AxiomWithMemory(redis_url=redis_url, debug=False)

    results = []
    for test in tc.test_cases:
        name = test["name"]
        topic = test["topic"]
        user = test["user"]
        expected = test["expected"]

        print(f"\n→ Test: {name} — topic: '{topic}' user: '{user}'")

        try:
            res = axiom.run_with_memory(topic=topic, user_profile=user)

            # Extract key outputs
            verdict = res.get("verdict") if isinstance(res, dict) else None
            actual = verdict.verdict if verdict is not None else None

            # Try to capture memory context used (string)
            memory_ctx = None
            mem_info = res.get("memory") if isinstance(res, dict) else None
            if mem_info:
                memory_ctx = mem_info.get("context_used") or mem_info.get("context")

            passed = actual == expected

            print(f"   verdict: {actual} (expected: {expected}) — {'PASS' if passed else 'FAIL'}")
            if memory_ctx:
                print(f"   memory_ctx (truncated): {memory_ctx[:200]}")

            results.append(
                {
                    "name": name,
                    "category": test.get("category"),
                    "topic": topic,
                    "user_profile": user,
                    "expected": expected,
                    "actual": actual,
                    "passed": passed,
                    "memory_context": memory_ctx,
                }
            )

        except Exception as e:
            print(f"   ERROR running test {name}: {e}")
            results.append(
                {
                    "name": name,
                    "category": test.get("category"),
                    "topic": topic,
                    "user_profile": user,
                    "expected": expected,
                    "error": str(e),
                    "passed": False,
                }
            )

    # Save results
    out_dir = "test_results"
    os.makedirs(out_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_file = os.path.join(out_dir, f"with_memory_results_{ts}.json")

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "results": results,
        }, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Results saved to: {out_file}")
    return out_file


if __name__ == "__main__":
    run_suite_with_memory()
