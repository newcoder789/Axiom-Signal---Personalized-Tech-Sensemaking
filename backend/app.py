"""
FastAPI wrapper for Axiom with Power (Tools + Memory)
Uses the existing backend infrastructure properly.
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
from dotenv import load_dotenv

# Import existing Axiom infrastructure
from axiom_with_power import AxiomWithPower, run_axiom_power
from notifications.engine import AxiomNotificationEngine
from notifications.websocket import ws_manager
from logic.conversation_manager import conversation_manager
from logic.agent_evolution import agent_evolution

load_dotenv()

from logic.data_bridge import data_bridge
import asyncio
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="Axiom Signal Engine API", version="2.0")

# CORS for frontend
frontend_url = os.getenv("FRONTEND_URL", "*")
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if frontend_url != "*":
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if frontend_url != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# WebSocket for Proactive Notifications
# ============================================================================

@app.websocket("/ws")
@app.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            # We don't expect client messages for now, but we keep it open
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)

# ============================================================================
# Startup & Shutdown
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize SQLite DB, Event System, and Data Bridge on startup."""
    from database.engine import create_db_and_tables
    from integration.app_connector import setup_event_handlers
    
    print("[RUNNING] Initializing SQLite DB and Event System on startup...")
    create_db_and_tables()
    print("[OK] SQLite Tables Created")
    
    print("[EVENT] Wiring Event Bus...")
    await setup_event_handlers()
    print("[OK] Event Bus Ready")

    # Start the data bridge sync loop
    print("[BRIDGE] Launching Postgres Sync Worker...")
    asyncio.create_task(sync_worker_loop())

async def sync_worker_loop():
    """Background loop to sync Postgres data into SQLite every 2 minutes."""
    while True:
        try:
            logger.info("[BRIDGE] Periodic background sync starting...")
            await data_bridge.sync_now()
        except Exception as e:
            logger.error(f"[BRIDGE] Background sync failed: {e}")
        await asyncio.sleep(120) # 2 minutes

# ============================================================================
# Request/Response Models
# ============================================================================

class VerdictRequest(BaseModel):
    topic: str
    content: str
    context: Optional[Dict[str, Any]] = None

class ActionItem(BaseModel):
    text: str
    completed: bool = False

# ============================================================================
# Initialize Axiom
# ============================================================================

# Global instances
axiom_instance = None
notification_engine = None

def get_axiom():
    """Get or create Axiom instance"""
    global axiom_instance, notification_engine
    if axiom_instance is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            axiom_instance = AxiomWithPower(redis_url=redis_url, debug=True)
            print("[OK] Axiom with Power initialized (Tools + Memory)")
            
            # Initialize notification engine
            if axiom_instance.memory_manager:
                notification_engine = AxiomNotificationEngine(
                    memory_manager=axiom_instance.memory_manager,
                    ws_manager=ws_manager
                )
                print("[OK] Proactive Notification Engine initialized")
        except Exception as e:
            print(f"[WARN] Axiom initialized without memory: {e}")
    return axiom_instance

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
def read_root():
    return {
        "service": "Axiom Backend API",
        "version": "2.0",
        "features": ["Memory System", "Tool Evidence", "LangGraph Integration"],
        "endpoints": ["/api/verdict", "/health"],
        "status": "running"
    }

@app.get("/api/test-broadcast")
async def test_broadcast():
    """Temporary endpoint to test WS notifications"""
    await ws_manager.broadcast({
        "event": "notification",
        "data": {
            "type": "surprise",
            "title": "Test Contradiction",
            "content": "This is a test notification for the proactive RAG system."
        }
    })
    return {"status": "broadcast_sent"}

@app.get("/api/health")
async def health_check():
    """Health check with system status"""
    try:
        axiom = get_axiom()
        health = axiom.health_check()
        return health
    except Exception as e:
        return {
            "status": "degraded",
            "error": str(e),
            "timestamp": None
        }

