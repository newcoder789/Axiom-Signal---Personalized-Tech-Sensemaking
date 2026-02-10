
import os
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from memory.manager import AxiomMemoryManager
from memory.schemas import InteractionMemory, MemoryType

class AxiomNotificationEngine:
    """
    Proactive Notification Engine for Axiom.
    Detects patterns, contradictions, and opportunities to alert the user.
    """
    def __init__(self, memory_manager: AxiomMemoryManager, ws_manager=None):
        self.memory_manager = memory_manager
        self.ws_manager = ws_manager
        
    async def analyze_event(self, event_type: str, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Main entry point for analyzing an event (e.g., 'journal_write', 'decision_made').
        Returns a list of generated notifications.
        """
        notifications = []
        user_profile = data.get("user_profile", "Developer")
        
        if event_type == "decision_made":
            # 1. Check for contradictions with past decisions
            contradiction = self.check_for_contradictions(data)
            if contradiction:
                notifications.append(contradiction)
                
            # 2. Check for follow-up actions
            actions = self.extract_proactive_actions(data)
            if actions:
                notifications.extend(actions)
        
        # Store and broadcast notifications
        for note in notifications:
            self.store_notification(user_profile, note)
            if self.ws_manager:
                await self.ws_manager.broadcast({
                    "event": "notification",
                    "data": note
                })
        
        return notifications

    def check_for_contradictions(self, new_decision: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Compare a new decision with past decisions in memory.
        """
        user_profile = new_decision.get("user_profile", "")
        topic = new_decision.get("topic", "")
        verdict = new_decision.get("verdict", "")
        reasoning = new_decision.get("reasoning", "")
        
        if not user_profile or not topic:
            return None
            
        # Get context (includes past decisions)
        context = self.memory_manager.create_memory_context(user_profile, topic, reasoning)
        
        past_decisions = context.similar_decisions
        for past in past_decisions:
            # Simple logic for now: if verdict changed for the same topic
            if past["topic"].lower() == topic.lower() and past["verdict"] != verdict:
                return {
                    "type": "surprise",
                    "title": f"Wait, {topic} sentiment changed?",
                    "content": f"You previously chose '{past['verdict']}' for {topic} but now you're leaning towards '{verdict}'. Would you like to compare these?",
                    "metadata": {
                        "past_verdict": past["verdict"],
                        "new_verdict": verdict,
                        "topic": topic
                    }
                }
        
        return None

    def extract_proactive_actions(self, decision: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Identify 'Next Steps' that the agent should proactively suggest.
        """
        # (Stub for now - will integrate with an LLM call if needed)
        # For now, if decision is 'pursue', suggest a deep dive
        if decision.get("verdict") == "pursue":
            return [{
                "type": "action",
                "title": f"Next step for {decision.get('topic')}",
                "content": f"Since you're pursuing {decision.get('topic')}, should I generate a comparative analysis with alternatives?",
                "metadata": {"topic": decision.get("topic")}
            }]
        return []

    def store_notification(self, user_profile: str, notification: Dict[str, Any]):
        """
        Persist notification to interaction memory.
        """
        self.memory_manager.store_interaction(
            user_profile=user_profile,
            interaction_type="notification",
            content=notification["content"],
            role="assistant",
            topic=notification.get("metadata", {}).get("topic")
        )
