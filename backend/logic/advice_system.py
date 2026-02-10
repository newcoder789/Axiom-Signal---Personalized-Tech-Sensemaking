from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

class AdviceGenerator:
    def __init__(self):
        self.templates = {
            "repetition": [
                {
                    "condition": lambda p: p.get("count", 0) >= 5,
                    "template": "You keep thinking about {tag} - this seems really important to you. Want to make it a priority?",
                    "action": "make_priority",
                    "urgency": "high"
                },
                {
                    "condition": lambda p: p.get("count", 0) >= 3,
                    "template": "You've mentioned {tag} {count} times recently. Perhaps it's time to explore this further?",
                    "action": "suggest_exploration",
                    "urgency": "medium"
                }
            ],
            "contradiction": [
                {
                    "condition": lambda p: True,
                    "template": "I noticed conflicting thoughts about {topic}. Let's clarify your position.",
                    "action": "resolve_contradiction",
                    "urgency": "medium"
                }
            ],
            "followup_needed": [
                {
                    "condition": lambda p: p.get("severity", 0) > 0.7,
                    "template": "It's been a while since you decided to pursue {item}. Need help getting started?",
                    "action": "offer_help",
                    "urgency": "high"
                },
                {
                    "condition": lambda p: True,
                    "template": "Remember {item}? You marked it as pursue. Any updates?",
                    "action": "request_update",
                    "urgency": "medium"
                }
            ]
        }

    def generate_advice(self, user_id: str, pattern: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        p_type = pattern.get("type", "general")
        templates = self.templates.get(p_type, [])
        
        selected = None
        for t in templates:
            if t["condition"](pattern):
                selected = t
                break
        
        if not selected: return None
        
        # Fill template
        text = selected["template"]
        details = pattern.get("details", {})
        
        # Simple string replacement (safe enough for this context)
        text = text.replace("{tag}", pattern.get("tag", ""))
        text = text.replace("{count}", str(pattern.get("count", "")))
        text = text.replace("{item}", details.get("item", ""))
        text = text.replace("{topic}", "this topic") # Placeholder for complex context extraction
        
        advice = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "text": text,
            "type": p_type,
            "pattern_id": pattern.get("id"),
            "urgency": selected["urgency"],
            "suggested_action": selected["action"],
            "created_at": datetime.utcnow().isoformat(),
            "buttons": self._generate_buttons(selected["action"], pattern)
        }
        return advice

    def _generate_buttons(self, action: str, pattern: Dict[str, Any]) -> List[Dict[str, Any]]:
        buttons = []
        if action == "make_priority":
            buttons = [
                {"text": "Make Priority", "action": "set_priority", "data": {"tag": pattern.get("tag")}},
                {"text": "Not Now", "action": "dismiss", "data": {"reason": "not_now"}}
            ]
        elif action == "suggest_exploration":
            buttons = [
                {"text": "Explore Now", "action": "start_exploration", "data": {"tag": pattern.get("tag")}},
                {"text": "Schedule", "action": "schedule", "data": {"tag": pattern.get("tag")}},
                {"text": "Ignore", "action": "dismiss"}
            ]
        elif action == "resolve_contradiction":
            buttons = [
                 {"text": "Clarify", "action": "open_journal", "data": {"prompt": f"Clarify my thoughts about {pattern.get('tag', 'this')}"}},
                 {"text": "It's OK", "action": "dismiss", "data": {"reason": "acceptable_contradiction"}}
            ]
        elif action == "offer_help":
            buttons = [
                {"text": "Yes, Help", "action": "request_help", "data": {"item": pattern.get("details", {}).get("item")}},
                {"text": "I'm Good", "action": "dismiss"}
            ]
        elif action == "request_update":
             buttons = [
                {"text": "Update", "action": "quick_update", "data": {"item": pattern.get("details", {}).get("item")}},
                {"text": "Later", "action": "snooze", "data": {"hours": 24}}
            ]
            
        return buttons

class AdviceManager:
    def __init__(self):
        self.generator = AdviceGenerator()
        self.pending_advice = {} # user_id -> List[advice]

    def process_pattern(self, user_id: str, pattern: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        advice = self.generator.generate_advice(user_id, pattern)
        if advice:
            if user_id not in self.pending_advice:
                self.pending_advice[user_id] = []
            
            # Simple dedup (check if same text exists in pending)
            if not any(a["text"] == advice["text"] for a in self.pending_advice[user_id]):
                # Record interaction in DB for feedback loop
                from memory.memory_service import MemoryService
                service = MemoryService()
                interaction_id = service.record_interaction(
                    user_id=user_id,
                    interaction_type="advice",
                    content=advice["text"],
                    related_memory_ids=pattern.get("memory_ids", [])
                )
                advice["interaction_id"] = interaction_id
                
                self.pending_advice[user_id].append(advice)
                # Sort by urgency
                urgency_score = {"high": 3, "medium": 2, "low": 1}
                self.pending_advice[user_id].sort(key=lambda x: urgency_score.get(x["urgency"], 0), reverse=True)
                return advice
        return None

    def get_pending_advice(self, user_id: str) -> List[Dict[str, Any]]:
        return self.pending_advice.get(user_id, [])

    def mark_handled(self, user_id: str, advice_id: str):
        if user_id in self.pending_advice:
            self.pending_advice[user_id] = [a for a in self.pending_advice[user_id] if a["id"] != advice_id]
