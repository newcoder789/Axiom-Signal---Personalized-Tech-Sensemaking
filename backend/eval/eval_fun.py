import json
from collections import defaultdict
from axiom.graph import run_axiom_graph  # adjust import

EVAL_FILE = "eval/data/axiom_eval.json"


def run_eval():
    with open(EVAL_FILE, "r") as f:
        cases = json.load(f)

    results = []
    stats = defaultdict(int)

    for case in cases:
        output = run_axiom_graph(topic=case["topic"], user_profile=case["user"])

        predicted = output["verdict"]["label"]
        expected = case["expected"]

        passed = predicted == expected

        results.append(
            {
                "name": case["name"],
                "category": case["category"],
                "expected": expected,
                "predicted": predicted,
                "passed": passed,
                "notes": case["notes"],
            }
        )

        stats["total"] += 1
        stats["passed"] += int(passed)

    print("\n=== AXIOM EVAL RESULTS ===")
    for r in results:
        status = "✅" if r["passed"] else "❌"
        print(f"{status} {r['name']} | expected={r['expected']} got={r['predicted']}")

    print(f"\nAccuracy: {stats['passed']}/{stats['total']}")


if __name__ == "__main__":
    run_eval()