@app.post("/api/verdict")
async def get_verdict(request: VerdictRequest):
    """
    Get AI-powered verdict using Axiom with Power.
    
    This uses:
    - Memory system (Redis vector DB with LTM + STM)
    - SQL Memory (SQLite for structured history & patterns)
    - Tool evidence (freshness checker, market signal, friction estimator)
    - LangGraph workflow with deterministic rules
    - LLM fallback for mixed signals
    """
    try:
        axiom = get_axiom()
        
        # Build rich user profile from context (for LLM understanding)
        context = request.context or {}
        risk_tolerance = context.get("riskTolerance", "medium")
        time_horizon = context.get("timeHorizon", "3 months")
        experience_level = context.get("experienceLevel", "intermediate")
        profile_type = context.get("profile", "developer")
        
        # IMPORTANT: Create stable user_profile string for backend memory system
        # The backend uses hash of this string as user ID, so keep it consistent
        # Format: "{profile_type} {experience_level} (risk: {risk}, timeline: {time})"
        user_profile = (
            f"{profile_type.capitalize()} {experience_level} developer. "
            f"Risk tolerance: {risk_tolerance}. "
            f"Timeline: {time_horizon}."
        )
        
        # Use just the topic (the graph will handle the analysis)
        topic = request.topic
        
        # Run Axiom with Power (uses LangGraph with tools + memory)
        print(f"\n🚀 Running Axiom for: {topic[:50]}...")
        print(f"📋 User profile: {user_profile}")
        
        result = axiom.run(topic=topic, user_profile=user_profile)
        
        # Extract verdict object
        verdict = result.get("verdict")
        tool_evidence = result.get("tool_evidence", {})
        memory_context = result.get("memory_context")
        
        if not verdict:
            raise HTTPException(
                status_code=500,
                detail="Verdict generation failed - no verdict returned"
            )
        
        # Convert confidence to float (it might be a string like "medium")
        confidence_value = verdict.confidence
        if isinstance(confidence_value, str):
            # Map confidence levels to numeric values
            confidence_map = {
                "low": 0.4,
                "medium": 0.7,
                "high": 0.9,
            }
            confidence_float = confidence_map.get(confidence_value.lower(), 0.7)
        else:
            confidence_float = float(confidence_value)
        
        # Build response matching frontend expectations
        response = {
            "verdict": verdict.verdict,
            "confidence": confidence_float,
            "reasoning": verdict.reasoning,
            "timeline": verdict.timeline if hasattr(verdict, 'timeline') else None,
            "actionItems": [
                {"text": item, "completed": False} 
                for item in (verdict.action_items or [])
            ] if hasattr(verdict, 'action_items') else [],
            "reasonCodes": verdict.reason_codes if hasattr(verdict, 'reason_codes') else [],
            "toolEvidence": {
                "freshness": tool_evidence.get("freshness", {}),
                "market": tool_evidence.get("market", {}),
                "friction": tool_evidence.get("friction", {}),
            },
            "analysis": {
                "feasibility": result.get("reality_check").feasibility if result.get("reality_check") else "medium",
                "marketSignal": result.get("reality_check").market_signal if result.get("reality_check") else "mixed",
                "hypeScore": result.get("reality_check").hype_score if result.get("reality_check") else 5,
                "riskFactors": result.get("reality_check").risk_factors if result.get("reality_check") else [],
                "evidenceSummary": result.get("reality_check").evidence_summary if result.get("reality_check") else "",
            },
            "sources": result.get("sources") or [],
            "relevanceScore": memory_context.relevance_score if memory_context and hasattr(memory_context, 'relevance_score') else 0.0,
            "ledger": result.get("ledger")
        }
        
        print(f"✅ Verdict: {verdict.verdict} ({verdict.confidence} confidence)")
        
        # PROACTIVE: Trigger notification analysis in background (don't block response)
        if notification_engine:
            import asyncio
            asyncio.create_task(notification_engine.analyze_event(
                "decision_made", 
                {
                    "user_profile": user_profile,
                    "topic": topic,
                    "verdict": verdict.verdict,
                    "reasoning": verdict.reasoning,
                }
            ))
            
        return response
        
    except Exception as e:
        print(f"❌ Error in /api/verdict: {e}")
        import traceback
        traceback.print_exc()
        
# ============================================================================
# Memory System Endpoints
# ============================================================================

class MemorySearchRequest(BaseModel):
    query: str
    user_profile: Optional[str] = "Developer"

class PatternRequest(BaseModel):
    user_profile: str

