import asyncio
from typing import Dict, List, Callable, Any, Awaitable
from datetime import datetime

class AgentEventManager:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AgentEventManager, cls).__new__(cls)
            cls._instance.listeners = {}
            cls._instance.queue = asyncio.Queue()
            cls._instance._is_processing = False
            
            # Define standard events
            cls._instance.events = {
                "JOURNAL_CREATED": "journal.created",
                "VERDICT_CHANGED": "verdict.changed",
                "USER_INTERACTION": "user.interaction",
                "PATTERN_DETECTED": "pattern.detected",
                "ADVICE_READY": "advice.ready",
                "MEMORY_STORED": "memory.stored"
            }
        return cls._instance

    def on(self, event_name: str, callback: Callable[[Dict[str, Any]], Awaitable[None]]):
        """Register an async event listener."""
        if event_name not in self.listeners:
            self.listeners[event_name] = []
        self.listeners[event_name].append(callback)
        print(f"[OK] Listener registered for {event_name}")

    async def emit(self, event_name: str, data: Dict[str, Any]):
        """Emit an event to all listeners."""
        # Add timestamp if missing
        if "timestamp" not in data:
            data["timestamp"] = datetime.utcnow().isoformat()
            
        print(f"[EVENT] Event Emitted: {event_name}")
        
        # Fire and forget (or await if critical?)
        # For now, we process immediately to keep things simple in FastAPI
        if event_name in self.listeners:
            for listener in self.listeners[event_name]:
                try:
                    # Run listener
                    await listener(data)
                except Exception as e:
                    print(f"[ERROR] Error in listener for {event_name}: {e}")

    # Singleton accessor
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            return cls()
        return cls._instance
