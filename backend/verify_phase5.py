import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/api"

def print_result(name, passed, details=""):
    icon = "[PASS]" if passed else "[FAIL]"
    print(f"{icon} {name}")
    if details:
        print(f"   {details}")

def test_evolution_logic():
    print("\n--- Testing Agent Evolution ---")
    
    # 1. Check initial state
    try:
        resp = requests.get(f"{BASE_URL}/debug/state")
        if resp.status_code != 200:
            print_result("Get Debug State", False, f"Status: {resp.status_code} - {resp.text}")
            return
            
        initial_state = resp.json()
        initial_score = initial_state['evolution']['score']
        print(f"   Initial Score: {initial_score}")
        
        # 2. Simulate interaction (should increase score)
        # We'll run a quick task
        task_payload = {
            "taskId": "quick-advice",
            "userId": "test_user",
            "context": {"latestEntry": "Testing evolution logic with python."}
        }
        requests.post(f"{BASE_URL}/agent/task", json=task_payload)
        
        # 3. Check score update
        resp = requests.get(f"{BASE_URL}/debug/state")
        new_state = resp.json()
        new_score = new_state['evolution']['score']
        
        print(f"   New Score: {new_score}")
        print_result("Score Update on Interaction", new_score >= initial_score, f"Diff: {new_score - initial_score}")
        
    except Exception as e:
        print_result("Evolution Logic Error", False, str(e))

def test_conversation_context():
    print("\n--- Testing Conversation Context ---")
    
    try:
        # 1. Clear state (simulated by checking if previous task is there)
        resp = requests.get(f"{BASE_URL}/debug/state")
        history_count = resp.json()['conversation_history_count']
        print(f"   History Count: {history_count}")
        
        # 2. Run another task
        task_payload = {
            "taskId": "quick-advice",
            "userId": "test_user",
            "context": {"latestEntry": "Second interaction for context check."}
        }
        requests.post(f"{BASE_URL}/agent/task", json=task_payload)
        
        # 3. Verify history grew
        resp = requests.get(f"{BASE_URL}/debug/state")
        new_count = resp.json()['conversation_history_count']
        
        print(f"   New History Count: {new_count}")
        print_result("Context Window Growth", new_count > history_count, f"Added: {new_count - history_count}")
        
        # 4. Check if context contains our message
        context_text = resp.json()['conversation_context']
        print_result("Message Persistence", "Second interaction" in context_text)
        
    except Exception as e:
        print_result("Context Logic Error", False, str(e))

if __name__ == "__main__":
    try:
        test_evolution_logic()
        test_conversation_context()
    except Exception as e:
        print(f"[ERROR] Verification Failed: {e}")
