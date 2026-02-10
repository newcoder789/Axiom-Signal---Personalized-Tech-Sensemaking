from typing import List, Dict, Any, Optional
from datetime import datetime
import json

class ConversationManager:
    """
    Manages a sliding window of conversation context.
    Keeps track of recent user/assistant interactions to provide context for tasks.
    """
    
    def __init__(self, max_history: int = 10):
        self.history: List[Dict[str, Any]] = []
        self.max_history = max_history
        
    def add_message(self, role: str, content: str, metadata: Dict[str, Any] = None):
        """
        Add a message to the history.
        role: 'user' or 'assistant'
        """
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": metadata or {}
        }
        
        self.history.append(message)
        
        # Trim history if it exceeds max len
        if len(self.history) > self.max_history:
            self.history = self.history[-self.max_history:]
            
    def get_context(self, format_type: str = "text") -> str:
        """
        Get recent context formatted for LLM injection.
        """
        if not self.history:
            return ""
            
        if format_type == "text":
            context_str = "RECENT CONVERSATION HISTORY:\n"
            for msg in self.history:
                timestamp = msg["timestamp"][:16].replace("T", " ")
                context_str += f"[{timestamp}] {msg['role'].upper()}: {msg['content']}\n"
            return context_str
            
        return json.dumps(self.history)
        
    def clear_history(self):
        """Clear conversation history."""
        self.history = []

# Global instance
conversation_manager = ConversationManager()