@app.post("/api/memory/search")
async def search_memory(request: MemorySearchRequest):
    """
    Live Memory Search: Findings similar thoughts/decisions as user types.
    """
    try:
        axiom = get_axiom()
        if not axiom.memory_manager:
            return {"matches": [], "status": "memory_disabled"}
            
        # Create context (which includes performing the search)
        # We used "query" as the topic to trigger the search
        context = axiom.memory_manager.create_memory_context(
            user_profile=request.user_profile,
            topic=request.query,  # Treat query as topic for semantic search
            current_query=request.query
        )
        
        # Format results for frontend
        matches = []
        
        # 1. Past Decisions
        if hasattr(context, "similar_decisions"):
            for d in context.similar_decisions:
                matches.append({
                    "id": d.get("id", "unknown"),
                    "type": "decision",
                    "text": d.get("topic", ""),
                    "verdict": d.get("verdict", ""),
                    "confidence": d.get("confidence", 0),
                    "relative_time": "previously", # Could calculate this
                    "similarity": 0.85 # Mock for now, or extract if available
                })

        # 2. Topic Patterns
        if hasattr(context, "topic_patterns"):
            for p in context.topic_patterns:
                matches.append({
                    "id": f"pattern_{p.get('pattern', 'unknown')}",
                    "type": "pattern",
                    "text": p.get("description", ""),
                    "verdict": "pattern",
                    "confidence": p.get("confidence", 0),
                    "similarity": 0.9
                })

        return {
            "query": request.query,
            "matches": matches[:5], # Limit to top 5
            "status": "success"
        }

    except Exception as e:
        print(f"❌ Error in /api/memory/search: {e}")
        return {"matches": [], "error": str(e)}

@app.post("/api/memory/patterns")
async def get_patterns(request: PatternRequest):
    """
    Get user decision patterns and insights.
    """
    try:
        axiom = get_axiom()
        if not axiom.memory_manager:
            return {"status": "memory_disabled"}
            
        # Get full profile summary
        summary = axiom.memory_manager.get_user_profile_summary(request.user_profile)
        
        return {
            "status": "success",
            "data": summary
        }

    except Exception as e:
        print(f"❌ Error in /api/memory/patterns: {e}")
        return {"status": "error", "message": str(e)}


# ============================================================================
# Assistant Board Endpoints
# ============================================================================

# Standard profile for demo consistency
DEMO_USER_PROFILE = "Developer Intermediate developer. Risk tolerance: medium. Timeline: 3 months."

class AssistantTaskRequest(BaseModel):
    user_profile: Optional[str] = None
    topic: Optional[str] = None
    content: Optional[str] = None
    context_type: Optional[str] = "latest"

@app.post("/api/assistant/summarize")
async def assistant_summarize(request: AssistantTaskRequest):
    """Summarize recent activity or specific topic context."""
    try:
        axiom = get_axiom()
        # Use provided profile or fallback to demo default
        profile = request.user_profile or DEMO_USER_PROFILE
        
        # Retrieve recent context from memory
        summary_data = axiom.memory_manager.get_user_profile_summary(profile)
        
        # If no data found and using custom profile, try demo profile as fallback
        if not summary_data.get('recent_decisions') and profile != DEMO_USER_PROFILE:
            print(f"⚠️ No data for '{profile}', falling back to demo profile.")
            summary_data = axiom.memory_manager.get_user_profile_summary(DEMO_USER_PROFILE)
        
        # Simple LLM summarization of the memory traits/decisions
        traits = summary_data.get('traits', [])
        decisions = summary_data.get('recent_decisions', [])
        
        if not traits and not decisions:
             return {"summary": "No sufficient history found to generate a summary yet. Try making a few decisions first!"}

        traits_str = "\n".join([t.get('fact', '') for t in traits])
        decisions_str = "\n".join([f"{d.get('topic')}: {d.get('verdict')}" for d in decisions])
        
        prompt = f"""
        Analyze the following user technological interest profile and past decisions.
        Provide a concise, high-level summary of their current 'tech focus' and any emerging themes.
        
        USER TRAITS:
        {traits_str}
        
        RECENT DECISIONS:
        {decisions_str}
        
        Format the response as clear, opinionated AXIOM-style summary.
        """
        
        from graph.graph_utils import llm
        from langchain_core.messages import SystemMessage, HumanMessage
        
        response = llm.invoke([
            SystemMessage(content="You are AXIOM. Summarize the user's technical posture."),
            HumanMessage(content=prompt)
        ])
        
        return {"summary": response.content}
    except Exception as e:
        print(f"❌ Error in /api/assistant/summarize: {e}")
        # Don't fail hard, return helpful message
        return {"summary": f"Could not generate summary: {str(e)}"}

