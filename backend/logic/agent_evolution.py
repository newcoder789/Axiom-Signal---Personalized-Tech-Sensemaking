from typing import Dict, Any, List
from datetime import datetime, timedelta

class AgentEvolution:
    """
    Manages the 'evolution' of the agent based on user engagement.
    Adjusts strategies (verbosity, proactivity) based on feedback signals.
    """
    
    def __init__(self):
        self.current_strategy = "standard"  # standard, concise, detailed, proactive
        self.engagement_score = 0.5
        self.last_update = datetime.utcnow()
        
    def update_engagement(self, interaction_type: str, feedback: bool = None):
        """
        Update engagement score based on interaction.
        feedback: True (thumbs up), False (thumbs down), None (neutral/passive)
        """
        # Base decay first (if significant time passed)
        self._apply_time_decay()
        
        # Update score
        delta = 0.0
        if interaction_type == "query":
            delta = 0.05
        elif interaction_type == "feedback":
            if feedback is True:
                delta = 0.15
            elif feedback is False:
                delta = -0.2  # Negative feedback hits harder
                
        self.engagement_score = min(max(self.engagement_score + delta, 0.0), 1.0)
        self.last_update = datetime.utcnow()
        
        self._evolve_strategy()
        
        print(f"[EVOLUTION] Engagement: {self.engagement_score:.2f} | Strategy: {self.current_strategy} | Action: {interaction_type}")
        
    def _apply_time_decay(self):
        """Decay engagement if user is away."""
        now = datetime.utcnow()
        hours_passed = (now - self.last_update).total_seconds() / 3600
        
        if hours_passed > 24:
            decay = 0.1 * (hours_passed / 24)
            self.engagement_score = max(self.engagement_score - decay, 0.0)
            
    def _evolve_strategy(self):
        """Adjust strategy based on score."""
        if self.engagement_score > 0.8:
            self.current_strategy = "proactive" # Highly engaged: offer more help
        elif self.engagement_score < 0.3:
            self.current_strategy = "concise"   # Low engagement: stay out of the way
        else:
            self.current_strategy = "standard"
            
    def get_strategy_config(self) -> Dict[str, Any]:
        """Return configuration for current strategy."""
        configs = {
            "standard": {
                "verbosity": "balanced",
                "proactive_notifications": True,
                "notification_threshold": 0.6
            },
            "concise": {
                "verbosity": "low",
                "proactive_notifications": False, # Don't annoy
                "notification_threshold": 0.8     # Only high confidence
            },
            "proactive": {
                "verbosity": "high",
                "proactive_notifications": True,
                "notification_threshold": 0.5     # Share more ideas
            }
        }
        return configs.get(self.current_strategy, configs["standard"])

# Global instance
agent_evolution = AgentEvolution()
