from datetime import datetime
from events.event_manager import AgentEventManager
from memory.memory_service import MemoryService
from database.models import UserMemory, AgentInteraction

# Get singleton instances
event_manager = AgentEventManager.get_instance()
memory_service = MemoryService()

async def setup_event_handlers():
    """Register core event handlers for the application."""
    
    # Handler: JOURNAL_CREATED -> Store in SQL Memory
    async def handle_journal_created(data):
        user_id = data.get("user_id", "default")
        content = data.get("content", "")
        metadata = data.get("metadata", {})
        memory_id = metadata.get("memory_id")
        
        if not memory_id:
            print(f"[IN] Storing Journal for {user_id} (fallback)...")
            memory_id = memory_service.store_memory(
                user_id=user_id,
                content_type="journal",
                content=content,
                metadata=metadata
            )
        else:
            print(f"[OK] Journal already stored (ID: {memory_id})")
        
        # Emit confirmation event
        await event_manager.emit("MEMORY_STORED", {
            "user_id": user_id,
            "memory_id": memory_id,
            "content_type": "journal"
        })

        # Proactive: Send "Edit Link" notification to Frontend
        from notifications.websocket import ws_manager
        await ws_manager.broadcast({
            "type": "advice", # Use advice type to trigger Notification Center UI
            "data": {
                "id": f"edit_{memory_id}",
                "user_id": user_id,
                "text": "Note captured! Want to refine or add details?",
                "type": "general",
                "urgency": "low",
                "buttons": [
                    {"text": "Edit Entry", "action": "open_journal", "data": {"memory_id": memory_id}},
                    {"text": "Dismiss", "action": "dismiss"}
                ],
                "created_at": datetime.utcnow().isoformat()
            }
        })
        
        # Trigger pattern detection (async/future step)
        await event_manager.emit("PATTERN_DETECTED", {
            "trigger": "new_journal",
            "user_id": user_id,
            "related_memory_id": memory_id
        })

    # Handler: VERDICT_CHANGED -> Store Decision & Schedule Follow-up
    async def handle_verdict_changed(data):
        user_id = data.get("user_id", "default")
        item = data.get("item", "")
        old_verdict = data.get("old_verdict", "")
        new_verdict = data.get("new_verdict", "")
        confidence = data.get("confidence", 0.0)
        
        content = f"Changed verdict on \"{item}\" from {old_verdict} to {new_verdict} (confidence: {confidence})"
        
        print(f"[VERDICT] Storing Verdict Change for {item}...")
        memory_id = memory_service.store_memory(
            user_id=user_id,
            content_type="verdict",
            content=content,
            metadata={
                "item": item,
                "old_verdict": old_verdict,
                "new_verdict": new_verdict,
                "confidence": confidence
            },
            tags=[item] # basic tag
        )
        
        if new_verdict == "pursue":
            # In a real scheduler, we'd set a timer here.
            # For now, we'll emit a "Followup Needed" check signal immediately for testing
            print(f"[DATE] Scheduled follow-up for {item} (mocked)")

    # Handler: USER_INTERACTION -> Adjust Importance
    async def handle_user_interaction(data):
        user_id = data.get("user_id")
        interaction_type = data.get("interaction_type")
        user_response = data.get("user_response")
        related_ids = data.get("related_memory_ids", [])
        
        if user_response == "acted":
            print(f"[GOOD] Boosting importance for memories: {related_ids}")
            for mem_id in related_ids:
                memory_service.update_memory_importance(mem_id, 0.1)
        elif user_response == "dismissed":
            print(f"[BAD] Reducing importance for memories: {related_ids}")
            for mem_id in related_ids:
                memory_service.update_memory_importance(mem_id, -0.05)

    # Handler: PATTERN_DETECTED -> Generate Advice
    from logic.advice_system import AdviceManager
    advice_manager = AdviceManager()
    
    async def handle_pattern_detected(data):
        user_id = data.get("user_id", "default")
        pattern = data.get("pattern", {})
        
        print(f"[ADVICE] Pattern found: {pattern.get('type')}")
        advice = advice_manager.process_pattern(user_id, pattern)
        
        if advice:
            print(f"[ADVICE] Advice Generated: {advice['text']}")
            
            # Emit internal event
            await event_manager.emit("ADVICE_READY", {
                "user_id": user_id,
                "advice": advice
            })
            
            # Broadcast to WebSocket
            from notifications.websocket import ws_manager
            await ws_manager.broadcast({
                "type": "advice",
                "data": advice
            })

    # Register handlers
    event_manager.on("JOURNAL_CREATED", handle_journal_created)
    event_manager.on("VERDICT_CHANGED", handle_verdict_changed)
    event_manager.on("USER_INTERACTION", handle_user_interaction)
    event_manager.on("PATTERN_DETECTED", handle_pattern_detected)
    
    print("[OK] Event handlers registered")