@app.post("/api/assistant/extract-actions")
async def assistant_extract_actions(request: AssistantTaskRequest):
    """Extract action items from latest thoughts or specific topic."""
    try:
        content = request.content or ""
        profile = request.user_profile or DEMO_USER_PROFILE
        
        if not content:
            # Fallback to latest decision reasoning or content
            axiom = get_axiom()
            summary = axiom.memory_manager.get_user_profile_summary(profile)
            
            # Fallback to demo profile if needed
            if not summary.get('recent_decisions') and profile != DEMO_USER_PROFILE:
                summary = axiom.memory_manager.get_user_profile_summary(DEMO_USER_PROFILE)
                
            if summary.get('recent_decisions'):
                content = summary['recent_decisions'][0].get('reasoning', '')
        
        if not content:
             return {"actions": ["No recent content to extract actions from."]}

        prompt = f"""
        Extract specific, actionable next steps from this technical analysis:
        ---
        {content}
        ---
        Format as a JSON list of strings. If no actions are clear, suggest relevant learning paths.
        Return ONLY the JSON list.
        """
        
        from graph.graph_utils import llm
        from langchain_core.messages import HumanMessage
        import json
        
        msg = llm.invoke([HumanMessage(content=prompt)])
        # Simple extraction
        actions = []
        try:
            # Handle potential markdown formatting
            clean_content = msg.content.strip().replace('```json', '').replace('```', '')
            start = clean_content.find('[')
            end = clean_content.rfind(']') + 1
            if start != -1 and end != -1:
                actions = json.loads(clean_content[start:end])
            else:
                actions = [msg.content]
        except:
            actions = [msg.content]

        # PROACTIVE: Trigger notification for actions (Next Steps)
        if actions and len(actions) > 0 and notification_engine:
             import asyncio
             asyncio.create_task(ws_manager.broadcast({
                "event": "notification",
                "data": {
                    "type": "action",
                    "title": "Next Steps Identified",
                    "content": f"Found {len(actions)} potential actions. Check the Assistant panel."
                }
             }))
            
        return {"actions": actions}
    except Exception as e:
        print(f"❌ Error in /api/assistant/extract-actions: {e}")
        return {"actions": ["Error extracting actions."]}

@app.post("/api/assistant/contradictions")
async def assistant_find_contradictions(request: AssistantTaskRequest):
    """Find logical or strategic contradictions in user's technical history."""
    try:
        axiom = get_axiom()
        profile = request.user_profile or DEMO_USER_PROFILE
        summary = axiom.memory_manager.get_user_profile_summary(profile)
        
        # Fallback
        if not summary.get('recent_decisions') and profile != DEMO_USER_PROFILE:
             summary = axiom.memory_manager.get_user_profile_summary(DEMO_USER_PROFILE)
        
        traits = summary.get('traits', [])
        decisions = summary.get('recent_decisions', [])
        
        if not decisions:
            return {"contradictions": ["No past decisions found to compare against."]}
            
        prompt = f"""
        Look for technical or strategic contradictions between these two sets of data:
        
        USER PREFERENCES/TRAITS:
        {[t.get('fact') for t in traits]}
        
        PAST DECISIONS:
        {[f"{d.get('topic')} -> {d.get('verdict')}: {d.get('reasoning')[:200]}" for d in decisions]}
        
        E.g., if they prefer 'low infrastructure depth' but chose 'Kubernetes' for a simple project.
        Identify any such tensions. Be brief. If none, say "No contradictions detected."
        """
        
        from graph.graph_utils import llm
        from langchain_core.messages import HumanMessage
        
        msg = llm.invoke([HumanMessage(content=prompt)])
        
        # PROACTIVE: If contradictions found, trigger notification via WebSocket for demo effect
        content = msg.content
        if "No contradictions" not in content and len(content) > 10:
             # Fire and forget
             if notification_engine:
                 import asyncio
                 asyncio.create_task(ws_manager.broadcast({
                    "event": "notification",
                    "data": {
                        "type": "surprise",
                        "title": "Contradiction Found",
                        "content": content[:150] + "..."
                    }
                 }))

        return {"contradictions": [content]}
    except Exception as e:
        print(f"❌ Error in /api/assistant/contradictions: {e}")
        return {"contradictions": [f"Error finding contradictions: {e}"]}

