
import os
import sys
import asyncio
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from memory.manager import AxiomMemoryManager
from notifications.engine import AxiomNotificationEngine
from memory.schemas import MemoryWriteContext

async def test_proactive_logic():
    print("Testing Proactive Notification Logic...")
    
    manager = AxiomMemoryManager(use_embeddings=True)
    engine = AxiomNotificationEngine(memory_manager=manager)
    
    user_profile = "Developer interested in high-performance web frameworks."
    topic = "Actix-web"
    
    # 1. Clear relevant memories for test isolation (optional but good)
    # manager.vector_memory.redis.flushall() # Too aggressive?
    
    # 2. Simulate Decision 1: Pursue
    print("\n--- Decision 1: Pursue ---")
    d1 = {
        "user_profile": user_profile,
        "topic": topic,
        "verdict": "pursue",
        "reasoning": "Actix-web is the fastest framework according to benchmarks. Highly recommended for production."
    }
    # Store it in memory manually to skip the whole API flow
    manager.vector_memory.process_verdict(MemoryWriteContext(
        user_id=manager.derive_user_id(user_profile),
        topic=topic,
        verdict="pursue",
        reasoning=d1["reasoning"],
        confidence="high",
        signal_status="strong",
        market_signal="strong",
        hype_score=4,
        user_context=user_profile,
        risk_factors=[],
        contract_violation=False
    ))
    
    # 3. Simulate Decision 2: Ignore (Contradiction!)
    print("\n--- Decision 2: Ignore (Triggering check) ---")
    d2 = {
        "user_profile": user_profile,
        "topic": topic,
        "verdict": "ignore",
        "reasoning": "Actually, Actix-web is too complex and the boilerplate is annoying."
    }
    
    notifications = await engine.analyze_event("decision_made", d2)
    
    print(f"\nGenerated {len(notifications)} notification(s):")
    for note in notifications:
        print(f"  [{note['type'].upper()}] {note['title']}")
        print(f"  Content: {note['content']}")
        
    has_surprise = any(n["type"] == "surprise" for n in notifications)
    if has_surprise:
        print("\nSUCCESS: Contradiction ('Surprise') detected correctly.")
    else:
        print("\nFAILED: Surprise notification not generated.")

if __name__ == "__main__":
    asyncio.run(test_proactive_logic())
