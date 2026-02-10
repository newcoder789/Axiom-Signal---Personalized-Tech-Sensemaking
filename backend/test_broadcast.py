
import requests
import json
import time

def trigger_broadcast():
    print("Triggering Verdict for Broadcast Test...")
    url = "http://localhost:8000/api/verdict"
    
    # We use a topic that was already in memory as "pursue" (from test_notifications_logic.py)
    # and we provide an "ignore" verdict to trigger the 'surprise' notification.
    payload = {
        "topic": "Actix-web",
        "content": "I think Actix-web is actually too complicated for this project. I'm going to ignore it for now.",
        "context": {
            "profile": "developer",
            "experienceLevel": "intermediate",
            "riskTolerance": "medium",
            "timeHorizon": "3 months"
        }
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            print("✅ Verdict request successful.")
            print("   Now check the browser for a notification toast!")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Connection error: {e}")

if __name__ == "__main__":
    trigger_broadcast()