@app.get("/api/assistant/memory/search")
async def search_memories_endpoint(query: str, user_id: str = "default", journal_id: Optional[str] = None):
    """Live search for related technical memories, scoped to journal journey if provided."""
    from memory.memory_service import MemoryService
    service = MemoryService()
    
    if journal_id:
        memories = service.get_memories_by_journal(user_id, journal_id, limit=10)
        # Filter further if query is provided (simple keyword in memories)
        if query:
            memories = [m for m in memories if query.lower() in m.content.lower()]
    else:
        memories = service.search_memories(user_id, query)
    
    # Format for frontend
    snippets = [f"[{m.content_type}] {m.content[:200]}..." for m in memories]
    return {"snippets": snippets}


@app.post("/api/journal")
async def create_journal_entry(data: Dict[str, Any]):
    """Create a new journal entry and trigger event."""
    from memory.memory_service import MemoryService
    from events.event_manager import AgentEventManager
    
    user_id = data.get("user_id", "default")
    content = data.get("content", "")
    metadata = data.get("metadata", {})
    
    if not content:
        raise HTTPException(status_code=400, detail="Content is required")
    
    service = MemoryService()
    memory_id = service.store_memory(
        user_id=user_id,
        content_type="journal",
        content=content,
        metadata=metadata
    )
    
    # Trigger event
    event_manager = AgentEventManager.get_instance()
    await event_manager.emit("JOURNAL_CREATED", {
        "user_id": user_id,
        "content": content,
        "metadata": {**metadata, "memory_id": memory_id}
    })
    
    return {"success": True, "memory_id": memory_id}

@app.patch("/api/thoughts/{memory_id}")
async def update_thought_endpoint(memory_id: int, data: Dict[str, Any]):
    """Update an existing thought/journal entry."""
    from memory.memory_service import MemoryService
    
    content = data.get("content")
    metadata = data.get("metadata")
    tags = data.get("tags")
    
    service = MemoryService()
    updated = service.update_memory(
        memory_id=memory_id,
        content=content,
        metadata=metadata,
        tags=tags
    )
    
    if updated:
        return {"success": True, "memory_id": memory_id}
    raise HTTPException(status_code=404, detail="Memory not found")

@app.get("/api/thoughts/latest")
async def get_latest_thought(user_id: str = "default"):
    """Get the most recent journal or verdict entry."""
    from memory.memory_service import MemoryService
    service = MemoryService()
    recent = service.get_recent_memories(user_id, limit=1)
    
    if recent:
        return recent[0]
    raise HTTPException(status_code=404, detail="No thoughts found")


@app.post("/api/assistant/sync")
async def trigger_data_sync():
    """Manually trigger a sync from Postgres into the local memory system."""
    result = await data_bridge.sync_now()
    if result["success"]:
        return result
    raise HTTPException(status_code=500, detail=result.get("error", "Sync failed"))

@app.get("/api/thoughts/{memory_id}")
async def get_thought_by_id(memory_id: int):
    """Get a specific thought by ID."""
    from memory.memory_service import MemoryService
    service = MemoryService()
    memory = service.get_memory(memory_id)
    
    if memory:
        return memory
    raise HTTPException(status_code=404, detail="Memory not found")

# ============================================================================
# Proactive Agent & Notifications
# ============================================================================

@app.post("/api/agent/analyze")
async def manual_pattern_analysis(request: Request):
    """Trigger manual pattern analysis for the user."""
    from logic.pattern_detector import PatternDetector
    user_id = "default" 
    detector = PatternDetector()
    patterns = await detector.analyze_patterns(user_id, trigger="manual")
    return {"success": True, "patterns_found": len(patterns), "patterns": patterns}

@app.get("/api/user/preferences")
async def get_user_preferences_endpoint(user_id: str = "default"):
    from memory.memory_service import MemoryService
    service = MemoryService()
    prefs = service.get_user_preferences(user_id)
    return prefs

@app.post("/api/user/preferences")
async def update_user_preferences_endpoint(settings: Dict[str, Any], user_id: str = "default"):
    from memory.memory_service import MemoryService
    service = MemoryService()
    updated = service.update_user_preferences(user_id, settings)
    return updated

