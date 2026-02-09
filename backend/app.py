"""
FastAPI wrapper for Axiom with Power (Tools + Memory)
Uses the existing backend infrastructure properly.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
from dotenv import load_dotenv

# Import existing Axiom infrastructure
from axiom_with_power import AxiomWithPower, run_axiom_power

load_dotenv()

app = FastAPI(title="Axiom Backend API", version="2.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Global instance (initialized once)
axiom_instance = None

def get_axiom():
    """Get or create Axiom instance"""
    global axiom_instance
    if axiom_instance is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            axiom_instance = AxiomWithPower(redis_url=redis_url, debug=True)
            print("✅ Axiom with Power initialized (Tools + Memory)")
        except Exception as e:
            print(f"⚠️  Axiom initialized without memory: {e}")
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

@app.get("/health")
def health_check():
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
# Run with: python -m uvicorn app:app --reload
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)