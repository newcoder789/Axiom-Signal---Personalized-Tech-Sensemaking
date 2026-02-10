
import os
import sys
from typing import Literal

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from memory.manager import AxiomMemoryManager

def test_interaction():
    print("Starting Interaction Memory Test...")
    
    # Initialize Manager
    manager = AxiomMemoryManager(use_embeddings=True)
    
    user_profile = "Test Developer who loves Rust and high-performance systems."
    
    # 1. Store a query
    print("Saving query...")
    q_result = manager.store_interaction(
        user_profile=user_profile,
        interaction_type="query",
        content="What are the best practices for async Rust?",
        role="user",
        topic="rust"
    )
    print(f"Saved query: {q_result['interaction_id']}")
    
    # 2. Store a response
    print("Saving response...")
    r_result = manager.store_interaction(
        user_profile=user_profile,
        interaction_type="response",
        content="For async Rust, prioritize using tokio and avoid blocking the executor. Use Send/Sync traits properly.",
        role="assistant",
        topic="rust"
    )
    print(f"Saved response: {r_result['interaction_id']}")
    
    # 3. Retrieve history
    print("Retrieving history...")
    history = manager.get_interaction_history(user_profile, limit=5)
    
    print(f"Found {len(history)} interaction(s):")
    for msg in history:
        print(f"  [{msg['role']}] ({msg['interaction_type']}): {msg['content'][:50]}...")
    
    if len(history) >= 2:
        print("SUCCESS: History retrieved correctly.")
    else:
        print("FAILED: History missing items.")

if __name__ == "__main__":
    try:
        test_interaction()
    except Exception as e:
        print(f"Test failed with error: {e}")