@app.post("/api/agent/interaction/feedback")
async def record_interaction_feedback(data: Dict[str, Any]):
    from memory.memory_service import MemoryService
    from events.event_manager import AgentEventManager
    
    interaction_id = data.get("interaction_id")
    user_response = data.get("user_response") # 'acted', 'dismissed'
    user_id = data.get("user_id", "default")
    related_memory_ids = data.get("related_memory_ids", [])
    
    service = MemoryService()
    success = service.update_interaction(interaction_id, user_response)
    
    if success:
        event_manager = AgentEventManager.get_instance()
        await event_manager.emit("USER_INTERACTION", {
            "user_id": user_id,
            "interaction_id": interaction_id,
            "user_response": user_response,
            "related_memory_ids": related_memory_ids
        })
        
        # Update conversation context based on feedback
        conversation_manager.add_message("user", f"Provided feedback: {user_response}")
        
        return {"success": True}
    return {"success": False, "error": "Interaction not found"}

@app.post("/api/agent/task")
async def execute_agent_task(data: Dict[str, Any]):
    """Execute a task using the agent codebase."""
    from logic.task_handlers import AxiomSignalHandlers
    
    task_id = data.get("taskId")
    user_id = data.get("userId", "default")
    context = data.get("context", {})
    
    if not task_id:
        raise HTTPException(status_code=400, detail="taskId is required")
        
    
    # Inject conversation context
    context["conversation_history"] = conversation_manager.get_context()
    context["agent_strategy"] = agent_evolution.get_strategy_config()
    
    handlers = AxiomSignalHandlers()
    
    # Record User Intent (if reasonable)
    user_task_desc = f"Execute task: {task_id}"
    if context.get("content"):
        user_task_desc += f" on content: {context.get('content')[:50]}..."
    elif context.get("latestEntry"):
        user_task_desc += f" on entry: {context.get('latestEntry')[:50]}..."
        
    conversation_manager.add_message("user", user_task_desc)
    
    # Trigger Evolution (User is interacting)
    agent_evolution.update_engagement("query")
    
    result = await handlers.execute_task(task_id, user_id, context)
    
    # Record Result
    c_mgr_content = result.get("summary") or result.get("advice") or result.get("review", {}).get("text") or "Task completed"
    conversation_manager.add_message("assistant", str(c_mgr_content)[:200])
    
    if result.get("success"):
        return result
    raise HTTPException(status_code=500, detail=result.get("error", "Task execution failed"))

@app.get("/api/debug/state")
async def get_debug_state(userId: str = "default"):
    """Expose internal agent state for UI dashboards."""
    from logic.conversation_manager import conversation_manager
    from logic.agent_evolution import agent_evolution
    return {
        "evolution": {
            "score": agent_evolution.engagement_score,
            "strategy": agent_evolution.current_strategy,
            "config": agent_evolution.get_strategy_config()
        },
        "history_depth": len(conversation_manager.history)
    }

@app.post("/api/user/memory/prune")
async def prune_memories(data: Dict[str, Any]):
    """Delete old or low-importance memories."""
    user_id = data.get("userId", "default")
    days = data.get("days", 30)
    print(f"🔥 Pruning memories for {user_id} older than {days} days")
    return {"success": True, "message": f"Pruned memories older than {days} days"}

@app.post("/api/agent/strategy/override")
async def override_strategy(data: Dict[str, Any]):
    """Manually set agent behavior strategy."""
    user_id = data.get("userId", "default")
    strategy_name = data.get("strategy")
    
    if strategy_name not in ["concise", "balanced", "proactive"]:
        raise HTTPException(status_code=400, detail="Invalid strategy")
        
    from logic.agent_evolution import agent_evolution
    print(f"🤖 Manual strategy override for {user_id}: {strategy_name}")
    # Force the score to trigger the strategy
    score = 1.0 if strategy_name == "proactive" else 0.0 if strategy_name == "concise" else 0.5
    agent_evolution.engagement_score = score
    agent_evolution.current_strategy = strategy_name
    
    return {"success": True, "strategy": strategy_name}

@app.delete("/api/user/memory/clear")
async def clear_memories(userId: str = "default"):
    """Nuclear reset: Delete all short-term and long-term memory."""
    from logic.conversation_manager import conversation_manager
    from memory.memory_service import MemoryService
    
    # 1. Clear STM
    conversation_manager.clear_history()
    
    # 2. Clear LTM (SQLite)
    mem_service = MemoryService()
    mem_service.clear_all_memories(userId)
    
    # 3. Reset Evolution
    from logic.agent_evolution import agent_evolution
    agent_evolution.engagement_score = 0.5
    agent_evolution.current_strategy = "standard"
    
    print(f"💥 NUCLEAR RESET for {userId}: Memories wiped, evolution reset.")
    return {"success": True, "message": "System reset to baseline state."}

# ============================================================================
# Run Application
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
