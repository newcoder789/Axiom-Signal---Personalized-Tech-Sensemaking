"""
Day 4 Comprehensive Test Suite - 30 Topics
Categories: Hype Tech, Dead Tech, Vaporware, Solid Tech, Edge Cases

This is the gold standard test - if system passes 24+/30, it's production-ready for v0
"""

from graph.graph_utils import app
import json
from datetime import datetime
import os


def test_topic(
    category: str, name: str, topic: str, user: str, expected: str, notes: str = ""
):
    """Run a single test and return results"""
    print(f"\n🔄 Testing: {name}...", end="")

    try:
        result = app.invoke({"topic": topic, "user_profile": user})
        actual = result["verdict"].verdict

        passed = actual == expected
        symbol = "✅" if passed else "❌"

        print(f" {symbol} actual: {actual}, expected: {expected}")
        print(f'Outpus: "signal_status": {result["signal"].status}, "market_signal": {result["reality_check"].market_signal},"hype_score": {result["reality_check"].hype_score}, "feasibility": {result["reality_check"].feasibility}')
        print(f'User context summary: {result["signal"].user_context_summary}')
        print(f'Risk factors: {result["reality_check"].risk_factors}')
        print(f'Reasoning: {result["verdict"].reasoning}')
        print(f'Future action items: {result["verdict"].action_items}')
        return {
            "category": category,
            "name": name,
            "topic": topic,
            "user_profile": user,
            "expected_verdict": expected,
            "actual_verdict": actual,
            "passed": passed,
            "notes": notes,
            "outputs": {
                "signal_status": result["signal"].status,
                "market_signal": result["reality_check"].market_signal,
                "hype_score": result["reality_check"].hype_score,
                "feasibility": result["reality_check"].feasibility,
                "reasoning": result["verdict"].reasoning,
                "timeline": result["verdict"].timeline,
            },
        }
    except Exception as e:
        print(f" ❌ ERROR: {str(e)}")
        return {"category": category, "name": name, "error": str(e), "passed": False}


# ============================================================================
# TEST SUITE DEFINITION
# ============================================================================

test_cases = []

# ============================================================================
# CATEGORY 1: HYPE TECH (6 topics)
# These are hyped but some are legitimate, some aren't
# ============================================================================

test_cases.extend(
    [
        {
            "category": "Hype Tech",
            "name": "Devin AI",
            "topic": "Devin AI coding agent",
            "user": "Senior software engineer, interested in AI-assisted development",
            "expected": "explore",  # Hyped but worth knowing about
            "notes": "High hype but represents real trend in AI coding assistants",
        },
        {
            "category": "Hype Tech",
            "name": "AutoGPT",
            "topic": "AutoGPT autonomous agents",
            "user": "AI/ML engineer, building LLM applications",
            "expected": "explore",  # Overhyped but educational
            "notes": "Overhyped but useful for understanding agent patterns",
        },
        {
            "category": "Hype Tech",
            "name": "Web3 Development",
            "topic": "Web3 development and dApps",
            "user": "Full-stack developer, curious about blockchain",
            "expected": "explore",  
            "notes": "Unless crypto-focused, opportunity cost too high",
        },
        {
            "category": "Hype Tech",
            "name": "No-Code AI",
            "topic": "No-code AI platform builders",
            "user": "Product manager, non-technical, wants to build AI features",
            "expected": "explore",  # Legit for PMs
            "notes": "Appropriate for non-technical roles",
        },
        {
            "category": "Hype Tech",
            "name": "Edge AI",
            "topic": "Edge AI and on-device models",
            "user": "Mobile developer, iOS/Android experience",
            "expected": "explore",  # Real trend, worth knowing
            "notes": "Legitimate trend in mobile AI",
        },
        {
            "category": "Hype Tech",
            "name": "Quantum ML",
            "topic": "Quantum machine learning",
            "user": "Data scientist, 3 years experience in ML",
            "expected": "ignore",  # Too early, not practical
            "notes": "Experimental, not production-ready",
        },
    ]
)

# ============================================================================
# CATEGORY 2: DEAD/OBSOLETE TECH (6 topics)
# These should all return "ignore" with clear reasoning
# ============================================================================

