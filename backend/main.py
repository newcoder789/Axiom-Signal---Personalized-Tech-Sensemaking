"""
Main entry point for Axiom v0 with Memory System
"""

import sys
from axiom_with_memory import run_axiom_with_memory


def main():
    """Main entry point"""
    print("🧠 Axiom v0 - Tech Sensemaking with Memory")
    print("=" * 60)

    # Check command line arguments
    if len(sys.argv) < 3:
        print("Usage: python main.py <topic> <user_profile>")
        print('Example: python main.py "Redis 7" "Backend developer"')
        return

    topic = sys.argv[1]
    user_profile = sys.argv[2]
    debug = "--debug" in sys.argv

    print(f"Topic: {topic}")
    print(f"User: {user_profile}")
    print("Memory: ENABLED")
    print(f"Debug: {'ON' if debug else 'OFF'}")
    print("-" * 40)

    try:
        # Run with memory system
        result = run_axiom_with_memory(topic, user_profile, debug=debug)

        # Display results
        print("\n📊 FINAL VERDICT:")
        print("-" * 40)
        print(
            f"Decision: {result.get('verdict', {}).get('verdict', 'unknown').upper()}"
        )
        print(f"Confidence: {result.get('verdict', {}).get('confidence', 'unknown')}")
        print(f"Timeline: {result.get('verdict', {}).get('timeline', 'unknown')}")

        # Show reasoning
        reasoning = result.get("verdict", {}).get("reasoning", "")
        if reasoning:
            print(f"\n📝 Reasoning: {reasoning}")

        # Show action items
        actions = result.get("verdict", {}).get("action_items", [])
        if actions:
            print("\n✅ Action Items:")
            for action in actions:
                print(f"  • {action}")

        # Show memory info
        if "memory" in result:
            memory = result["memory"]
            print("\n🧠 Memory System:")
            if memory.get("storage_result", {}).get("memory_stored"):
                print("  ✓ Memories stored for future queries")
            else:
                print("  ⏭️  No new memories stored (policy gates)")

        # Show alignment metrics
        if "chain_coherence_score" in result:
            print("\n🔗 Alignment Metrics:")
            print(f"  • Chain Coherence: {result.get('chain_coherence_score', 0):.3f}")
            print(
                f"  • Signal-Evidence: {result.get('signal_evidence_alignment', 0):.3f}"
            )
            print(
                f"  • Evidence-Verdict: {result.get('evidence_verdict_alignment', 0):.3f}"
            )

        # Show contract violations if any
        if result.get("contract_violation"):
            print("\n⚠️  Contract Violations Detected:")
            for violation in result.get("violations", []):
                print(f"  • {violation}")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
