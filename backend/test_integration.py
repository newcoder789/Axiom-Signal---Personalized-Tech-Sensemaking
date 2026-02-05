"""
Complete integration test for Axiom Memory System.
Tests all components working together.
"""

import sys
# import time
# from datetime import datetime, UTC

# Add parent directory to path if needed
sys.path.insert(0, ".")

# from manager import AxiomMemoryManager
# from schemas import MemoryWriteContext
from memory.integration import get_memory_manager, enhance_verdict_prompt


def test_complete_memory_system():
    """Test the complete Axiom Memory System end-to-end."""

    print("🧪 TESTING COMPLETE AXIOM MEMORY SYSTEM")
    print("=" * 60)

    # 1. Initialize memory manager
    print("\n1. Initializing memory manager...")
    manager = get_memory_manager()

    # Health check
    health = manager.health_check()
    print(f"   Health status: {health['status']}")
    print(f"   Redis connected: {health['redis_connected']}")
    print(f"   Embeddings available: {health['embeddings_available']}")

    if health["status"] != "healthy":
        print("❌ System not healthy, stopping test")
        return

    # 2. Clear any existing test data
    print("\n2. Clearing test data...")
    deleted = manager.clear_user_memories()  # Clear all
    print(f"   Deleted {deleted} existing memory keys")

    # 3. Test 1: Process first verdict (Backend developer, Redis)
    print("\n3. Test 1: Processing backend developer verdict on Redis...")

    # Simulate pipeline output
    test_user = (
        "Senior backend developer at tech company, focused on performance optimization"
    )
    test_topic = "Redis 7 for caching"

    pipeline_output_1 = {
        "topic": test_topic,
        "user_profile": test_user,
        "signal": {
            "status": "ok",
            "confidence_level": "high",
            "user_context_summary": test_user,
        },
        "reality_check": {
            "market_signal": "strong",
            "hype_score": 3,
            "risk_factors": [
                "Memory management complexity",
                "Clustering learning curve",
            ],
        },
        "verdict": {
            "verdict": "pursue",
            "confidence": "high",
            "reasoning": "Redis significantly improves API performance and reduces latency. Battle-tested in production at scale with major tech companies.",
        },
        "contract_violation": False,
    }

    # Process verdict (simulates WRITE phase)
    result_1 = manager.process_verdict(
        user_profile=test_user,
        topic=test_topic,
        verdict_data=pipeline_output_1["verdict"],
        signal_data=pipeline_output_1["signal"],
        reality_check_data=pipeline_output_1["reality_check"],
        pipeline_state=pipeline_output_1,
    )

    print(f"   Memory stored: {result_1['memory_stored']}")
    if result_1["memory_stored"]:
        print(f"   User traits: {len(result_1['details']['user_traits'])}")
        print(f"   Topic patterns: {len(result_1['details']['topic_patterns'])}")
        print(f"   Decision stored: {result_1['details']['decision_stored']}")

    # 4. Test 2: Get memory context for similar query
    print("\n4. Test 2: Getting memory context for similar query...")

    memory_context = manager.create_memory_context(
        user_profile=test_user,
        topic="PostgreSQL caching strategies",
        current_query="What are good caching strategies for PostgreSQL databases?",
    )

    print("   Memory context preview:")
    print("-" * 40)
    print(memory_context.to_prompt_string())
    print("-" * 40)

    # 5. Test 3: Process second verdict (same user, different topic)
    print("\n5. Test 3: Processing verdict on vaporware topic...")

    pipeline_output_2 = {
        "topic": "Quantum JavaScript Framework",
        "user_profile": test_user,
        "signal": {
            "status": "ok",
            "confidence_level": "high",
            "user_context_summary": test_user,
        },
        "reality_check": {
            "market_signal": "weak",
            "hype_score": 9,
            "risk_factors": [
                "No production use cases",
                "Poor documentation",
                "Theoretical only",
            ],
        },
        "verdict": {
            "verdict": "ignore",
            "confidence": "high",
            "reasoning": "Pure hype with no real production use cases. No major companies using it, documentation is poor, and claims violate basic web development principles.",
        },
        "contract_violation": False,
    }

    result_2 = manager.process_verdict(
        user_profile=test_user,
        topic="Quantum JavaScript Framework",
        verdict_data=pipeline_output_2["verdict"],
        signal_data=pipeline_output_2["signal"],
        reality_check_data=pipeline_output_2["reality_check"],
        pipeline_state=pipeline_output_2,
    )

    print(f"   Memory stored: {result_2['memory_stored']}")
    print(f"   Reasons: {result_2['details'].get('reasons', {})}")

    # 6. Test 4: Get user profile summary
    print("\n6. Test 4: Getting user profile summary...")

    profile_summary = manager.get_user_profile_summary(test_user)
    print(f"   User ID: {profile_summary['user_id']}")
    print(f"   Total traits: {profile_summary['total_traits']}")
    print(f"   Total decisions: {profile_summary['total_decisions']}")

    if profile_summary["strongest_trait"]:
        print(
            f"   Strongest trait: {profile_summary['strongest_trait'].get('fact', 'Unknown')}"
        )

    # 7. Test 5: Test prompt enhancement
    print("\n7. Test 5: Testing prompt enhancement...")

    base_prompt = "You are a technical advisor. Analyze the following:"
    enhanced = enhance_verdict_prompt(base_prompt, memory_context)

    # Show first few lines of enhanced prompt
    enhanced_preview = enhanced[:500] + "..." if len(enhanced) > 500 else enhanced
    print(f"   Enhanced prompt preview ({len(enhanced)} chars):")
    print("-" * 40)
    print(enhanced_preview)
    print("-" * 40)

    # 8. Final health check
    print("\n8. Final health check...")
    final_health = manager.health_check()

    print("Memory counts:")
    for mem_type, count in final_health["memory_counts"].items():
        print(f"     • {mem_type}: {count}")

    print(f"\n   User cache size: {final_health['user_cache_size']}")

    # 9. Cleanup option
    print("\n" + "=" * 60)
    print("🧹 CLEANUP OPTIONS:")
    print("1. Keep test data for inspection")
    print("2. Clear all test data")

    try:
        choice = input("\nEnter choice (1 or 2): ").strip()
        if choice == "2":
            deleted = manager.clear_user_memories()
            print(f"✅ Cleared {deleted} memory keys")
        else:
            print("✅ Test data preserved")
    except Exception:
        print("⚠️  Skipping cleanup (non-interactive mode)")

    print("\n🎉 TEST COMPLETE!")
    print("\n📋 Next steps:")
    print("1. Integrate with your Axiom pipeline using integration.py")
    print("2. Modify verdict node to accept memory hints")
    print("3. Test with real queries")

    return manager


if __name__ == "__main__":
    # Run tests
    test_complete_memory_system()