test_cases.extend(
    [
        {
            "category": "Dead Tech",
            "name": "CoffeeScript",
            "topic": "CoffeeScript for new projects",
            "user": "Frontend developer, starting a new web app",
            "expected": "ignore",
            "notes": "Superseded by modern JavaScript/TypeScript",
        },
        {
            "category": "Dead Tech",
            "name": "Backbone.js",
            "topic": "Backbone.js for single-page apps",
            "user": "Frontend developer, building modern SPA",
            "expected": "ignore",
            "notes": "React/Vue/Angular are standard now",
        },
        {
            "category": "Dead Tech",
            "name": "AngularJS 1.x",
            "topic": "AngularJS 1.x for new applications",
            "user": "Full-stack developer, needs to choose a frontend framework",
            "expected": "ignore",
            "notes": "Angular 2+ or other modern frameworks preferred",
        },
        {
            "category": "Dead Tech",
            "name": "COBOL Web",
            "topic": "COBOL for web development",
            "user": "Full-stack developer, wants to build modern SaaS",
            "expected": "ignore",
            "notes": "Wrong tool for modern web development",
        },
        {
            "category": "Dead Tech",
            "name": "Flash",
            "topic": "Adobe Flash for web animations",
            "user": "Frontend developer, needs interactive web content",
            "expected": "ignore",
            "notes": "Deprecated, use CSS/Canvas/WebGL",
        },
        {
            "category": "Dead Tech",
            "name": "Perl CGI",
            "topic": "Perl CGI scripts for web backends",
            "user": "Backend developer, building new web services",
            "expected": "ignore",
            "notes": "Modern frameworks (FastAPI, Express) are standard",
        },
    ]
)

# ============================================================================
# CATEGORY 3: VAPORWARE/SCAM (6 topics)
# Made-up or substance-free - should all be "ignore" with high confidence
# ============================================================================

test_cases.extend(
    [
        {
            "category": "Vaporware",
            "name": "Quantum CSS",
            "topic": "Quantum CSS Framework",
            "user": "Junior frontend developer, learning modern web development",
            "expected": "ignore",
            "notes": "Made-up framework, no substance",
        },
        {
            "category": "Vaporware",
            "name": "NeuralFlux DB",
            "topic": "NeuralFlux Database Engine",
            "user": "Backend engineer, working on data-intensive applications",
            "expected": "ignore",
            "notes": "Vaporware database",
        },
        {
            "category": "Vaporware",
            "name": "Blockchain Git",
            "topic": "Blockchain-powered version control",
            "user": "Software engineer, looking for better Git workflows",
            "expected": "ignore",
            "notes": "Blockchain doesn't solve Git's actual problems",
        },
        {
            "category": "Vaporware",
            "name": "AI-Native Language",
            "topic": "AI-native programming language",
            "user": "Software developer, 5 years experience",
            "expected": "ignore",
            "notes": "Vague buzzword, no clear substance",
        },
        {
            "category": "Vaporware",
            "name": "Zero-Latency Consensus",
            "topic": "Zero-latency distributed consensus protocol",
            "user": "Distributed systems engineer",
            "expected": "ignore",
            "notes": "Violates CAP theorem, impossible claim",
        },
        {
            "category": "Vaporware",
            "name": "Quantum Router",
            "topic": "Quantum-powered API routing",
            "user": "Backend developer, building microservices",
            "expected": "ignore",
            "notes": "Quantum buzzword misapplied to routing",
        },
    ]
)

# ============================================================================
# CATEGORY 4: SOLID BORING TECH (6 topics)
# Established, proven - should be "pursue" or "explore"
# ============================================================================

test_cases.extend(
    [
        {
            "category": "Solid Tech",
            "name": "PostgreSQL 16",
            "topic": "PostgreSQL 16",
            "user": "Backend developer, 3 years experience, building data-heavy apps",
            "expected": "pursue",
            "notes": "Industry standard database",
        },
        {
            "category": "Solid Tech",
            "name": "Redis 7",
            "topic": "Redis 7 for caching",
            "user": "Backend developer, optimizing API performance",
            "expected": "pursue",
            "notes": "Standard caching solution",
        },
        {
            "category": "Solid Tech",
            "name": "Docker",
            "topic": "Docker containers",
            "user": "Full-stack developer, wants to improve deployment",
            "expected": "pursue",
            "notes": "Essential DevOps skill",
        },
        {
            "category": "Solid Tech",
            "name": "FastAPI",
            "topic": "FastAPI Python framework",
            "user": "Python developer, building REST APIs for a startup",
            "expected": "pursue",
            "notes": "Modern, well-adopted Python framework",
        },
        {
            "category": "Solid Tech",
            "name": "TypeScript",
            "topic": "TypeScript",
            "user": "Frontend developer, 2 years JavaScript experience",
            "expected": "pursue",
            "notes": "Industry standard for typed JavaScript",
        },
        {
            "category": "Solid Tech",
            "name": "Nginx",
            "topic": "Nginx reverse proxy",
            "user": "DevOps engineer, managing web infrastructure",
            "expected": "pursue",
            "notes": "Standard web server/reverse proxy",
        },
    ]
)

# ============================================================================
# CATEGORY 5: EDGE CASES (6 topics)
# Nuanced - verdict depends heavily on context
# ============================================================================

