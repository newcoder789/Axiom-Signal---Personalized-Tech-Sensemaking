"""
Quick test for integrated system
"""

from axiom_with_memory import AxiomWithMemory


def quick_test():
    """Quick test"""
    print("🧪 Quick Integration Test")
    print("=" * 40)

    # Initialize
    axiom = AxiomWithMemory(debug=True)

    # Health check
    health = axiom.health_check()
    print(f"Health: {health.get('status')}")

    # Run test
    topic = "TypeScript"
    user_profile = "Frontend developer, 2 years JavaScript experience"
    result = axiom.run_with_memory(
        topic="TypeScript",
        user_profile="Frontend developer, 2 years JavaScript experience",
    )
    print(f"\n Now for user:{user_profile}, topic:{topic}")
    print(f"\nVerdict: {result['verdict'].verdict}")
    print(f"Memory stored: {'memory' in result}")

    # Get user insights
    insights = axiom.get_user_insights(
        "Database administrator, needs better performance"
    )
    print(f"\nUser decisions: {insights.get('total_decisions', 0)}")

    print("\n✅ Quick test complete!")


if __name__ == "__main__":
    quick_test()