test_cases.extend(
    [
        {
            "category": "Edge Cases",
            "name": "Rust for Backends",
            "topic": "Rust for backend web development",
            "user": "Senior backend engineer, 5 years Go/Python, interested in performance",
            "expected": "explore",
            "notes": "Legitimate but steep learning curve",
        },
        {
            "category": "Edge Cases",
            "name": "Kubernetes for Startup",
            "topic": "Kubernetes",
            "user": "DevOps engineer at 3-person startup",
            "expected": "ignore",  # Over-engineering for small team
            "notes": "Overkill for small team, use simpler solutions",
        },
        {
            "category": "Edge Cases",
            "name": "GraphQL",
            "topic": "GraphQL",
            "user": "Backend developer, 3 years building REST APIs",
            "expected": "explore",
            "notes": "Legitimate alternative to REST",
        },
        {
            "category": "Edge Cases",
            "name": "Tailwind CSS",
            "topic": "Tailwind CSS",
            "user": "Frontend developer, comfortable with CSS",
            "expected": "explore",  # or pursue, depends on preferences
            "notes": "Polarizing but widely adopted",
        },
        {
            "category": "Edge Cases",
            "name": "Serverless",
            "topic": "AWS Lambda serverless functions",
            "user": "Full-stack developer, building a new product",
            "expected": "explore",
            "notes": "Depends heavily on use case",
        },
        {
            "category": "Edge Cases",
            "name": "Svelte",
            "topic": "Svelte frontend framework",
            "user": "Frontend developer, experienced with React",
            "expected": "explore",
            "notes": "Smaller but growing, worth knowing about",
        },
    ]
)


# ============================================================================
# RUN ALL TESTS
# ============================================================================

print("\n" + "=" * 80)
print("🚀 AXIOM v0 - COMPREHENSIVE TEST SUITE (30 TOPICS)")
print("=" * 80)
print(f"\nStarted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Total tests: {len(test_cases)}\n")

results = []
for test in test_cases:
    result = test_topic(
        test["category"],
        test["name"],
        test["topic"],
        test["user"],
        test["expected"],
        test.get("notes", ""),
    )
    results.append(result)

# ============================================================================
# CALCULATE RESULTS
# ============================================================================

total_passed = sum(r["passed"] for r in results)
total_tests = len(results)
pass_rate = (total_passed / total_tests) * 100

print("\n" + "=" * 80)
print(f"📊 FINAL RESULTS: {total_passed}/{total_tests} passed ({pass_rate:.1f}%)")
print("=" * 80)

# Breakdown by category
categories = {}
for r in results:
    cat = r.get("category", "Unknown")
    if cat not in categories:
        categories[cat] = {"passed": 0, "total": 0}
    categories[cat]["total"] += 1
    if r["passed"]:
        categories[cat]["passed"] += 1

print("\n📂 BREAKDOWN BY CATEGORY:")
for cat, stats in sorted(categories.items()):
    rate = (stats["passed"] / stats["total"]) * 100
    symbol = "✅" if rate >= 80 else "⚠️" if rate >= 60 else "❌"
    print(f"   {symbol} {cat:15} {stats['passed']}/{stats['total']} ({rate:.0f}%)")

# ============================================================================
# SAVE RESULTS
# ============================================================================

output_dir = "test_results"
os.makedirs(output_dir, exist_ok=True)

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
output_file = f"{output_dir}/comprehensive_test_{timestamp}.json"

with open(output_file, "w") as f:
    json.dump(
        {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_tests": total_tests,
                "total_passed": total_passed,
                "pass_rate": pass_rate,
                "category_breakdown": categories,
            },
            "test_results": results,
        },
        f,
        indent=2,
    )

print(f"\n💾 Results saved to: {output_file}")

# ============================================================================
# ASSESSMENT
# ============================================================================

print("\n" + "=" * 80)
print("🎯 ASSESSMENT")
print("=" * 80)

if pass_rate >= 80:
    print("\n✅ EXCELLENT - System is production-ready for v0 demo")
    print("   → Core decision logic works across all categories")
    print("   → Ready to move to Day 5: Opik tracing")
    print("   → Minor failures are acceptable (edge cases, judgment calls)")
elif pass_rate >= 70:
    print("\n✅ GOOD - System works well with minor issues")
    print("   → Review failed cases to identify patterns")
    print("   → Consider small prompt tweaks")
    print("   → Can proceed to Day 5 or do one more iteration")
elif pass_rate >= 60:
    print("\n⚠️ ACCEPTABLE - System functional but needs improvement")
    print("   → Identify which categories are failing")
    print("   → Fix prompts based on failure patterns")
    print("   → Re-test before moving to Day 5")
else:
    print("\n❌ NEEDS WORK - System has fundamental issues")
    print("   → Review failed cases carefully")
    print("   → Consider architecture changes")
    print("   → Do NOT proceed to Day 5 yet")

# Show failed tests
failed_tests = [r for r in results if not r["passed"]]
if failed_tests:
    print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
    for test in failed_tests[:10]:  # Show first 10
        if "error" in test:
            print(f"   • {test['name']}: ERROR - {test['error']}")
        else:
            print(
                f"   • {test['name']}: expected '{test['expected_verdict']}', got '{test['actual_verdict']}'"
            )
    if len(failed_tests) > 10:
        print(f"   ... and {len(failed_tests) - 10} more (see JSON file)")

print("\n" + "=" * 80 + "\n")
