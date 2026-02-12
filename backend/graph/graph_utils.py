"""
Axiom v0 - LangGraph Pipeline with Memory Integration
5-node decision pipeline: Memory Context → Signal Framing → Reality Check → Verdict Synthesis → Memory Store

Memory integration status: Full LTM/STM cycle implemented
"""

from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field
from typing import Optional, Literal, Any, Dict, List
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from dotenv import load_dotenv
import os
import sys
from opik import track
from opik.integrations.langchain import OpikTracer
from opik import opik_context
import hashlib
try:
    from redis.commands.search.query import Query
except (ImportError, ModuleNotFoundError):
    class Query:
        def __init__(self, *args, **kwargs): pass
        def sort_by(self, *args, **kwargs): return self
        def limit_fields(self, *args, **kwargs): return self
        def paging(self, *args, **kwargs): return self
        def dialect(self, *args, **kwargs): return self
from tools.orchestrator import ToolOrchestrator
from pathlib import Path
from langsmith.run_trees import RunTree

# 🩹 PATCH: Resolve Pydantic V2 compatibility issue with Opik/LangSmith
# Error: `RunTree` is not fully defined; you should define `Path`...
try:
    RunTree.model_rebuild()
except Exception as e:
    print(f"⚠️ Opik Patch Warning: {e}")

load_dotenv()

# Add parent directory to path for memory imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import memory system
try:
    from memory.manager import AxiomMemoryManager
    from memory.schemas import MemoryContext
    from memory.integration import enhance_verdict_prompt

    MEMORY_AVAILABLE = True  
    print("[OK] Memory system loaded successfully")
except ImportError as e:
    print(f"[WARN] Memory system not available: {e}")
    MEMORY_AVAILABLE = False

    # Create dummy classes for fallback
    class MemoryContext:
        """Dummy MemoryContext for type hints when memory system is unavailable."""
        user_traits = []
        topic_patterns = []
        similar_decisions = []
        def to_prompt_string(self):
            return "No relevant memories found."

    class AxiomMemoryManager:
        def __init__(self, *args, **kwargs):
            pass

        def get_memory_context(self, *args, **kwargs):
            return MemoryContext()

        def process_verdict(self, *args, **kwargs):
            return {"memory_stored": False}

    def enhance_verdict_prompt(base_prompt, memory_context):
        return base_prompt

# ============================================================================
# PYDANTIC MODELS (Output Schemas)
# ============================================================================


class SignalFramingOutput(BaseModel):
    """Output schema for Node 1: Signal Framing"""

    status: Literal["ok", "insufficient_signal"] = Field(
        ..., description="Whether the topic has enough clear public framing"
    )
    signal_summary: Optional[str] = Field(
        None,
        description="Neutral description of what the topic claims to be or is commonly described as",
    )
    domain: Optional[
        Literal["frontend", "backend", "AI/ML", "DevOps", "database", "systems"]
    ] = Field(None, description="Technical domain classification")
    time_horizon: Optional[Literal["short", "medium", "long"]] = Field(
        None,
        description="Maturity level: short (<1yr), medium (1-3yr), long (3+yr), Use null if unclear.",
    )
    confidence_level: Optional[Literal["low", "medium", "high"]] = Field(
        None, description="Confidence in understanding what the topic is"
    )
    user_context_summary: str = Field(
        ..., description="Extract key facts: role, skill level, goals"
    )


class RealityCheckOutput(BaseModel):
    """Output schema for Node 2: Reality Check"""

    feasibility: Literal["low", "medium", "high"] = Field(
        "medium", description="How feasible is this for the user's background"
    )
    market_signal: Literal["weak", "mixed", "strong"] = Field(
        "mixed", description="Community/market adoption signal strength", 
    )
    risk_factors: list[str] = Field(
        ..., description="2-4 specific risks or concerns"
    )
    known_unknowns: list[str] = Field(
        default_factory=list,
        description="0-3 things we don't know but should",
        max_length=3,
    )
    hype_score: int = Field(
        ..., description="0-10 where 10 = maximum hype", ge=0, le=10
    )
    evidence_summary: str = Field(
        ..., description="What signals were used to assess this"
    )
    sources: list[dict] = Field(
        default_factory=list,
        description="2-3 high-quality source links. Each source MUST have: title, url, snippet, domain, and date."
    )
    
    # Decision Ledger Buckets (Flattened for better LLM adherence)
    ledger_context: list[str] = Field(..., description="User-specific anchoring facts (Chips)")
    ledger_market_signals: list[dict] = Field(..., description="Scored metrics (0-10) with labels")
    ledger_trade_offs: dict[str, list[str]] = Field(..., description="Explicit 'gains' and 'costs' lists")
    ledger_anchors: list[str] = Field(..., description="Frozen claims for future reassessment")


# Verdict bucket: watchlist = "Model unsure, signals emerging, do NOT decay or upgrade yet"
VERDICT_LITERAL = Literal["pursue", "explore", "watchlist", "ignore"]


class VerdictOutput(BaseModel):
    """Output schema for Node 3: Verdict Synthesis"""

    verdict: VERDICT_LITERAL = Field(
        ..., description="Decision: pursue, explore, watchlist (uncertain), or ignore"
    )
    reasoning: str = Field(
        ..., description="A detailed, conversational explanation (4-6 sentences) of why this verdict was reached. Be precise, evidence-based, and addressed directly to the user."
    )
    action_items: list[str] = Field(
        ..., description="2-4 specific, testable next steps", min_length=2, max_length=4
    )
    timeline: Literal["now", "in 3 months", "wait 6+ months", "re-evaluate in 3 months"] = Field(
        ..., description="When to act on this"
    )
    confidence: Literal["low", "medium", "high"] = Field(
        ..., description="Confidence in this verdict"
    )


class AxiomState(BaseModel):
    """State that flows through the entire pipeline with memory"""

    topic: str
    user_profile: str
    signal: Optional[SignalFramingOutput] = None
    reality_check: Optional[RealityCheckOutput] = None
    verdict: Optional[VerdictOutput] = None
    sources: list[dict] = Field(default_factory=list)
    tool_evidence: Dict[str, Any] = Field(default_factory=dict)
    ledger: Optional[dict] = None

    # Memory fields
    memory_context: Optional[Dict[str, Any]] = None
    memory_hints: Optional[str] = None
    memory_relevance_score: Optional[float] = None

    # Alignment metrics
    signal_evidence_alignment: Optional[float] = None
    evidence_verdict_alignment: Optional[float] = None
    chain_coherence_score: Optional[float] = None
    contract_violation: Optional[bool] = False
    violations: list[str] = Field(default_factory=list)  # FIXED: Use Field with default_factory for proper initialization

    # Sensemaking: model prior vs external reality (Step 1)
    # When True, model said "weak/insufficient" but market/feasibility suggest otherwise → do NOT downgrade to ignore
    knowledge_gap: bool = False


# ============================================================================
# LLM SETUP
# ============================================================================

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.7,
)

# Memory manager (singleton)
_memory_manager = None


def get_memory_manager():
    """Get or create memory manager instance"""
    global _memory_manager
    if _memory_manager is None and MEMORY_AVAILABLE:
        try:
            _memory_manager = AxiomMemoryManager(
                redis_url=os.getenv("REDIS_URL", "redis://localhost:6379")
            )
            print("[MEMORY] Memory manager initialized")
        except Exception as e:
            print(f"[WARN] Failed to initialize memory manager: {e}")
            _memory_manager = None
    return _memory_manager


def derive_user_id(user_profile: str) -> str:
    """Derive stable user ID from profile"""
    profile_hash = hashlib.sha256(user_profile.encode()).hexdigest()[:8]
    return f"user_{profile_hash}"
    # return "user_id_Byomkesh_Bakshi"

def calculate_memory_relevance(memory_context) -> float:
    """
    Calculate relevance score for memory context (0-1).
    
    Edge cases handled:
    - None/empty memory_context → 0.0
    - Division by zero protection (weight == 0) → 0.0
    - Missing attributes → gracefully handled
    - Empty lists → weight not added, preventing division issues
    """
    if not memory_context:
        return 0.0

    relevance = 0.0
    weight = 0.0

    # Score based on number of relevant memories
    # Only add weight if list exists AND has items (prevents division by zero)
    if hasattr(memory_context, "user_traits") and memory_context.user_traits:
        trait_count = len(memory_context.user_traits) if isinstance(memory_context.user_traits, list) else 0
        if trait_count > 0:
            relevance += min(trait_count * 0.2, 0.4)
            weight += 0.4

    if hasattr(memory_context, "topic_patterns") and memory_context.topic_patterns:
        pattern_count = len(memory_context.topic_patterns) if isinstance(memory_context.topic_patterns, list) else 0
        if pattern_count > 0:
            relevance += min(pattern_count * 0.3, 0.4)
            weight += 0.4

    if (
        hasattr(memory_context, "similar_decisions")
        and memory_context.similar_decisions
    ):
        decision_count = len(memory_context.similar_decisions) if isinstance(memory_context.similar_decisions, list) else 0
        if decision_count > 0:
            relevance += min(decision_count * 0.1, 0.2)
            weight += 0.2

    # FIXED: Explicit check to prevent division by zero
    if weight > 0:
        score = round(relevance / weight, 2)
        print(f"memory reference is being calculated as: {relevance}/{weight} = {score}")
        return score
    return 0.0


# ============================================================================
# NODE 0: MEMORY CONTEXT LOADER
# ============================================================================

# ============================================================================
# NODE 0: MEMORY CONTEXT LOADER (WITH DEBUGGING)
# ============================================================================


def memory_context_node(state: AxiomState) -> AxiomState:
    """Node 0: Load relevant memories BEFORE analysis"""

    # Initialize memory manager if available
    memory_manager = get_memory_manager()

    if not MEMORY_AVAILABLE or memory_manager is None:
        state.memory_hints = "Memory system not available"
        state.memory_relevance_score = 0.0
        state.memory_context = {}
        print("⚠️ Memory system not available")
        return state

    try:
        # Debug: Show what we're searching for
        user_id = derive_user_id(state.user_profile)
        print("🔍 Searching memories for:")
        print(f"   User ID: {user_id}")
        print(f"   Topic: {state.topic}")
        print(f"   User Profile: {state.user_profile[:50]}...")

        # Load memory context
        memory_context = memory_manager.create_memory_context(
            user_profile=state.user_profile,
            topic=state.topic,
            current_query=f"{state.topic} for {state.user_profile}",
        )

        # Debug: Show what we found
        # FIXED: Add null safety checks for memory_context attributes
        print("📦 Memory context found:")
        trait_count = len(memory_context.user_traits) if hasattr(memory_context, "user_traits") and memory_context.user_traits else 0
        pattern_count = len(memory_context.topic_patterns) if hasattr(memory_context, "topic_patterns") and memory_context.topic_patterns else 0
        decision_count = len(memory_context.similar_decisions) if hasattr(memory_context, "similar_decisions") and memory_context.similar_decisions else 0
        
        print(f"   User traits: {trait_count}")
        print(f"   Topic patterns: {pattern_count}")
        print(f"   Similar decisions: {decision_count}")

        # Show details of what was found
        if hasattr(memory_context, "similar_decisions") and memory_context.similar_decisions:
            print("   Recent decisions:")
            try:
                for i, decision in enumerate(memory_context.similar_decisions[:3]):
                    if isinstance(decision, dict):
                        print(
                            f"     {i + 1}. {decision.get('topic', 'N/A')} -> {decision.get('verdict', 'N/A')}"
                        )
            except (TypeError, AttributeError) as e:
                print(f"     ⚠️  Error displaying decisions: {e}")

        # Store in state
        # FIXED: Better error handling for state storage
        try:
            state.memory_context = (
                memory_context.__dict__ if hasattr(memory_context, "__dict__") else {}
            )
            state.memory_hints = memory_context.to_prompt_string() if hasattr(memory_context, "to_prompt_string") else "No relevant memories found."
        except (AttributeError, TypeError) as e:
            print(f"⚠️  Error storing memory context: {e}")
            state.memory_context = {}
            state.memory_hints = "Error loading memory context"

        # Calculate relevance score
        try:
            state.memory_relevance_score = calculate_memory_relevance(memory_context)
            print(f"🧠 Memory relevance score: {state.memory_relevance_score}")
        except Exception as e:
            print(f"⚠️  Error calculating memory relevance: {e}")
            state.memory_relevance_score = 0.0

    except Exception as e:
        print(f"[WARN] Error loading memory context: {e}")
        import traceback
        traceback.print_exc()
        # FIXED: Ensure state is always in valid state even on error
        state.memory_hints = "Error loading memory context"
        state.memory_relevance_score = 0.0
        state.memory_context = {}

    return state


# ============================================================================
# NODE 1: SIGNAL FRAMING (Memory-Informed)
# ============================================================================

SIGNAL_FRAMING_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are a technical signal parser.

Your task is to STRUCTURE how a topic is commonly framed in public technical discourse.
You are NOT allowed to invent facts, consensus, or maturity.

If the topic is unclear, niche, contradictory, or unknown:
- You MUST say so explicitly.
- Set status = "insufficient_signal" and leave other fields null.

CRITICAL RULES:
1. Do NOT verify truth. Only reflect common framing.
2. Use hedged language: "commonly described as", "appears to be", "is presented as"
3. If public understanding is weak or fragmented, state that clearly.
4. If you cannot confidently categorize something, mark it as "unclear".
5. Do NOT upgrade uncertainty into confidence.
6. Do NOT infer intent or use-cases beyond what is commonly stated.

Required output fields (must always be present in JSON):
- status: "ok" or "insufficient_signal"
- signal_summary: string or null
- domain: one of ["frontend","backend","AI/ML","DevOps","database","systems"] or null
- time_horizon: "short","medium","long" or null
- confidence_level: "low","medium","high" or null
- user_context_summary: string (summarize how this relates to the user profile)

signal_summary rules:
- May ONLY paraphrase common descriptions
- MUST include uncertainty if present
- MUST NOT introduce new technical claims

time_horizon rules:
If you cannot determine time_horizon with confidence, set it to null (not "unclear").


If the topic appears invented, hyped without substance, or poorly defined:
- Say that explicitly in signal_summary.
- Set status = "insufficient_signal"

Return ONLY valid JSON matching the schema.
No markdown. No commentary.
{format_instructions}""",
        ),
        (
            "human",
            """Topic: {topic}
User Profile: {user_profile}
Memory context: {memory_context}

Extract and categorize this signal.""",
        ),
    ]
)


def signal_framing_node(state: AxiomState) -> AxiomState:
    """Node 1: Parse and categorize the signal (memory-informed)"""
    parser = JsonOutputParser(pydantic_object=SignalFramingOutput)
    chain = SIGNAL_FRAMING_PROMPT | llm | parser

    # Escape braces in format_instructions to avoid accidental template parsing
    fi = parser.get_format_instructions().replace("{", "{{").replace("}", "}}")

    # FIXED: Add comprehensive error handling for LLM invocation
    try:
        result = chain.invoke(
            {
                "topic": state.topic or "",
                "user_profile": state.user_profile or "",
                "format_instructions": fi,
                "memory_context": state.memory_hints or "No relevant memories found.",
            }
        )
    except Exception as e:
        print(f"⚠️  Error in signal_framing LLM invocation: {e}")
        import traceback
        traceback.print_exc()
        # FIXED: Provide safe fallback result on error
        result = {
            "status": "insufficient_signal",
            "signal_summary": None,
            "domain": None,
            "time_horizon": None,
            "confidence_level": "low",
            "user_context_summary": f"Error during signal analysis: {str(e)[:100]}",
        }

    # FIXED: Validate and set defaults before creating SignalFramingOutput
    result.setdefault("status", "insufficient_signal")
    result.setdefault("user_context_summary", "Unable to analyze user context")
    
    try:
        state.signal = SignalFramingOutput(**result)
    except Exception as e:
        print(f"⚠️  Error creating SignalFramingOutput: {e}")
        # FIXED: Create minimal valid signal on error
        state.signal = SignalFramingOutput(
            status="insufficient_signal",
            signal_summary=None,
            domain=None,
            time_horizon=None,
            confidence_level="low",
            user_context_summary="Error during signal framing",
        )

    # Memory-informed adjustments (if available)
    if state.memory_hints and state.memory_hints != "No relevant memories found.":
        # Add memory bias warning if user has strong preferences
        if "performance focus" in state.memory_hints.lower():
            state.signal.signal_summary = (
                f"{state.signal.signal_summary or ''} "
                f"[Note: User historically focuses on performance]"
            )

    # Signal framing node - check for absolute certainty language
    check_contract(
        condition="guaranteed" in state.topic.lower(),
        reason="Uses absolute certainty language",
        state=state,
    )

    return state


# ============================================================================
# NODE 2: REALITY CHECK (Memory-Informed)
# ============================================================================

REALITY_CHECK_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are a skeptical technical analyst. Your goal is to provide a structured, high-stakes reality check.

You evaluate feasibility and hype WITHOUT optimism or politeness. You MUST weigh every claim against the user's specific context and background.
If the tech is legacy, say so. If the user is overqualified or underqualified, be blunt.

PERSONALIZATION: Weigh 'feasibility' and 'risk_factors' heavily against the user's role and experience level.
DYNAMIC ANALYSIS: Avoid generic advice. Use your industry knowledge to find specific technical friction points or market signals.
{format_instructions}

Topic: {topic}
Input signal:
{signal_summary}

When status is "insufficient_signal", you may only have the topic name; still assess market adoption and feasibility from the topic (e.g. PostgreSQL 16, Redis 7 = strong).

Context:
- Domain: {domain}
- Time horizon: {time_horizon}
- Signal confidence: {confidence_level}
- Signal status: {status}
- User background: {user_context_summary}
 - Memory context: {memory_context}

═══════════════════════════════════════════════════════════════
MARKET SIGNAL CALIBRATION (use these benchmarks):
═══════════════════════════════════════════════════════════════

"strong" = Industry-standard, widespread production use
Examples: PostgreSQL, Docker, React, TypeScript, AWS, Kubernetes

"mixed" = Real adoption but not universal, legitimate but not dominant
Examples: Rust, GraphQL, Svelte, MongoDB, FastAPI

"weak" = Little production usage, mostly experimental/academic
Examples: Brand new tools, research projects, vaporware

CRITICAL: If used by major companies (Google, Meta, etc.) in production, it's AT LEAST "mixed", likely "strong".

═══════════════════════════════════════════════════════════════
HYPE SCORE CALIBRATION:
═══════════════════════════════════════════════════════════════

0-2: Obscure, barely discussed
3-5: Legitimate but not hyped (PostgreSQL, Redis, Nginx)
6-7: Popular, some justified excitement (Next.js, Tailwind)
8-9: Hyped, possibly inflated (AutoGPT, Web3 at peak)
10: Pure hype, vaporware

CRITICAL: Established tech (PostgreSQL, Docker, TypeScript) = hype score 3-5, NOT 6+

═══════════════════════════════════════════════════════════════
FEASIBILITY ASSESSMENT:
═══════════════════════════════════════════════════════════════

"high" = User can start TODAY (matches current stack, good docs)
"medium" = 2-4 weeks of focused learning (related but new concepts)
"low" = Steep curve OR not relevant to goals

═══════════════════════════════════════════════════════════════

CRITICAL RULES:
1. If evidence is indirect, SAY SO in evidence_summary
2. Do NOT conflate "new" with "hyped"
3. Established tech gets LOW hype scores (3-5)
4. Be harsh on hype, but fair to legitimate tools

evidence_summary:
- If no direct sources: "Assessment based on general ecosystem patterns and industry knowledge, not direct evidence"

risk_factors:
- Must be specific: "steep learning curve for X" not "may be challenging"

Do NOT recommend actions.
Do NOT soften risks.

These are "strong" (not "mixed"):
- PostgreSQL, MySQL (most common production databases)
- TypeScript (JavaScript standard in 2024+, used by major companies)
- Docker, Kubernetes (container standards)
- Nginx, Apache (web server standards)
- React, Vue (dominant frontend frameworks)
- Python, Go, Rust for backends
- FastAPI (THE modern Python async framework, widely adopted in production)
- AWS, GCP, Azure (cloud platform standards)

CRITICAL: If a technology is THE default or industry-standard choice for its category, it MUST be "strong", not "mixed".
TypeScript = JavaScript standard → "strong"
FastAPI = Modern Python async standard → "strong"

These are "mixed":
- Svelte, Solid.js (growing but not dominant)
- GraphQL (used but REST still more common)
- Deno (exists but Node.js dominates)
- Flask (legitimate but FastAPI/Django more common for new projects)

If a technology is THE default choice for its category, it's "strong".
If it's A legitimate choice but not THE default, it's "mixed".

═══════════════════════════════════════════════════════════════
DECISION LEDGER BUCKETS (AUDIT-READY EVIDENCE)
═══════════════════════════════════════════════════════════════

1. context_evidence (The Personalization Anchor):
- List 3-4 concrete facts from the user's profile and goals.
- This proves the decision is tied to their reality, not generic.

2. market_signals (The Scored Scrip):
- Score these 4 metrics (0-10): "Hiring Demand", "Ecosystem Maturity", "Tool Stability", "Learning Curve".
- Format: List of {{"label": "...", "score": ...}}

3. trade_offs (The Gains vs. Costs):
- Dictionary: {{"gains": [...], "costs": [...]}}.
- Real decisions involve loss. Be specific about what follows (Costs).

4. decision_anchors (The Revisit Receipt):
- List 2-3 "frozen claims" that trigger a future reassessment.
- Format: "If [event/metric] [condition] -> [action]"
- Example: "If learning takes > 3 weeks -> reassess"

CRITICAL OUTPUT RULES:
- You MUST return valid JSON only.
- Every field in the schema is REQUIRED.
- Lists MUST always be arrays, even if empty.
- ledger: This is YOUR CROWN JEWEL. Populate all 4 buckets with precision.
- sources: MUST be a list of 2-3 dictionaries with 'title', 'url', 'snippet', 'domain', and 'date'.
- Do NOT explain instructions inside values.
- Do NOT return natural language outside fields.
You MUST return ALL fields in the schema.

If unsure, use:
- feasibility = "medium"
- market_signal = "mixed"
- hype_score = 5
- risk_factors = []
- known_unknowns = []
- sources = []

risk_factors:
- MUST be a list of short, concrete risks.
- NEVER a sentence or paragraph.

known_unknowns:
- MUST be a list.
- Use [] if none are known.
Return ONLY valid JSON.
""",
        )
    ]
)


def reality_check_node(state: AxiomState) -> AxiomState:
    """Node 2: Assess feasibility and detect hype (memory-informed).
    Always run LLM (no short-circuit when signal insufficient) so we get market_signal
    for established tech; verdict node uses this to detect knowledge_gap (model prior weak vs market strong).
    """

    parser = JsonOutputParser(pydantic_object=RealityCheckOutput)
    chain = REALITY_CHECK_PROMPT | llm | parser

    # Call tool orchestrator for real evidence
    orchestrator = ToolOrchestrator()
    tool_evidence = orchestrator.execute_tools(
        topic=state.topic, 
        context={"user_profile": state.user_profile}
    )
    state.tool_evidence = tool_evidence
    state.sources = tool_evidence.get("sources", [])

    fi = parser.get_format_instructions().replace("{", "{{").replace("}", "}}")

    # FIXED: Add error handling for LLM invocation
    try:
        result = chain.invoke(
            {
                "topic": state.topic or "",
                "status": state.signal.status,
                "signal_summary": state.signal.signal_summary if state.signal.signal_summary else f"Topic only (signal framing insufficient): {state.topic}",
                "domain": state.signal.domain,
                "time_horizon": state.signal.time_horizon,
                "user_context_summary": state.signal.user_context_summary,
                "confidence_level": state.signal.confidence_level,
                "format_instructions": fi,
                "memory_context": state.memory_hints or "No relevant memories found.",
            }
        )
        print(f"DEBUG: Reality check LLM result keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
        
        # Check for flattened ledger fields instead of missing 'ledger' key
        ledger_fields = ["ledger_context", "ledger_market_signals", "ledger_trade_offs", "ledger_anchors"]
        found_fields = [f for f in ledger_fields if f in result]
        
        if len(found_fields) == len(ledger_fields):
            print(f"DEBUG: All {len(ledger_fields)} ledger fields found in LLM result!")
        else:
            missing = set(ledger_fields) - set(found_fields)
            print(f"DEBUG: Ledger fields MISSING from LLM result: {missing}")
    except Exception as e:
        print(f"⚠️  Error in reality_check LLM invocation: {e}")
        import traceback
        traceback.print_exc()
        # Fallback handling for missing fields
        result = {
            "feasibility": "medium",
            "market_signal": "mixed",
            "hype_score": 5,
            "risk_factors": [],
            "known_unknowns": [],
            "evidence_summary": "Assessment based on general ecosystem patterns and industry knowledge, not direct evidence",
        }

    # Fallback handling for missing fields
    result.setdefault("feasibility", "medium")
    result.setdefault("market_signal", "mixed")
    result.setdefault("hype_score", 5)
    result.setdefault("risk_factors", [])
    result.setdefault("known_unknowns", [])
    result.setdefault("evidence_summary", "Assessment based on general ecosystem patterns and industry knowledge, not direct evidence")
    
    # Fallback for ledger fields
    result.setdefault("ledger_context", ["Manual evaluation triggered"])
    result.setdefault("ledger_market_signals", [
            {"label": "Hiring Demand", "score": 5},
            {"label": "Ecosystem Maturity", "score": 5},
            {"label": "Tool Stability", "score": 5},
            {"label": "Learning Curve", "score": 5}
    ])
    result.setdefault("ledger_trade_offs", {"gains": ["Baseline productivity"], "costs": ["Generic solution risk"]})
    result.setdefault("ledger_anchors", ["If evidence remains generic -> reassess"])

    # Ensure list types
    if isinstance(result["risk_factors"], str):
        result["risk_factors"] = [result["risk_factors"]]

    if isinstance(result["known_unknowns"], str):
        result["known_unknowns"] = [result["known_unknowns"]]
    
    # Ensure known_unknowns is a list (can be empty)
    if not isinstance(result["known_unknowns"], list):
        result["known_unknowns"] = []
    
    state.reality_check = RealityCheckOutput(**result)
    state.sources = result.get("sources", [])
    
    # Reconstruct structured ledger for the UI
    state.ledger = {
        "context_evidence": state.reality_check.ledger_context,
        "market_signals": state.reality_check.ledger_market_signals,
        "trade_offs": state.reality_check.ledger_trade_offs,
        "decision_anchors": state.reality_check.ledger_anchors,
    }

    # Memory-informed adjustments
    if state.memory_hints and "similar past decisions" in state.memory_hints.lower():
        # Check for recency bias warning
        if "days ago" in state.memory_hints:
            state.reality_check.risk_factors.append(
                "Note: Similar decision made recently - guard against recency bias"
            )

    # Calculate signal-evidence alignment
    evidence_strength = evidence_strength_from_market(
        state.reality_check.market_signal, state.reality_check.hype_score
    )
    state.signal_evidence_alignment = calculate_alignment(
        state.signal.confidence_level or "low", evidence_strength
    )

    # Reality check node - verify real-world adoption evidence
    check_contract(
        condition=state.reality_check.market_signal == "weak",
        reason="No real-world adoption evidence",
        state=state,
    )

    return state


# ============================================================================
# NODE 3: VERDICT SYNTHESIS (Full Memory Integration)
# ============================================================================

BASE_VERDICT_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are a Scout: direct, skeptical, and efficient. Your job is to tell the user whether a technology is worth their limited time.

CRITICAL: Do NOT be a cheerleader. If something is hype, say so. If something is established but decaying, say so. 

Inputs:
Status: {status}
Feasibility: {feasibility}
Market Signal: {market_signal}
Hype Score: {hype_score}
Memory context: {memory_context}

═══════════════════════════════════════════════════════════════
DECISION BUCKETS
═══════════════════════════════════════════════════════════════

PURSUE = High ROI, low regret.
- Technology is mature OR has overwhelming market signal.
- Feasibility is high (aligned with user skills).
- Action items should focus on immediate implementation.

EXPLORE = Promising but unproven or high friction.
- Mixed signals or emerging tech.
- High learning curve but potential long-term value.
- Action items: Spikes, prototypes, limited scope experiments.

WATCHLIST = Uncertain or outdated knowledge.
- Model cutoff issues (Release > April 2024).
- Low evidence but high potential.
- Action items: Re-evaluate in 3 months. Don't touch yet.

IGNORE = Opportunity cost > Value.
- Vaporware, dead ecosystems, or obsolete tech.
- Wrong tool for the user's specific goals.
- Action item: Suggest a concrete alternative.

═══════════════════════════════════════════════════════════════
REASONING STYLE:
═══════════════════════════════════════════════════════════════
- BE BLUNT. No corporate fluff. 
- Use evidence from the "Inputs" to justify every claim.
- If the user's skills are a mismatch, highlight it as a "Skill Gap" risk.
- Address the user directly: "You should...", "Based on your experience with..."

Return ONLY valid JSON.
{format_instructions}""",
        )
    ]
)


def verdict_node(state: AxiomState) -> AxiomState:
    """Node 3: Synthesize verdict with memory integration (Scout: tolerate uncertainty, use watchlist)."""

    # PRE-VERDICT: Ensure reality_check exists (we now always run it, but defensive)
    if not state.reality_check:
        # Fallback if reality_check is missing (shouldn't happen, but defensive)
        state.reality_check = RealityCheckOutput(
            feasibility="low",
            market_signal="weak",
            risk_factors=["Missing reality check data"],
            known_unknowns=[],
            hype_score=0,
            evidence_summary="Reality check data unavailable",
        )

    # Step 1: Separate model prior from external reality — flag knowledge_gap when they disagree
    # Model prior weak (insufficient_signal) but market strong/mixed → do NOT downgrade to ignore
    state.knowledge_gap = (
        state.signal is not None
        and state.signal.status == "insufficient_signal"
        and state.reality_check is not None
        and state.reality_check.market_signal in ("strong", "mixed")
    )
    if state.knowledge_gap:
        print("📌 KNOWLEDGE GAP: model prior weak but market signal strong/mixed → bias watchlist (no decay)")

    hype = state.reality_check.hype_score
    market = state.reality_check.market_signal
    evidence_strength = evidence_strength_from_market(market, hype)

    # Short-circuit: insufficient_signal → watchlist if knowledge_gap, else ignore
    if state.signal and state.signal.status == "insufficient_signal":
        if state.knowledge_gap:
            state.verdict = VerdictOutput(
                verdict="watchlist",
                reasoning="Model knowledge is lagging but market evidence suggests this is established or emerging. Do not decay or upgrade yet; re-evaluate with fresher sources.",
                action_items=[
                    "Re-evaluate when external evidence (docs, adoption) is available",
                    "Do not ignore based on model prior alone",
                ],
                timeline="re-evaluate in 3 months",
                confidence="low",
            )
            return state
        state.verdict = VerdictOutput(
            verdict="ignore",
            reasoning="The topic lacks sufficient public clarity or substance to justify investment of time.",
            action_items=[
                "Do not allocate learning time unless clearer signal emerges",
                "Focus on established technologies with proven value",
            ],
            timeline="wait 6+ months",
            confidence="low",
        )
        return state

    # PRE-VERDICT CONTRACT CHECKS (before creating verdict)
    if state.signal:
        signal_confidence = state.signal.confidence_level or "low"
        
        # Contract 1: High confidence signal contradicts weak evidence
        check_contract(
            condition=signal_confidence == "high" and evidence_strength < 0.5,
            reason="High confidence signal contradicts weak evidence strength",
            state=state,
        )
        
        # Contract 2: Insufficient signal should NEVER have high confidence
        check_contract(
            condition=state.signal.status == "insufficient_signal" and signal_confidence == "high",
            reason="Insufficient signal cannot have high confidence",
            state=state,
        )

    # GATE: If violations exist — flag uncertainty, do not downgrade when knowledge_gap (Scout)
    if state.contract_violation:
        violations_list = state.violations if state.violations is not None else []
        violation_items = [f"• {v}" for v in violations_list if v]
        if len(violation_items) < 2:
            violation_items.append("• Re-evaluate when evidence is clearer")
        violation_items = violation_items[:4]

        # When model and evidence disagree but market suggests established tech → watchlist not ignore
        if state.knowledge_gap:
            state.verdict = VerdictOutput(
                verdict="watchlist",
                reasoning="Contract violations detected (model certainty vs thin evidence). Market signal suggests established tech; classify as knowledge gap, not weak tech. Re-evaluate with fresher evidence.",
                action_items=violation_items,
                timeline="re-evaluate in 3 months",
                confidence="low",
            )
            return state
        state.verdict = VerdictOutput(
            verdict="ignore",
            reasoning="Contract violations detected during evaluation. The analysis contains contradictions that prevent a reliable recommendation.",
            action_items=violation_items,
            timeline="wait 6+ months",
            confidence="low",
        )
        return state

    # DECISION TRAJECTORY RESOLVER: Check if we should upgrade "explore" → "pursue"
    # This happens BEFORE LLM call to prevent decision inertia
    memory_context_obj = None
    if state.memory_context and MEMORY_AVAILABLE:
        try:
            memory_context_obj = MemoryContext(**state.memory_context)
        except Exception:
            memory_context_obj = MemoryContext()
    
    forced_verdict = resolve_decision_trajectory(state, memory_context_obj)
    
    if forced_verdict == "pursue":
        # Force pursue verdict with trajectory-aware reasoning
        state.verdict = VerdictOutput(
            verdict="pursue",
            reasoning=f"Previous exploration of similar topics combined with current market signal ({market}) and feasibility ({state.reality_check.feasibility}) indicates this is worth pursuing now. Conditions have strengthened since initial exploration.",
            action_items=[
                "Begin hands-on implementation or deeper learning",
                "Allocate dedicated time for skill development",
                "Build a practical project to validate understanding",
            ],
            timeline="now",
            confidence="high",
        )
        return state

    # Prepare parser early so format_instructions can be embedded when
    # formatting the base prompt for enhancement (avoids KeyError).
    parser = JsonOutputParser(pydantic_object=VerdictOutput)

    # Enhance prompt with memory context if available
    if state.memory_hints and state.memory_hints != "No relevant memories found.":
        # Create enhanced prompt (include format_instructions when formatting)
        # Escape format_instructions before formatting the base prompt
        fi = parser.get_format_instructions().replace("{", "{{").replace("}", "}}")

        enhanced_prompt = enhance_verdict_prompt(
            base_prompt=BASE_VERDICT_PROMPT.format_messages(
                status=state.signal.status if state.signal else "insufficient_signal",
                feasibility=state.reality_check.feasibility if state.reality_check else "low",
                market_signal=state.reality_check.market_signal if state.reality_check else "weak",
                hype_score=state.reality_check.hype_score if state.reality_check else 0,
                memory_context=state.memory_hints or "No relevant memories found.",
                format_instructions=fi,
            )[0].content,
            memory_context=MemoryContext(**state.memory_context)
            if state.memory_context
            else MemoryContext(),
        )

        # Create new prompt with memory context
        VERDICT_PROMPT_WITH_MEMORY = ChatPromptTemplate.from_messages(
            [("system", enhanced_prompt), ("human", "")]
        )
    else:
        VERDICT_PROMPT_WITH_MEMORY = BASE_VERDICT_PROMPT

    # Create normal verdict with memory-enhanced prompt
    chain = VERDICT_PROMPT_WITH_MEMORY | llm | parser

    # FIXED: Add comprehensive error handling for LLM invocation
    try:
        result = chain.invoke(
            {
                "status": state.signal.status if state.signal else "insufficient_signal",
                "feasibility": state.reality_check.feasibility if state.reality_check else "low",
                "market_signal": state.reality_check.market_signal if state.reality_check else "weak",
                "hype_score": state.reality_check.hype_score if state.reality_check else 0,
                "format_instructions": parser.get_format_instructions().replace("{", "{{").replace("}", "}}"),
                "memory_context": state.memory_hints or "No relevant memories found.",
            }
        )
    except Exception as e:
        print(f"⚠️  Error in verdict LLM invocation: {e}")
        import traceback
        traceback.print_exc()
        # FIXED: Provide safe fallback result on error
        result = {
            "verdict": "ignore",
            "reasoning": f"Error during verdict analysis: {str(e)[:200]}",
            "action_items": [
                "Re-evaluate when system is available",
                "Check system logs for details"
            ],
            "timeline": "wait 6+ months",
            "confidence": "low",
        }
    
    # Validate and fix result to ensure action_items meets schema requirements
    result = validate_and_fix_verdict_result(result, result.get("verdict"))

    # Step 3: Confidence dampening — penalize model certainty when evidence is thin
    if evidence_strength < 0.5 and result.get("confidence") == "high":
        result["confidence"] = "medium"
        if "reasoning" in result:
            result["reasoning"] += " [Confidence dampened: thin evidence does not support high confidence]"
    if state.signal and state.signal.status == "insufficient_signal":
        result["confidence"] = "low"
        if "reasoning" in result:
            result["reasoning"] += " [Confidence set to low due to insufficient signal]"

    state.verdict = VerdictOutput(**result)

    # Memory calibration: Adjust confidence if memory shows contradictory patterns
    if state.verdict and state.verdict.confidence == "high" and state.memory_relevance_score and state.memory_relevance_score > 0.7:
        # Check for contradiction patterns in memory
        if state.memory_hints and "contradict" in state.memory_hints.lower():
            state.verdict.confidence = "medium"
            state.verdict.reasoning += (
                " [Confidence lowered due to contradictory memory patterns]"
            )

    # Calculate evidence-verdict alignment
    # FIXED: Add null safety check
    if state.verdict:
        state.evidence_verdict_alignment = calculate_alignment(
            state.verdict.confidence, evidence_strength
        )
    else:
        state.evidence_verdict_alignment = 0.0

    # Calculate overall chain coherence (include memory relevance)
    # FIXED: Handle None values gracefully with proper fallbacks
    signal_alignment = state.signal_evidence_alignment if state.signal_evidence_alignment is not None else 0.5
    verdict_alignment = state.evidence_verdict_alignment if state.evidence_verdict_alignment is not None else 0.5
    
    if state.memory_relevance_score and state.memory_relevance_score > 0:
        coherence_components = [
            signal_alignment,
            verdict_alignment,
            state.memory_relevance_score,
        ]
        state.chain_coherence_score = round(
            sum(coherence_components) / len(coherence_components), 3
        )
    else:
        state.chain_coherence_score = round(
            (signal_alignment + verdict_alignment) / 2.0,
            3,
        )

    return state


# ============================================================================
# NODE 4: MEMORY STORE & REINFORCEMENT
# ============================================================================


def memory_store_node(state: AxiomState) -> AxiomState:
    """Node 4: Store memories AFTER verdict"""

    memory_manager = get_memory_manager()

    if MEMORY_AVAILABLE and memory_manager and state.verdict:
        try:
            # Process verdict for memory storage
            memory_result = memory_manager.process_verdict(
                user_profile=state.user_profile,
                topic=state.topic,
                verdict_data=state.verdict.model_dump(),
                signal_data=state.signal.model_dump() if state.signal else {},
                reality_check_data=state.reality_check.model_dump()
                if state.reality_check
                else {},
                pipeline_state={
                    "contract_violation": state.contract_violation,
                    "violations": state.violations,
                    "chain_coherence_score": state.chain_coherence_score,
                },
            )

            if memory_result.get("memory_stored"):
                print(f"💾 Memories stored for {derive_user_id(state.user_profile)}")

        except Exception as e:
            print(f"⚠️  Error storing memories: {e}")

    # Calculate final chain coherence if not already calculated
    # FIXED: Comprehensive null safety and fallback handling
    if state.chain_coherence_score is None:
        # Safe extraction with defaults
        market_signal = "weak"
        hype_score = 0
        if state.reality_check:
            market_signal = state.reality_check.market_signal or "weak"
            try:
                hype_score = int(state.reality_check.hype_score) if state.reality_check.hype_score is not None else 0
            except (ValueError, TypeError):
                hype_score = 0
        
        evidence_strength = evidence_strength_from_market(market_signal, hype_score)

        # Calculate signal alignment with null safety
        signal_confidence = "low"
        if state.signal and state.signal.confidence_level:
            signal_confidence = state.signal.confidence_level
        signal_alignment = calculate_alignment(signal_confidence, evidence_strength)

        # Calculate verdict alignment with null safety
        verdict_confidence = "medium"
        if state.verdict and state.verdict.confidence:
            verdict_confidence = state.verdict.confidence
        verdict_alignment = calculate_alignment(verdict_confidence, evidence_strength)

        # FIXED: Prevent division by zero (shouldn't happen, but defensive)
        state.chain_coherence_score = round(
            (signal_alignment + verdict_alignment) / 2.0, 3
        )

    return state


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def validate_and_fix_verdict_result(result: Dict[str, Any], verdict_type: str = None) -> Dict[str, Any]:
    """
    Validate and fix verdict result to ensure it meets schema requirements.
    Specifically handles action_items validation (must be 2-4 items).
    
    This prevents validation errors when LLM returns malformed data.
    """
    # Ensure action_items is a list
    if "action_items" not in result or not isinstance(result["action_items"], list):
        result["action_items"] = []
    
    action_items = result["action_items"]
    
    # Remove empty strings and ensure all items are strings
    action_items = [str(item).strip() for item in action_items if str(item).strip()]
    
    # Default action items based on verdict type if we don't have enough
    if len(action_items) < 2:
        verdict = result.get("verdict", verdict_type or "explore")
        
        defaults = {
            "pursue": [
                "Begin hands-on implementation or deeper learning",
                "Allocate dedicated time for skill development",
            ],
            "explore": [
                "Research the current state of this technology",
                "Evaluate its potential applications and use cases",
            ],
            "watchlist": [
                "Re-evaluate in 3 months with fresher evidence",
                "Do not decay or upgrade until more signal",
            ],
            "ignore": [
                "Focus on established technologies with proven value",
                "Re-evaluate when clearer signal emerges",
            ],
        }
        
        needed = 2 - len(action_items)
        defaults_to_add = defaults.get(verdict, defaults["explore"])[:needed]
        action_items.extend(defaults_to_add)
    
    # Truncate to maximum of 4 items
    if len(action_items) > 4:
        action_items = action_items[:4]
    
    result["action_items"] = action_items
    
    # Ensure other required fields have defaults
    result.setdefault("verdict", "explore")
    result.setdefault("reasoning", "Analysis completed with available information.")
    verdict = result.get("verdict", "explore")
    result.setdefault("timeline", "re-evaluate in 3 months" if verdict == "watchlist" else "in 3 months")
    result.setdefault("confidence", "medium")
    return result


def check_contract(condition: bool, reason: str, state: AxiomState) -> None:
    """
    Check for contract violations and record them.
    
    Edge cases handled:
    - None violations list → initialize it
    - Duplicate violations → allowed (may indicate multiple issues)
    - Empty reason → skip (invalid input)
    """
    if condition:
        state.contract_violation = True
        # FIXED: Ensure violations list exists and reason is valid
        if state.violations is None:
            state.violations = []
        if reason and reason.strip():  # Only add non-empty reasons
            state.violations.append(reason.strip())


def calculate_alignment(claimed_confidence: str, evidence_strength: float) -> float:
    """Calculate alignment between confidence level and evidence strength."""
    confidence_map = {"low": 0.3, "medium": 0.6, "high": 0.9}
    claimed_value = confidence_map.get(claimed_confidence, 0.6)

    divergence = abs(claimed_value - evidence_strength)
    alignment = max(0.0, 1.0 - divergence)

    return round(alignment, 3)


def evidence_strength_from_market(market_signal, hype_score):
    """Calculate evidence strength from market signal and hype score"""
    base = {"weak": 0.2, "mixed": 0.6, "strong": 0.9}.get(market_signal, 0.3)
    penalty = max(0.0, (hype_score - 6) / 10)
    return max(0.0, base * (1 - penalty))


def resolve_decision_trajectory(
    state: AxiomState,
    memory_context: Optional[MemoryContext] = None,
) -> Optional[Literal["pursue", "explore", "watchlist", "ignore"]]:
    """
    Decision Trajectory Resolver: Upgrades "explore" to "pursue" ONLY with proof of grounded value.
    
    NEGATIVE GATE: Blocks upgrades unless:
    - market_signal == "strong" OR feasibility == "high"
    
    This prevents:
    - Hype bubbles (hype alone is never enough)
    - Academic-only topics from being promoted
    - Mixed + medium from automatically upgrading
    
    Examples:
    - Quantum ML: market="mixed", feasibility="medium" → BLOCKED (stays explore)
    - TypeScript: market="strong", feasibility="high" → ALLOWED (upgrades to pursue)
    - FastAPI: market="strong", feasibility="medium" → ALLOWED (upgrades to pursue)
    
    Returns:
        Forced verdict override OR None (let LLM decide)
    """
    if not memory_context or not memory_context.similar_decisions:
        return None
    
    # Find most recent "explore" decision for this topic (normalized)
    topic_normalized = state.topic.lower().strip()
    recent_explore = None
    
    for decision in memory_context.similar_decisions:
        decision_topic = decision.get("topic", "").lower().strip()
        decision_verdict = decision.get("verdict", "").lower()
        
        # Check if this is a similar topic with "explore" verdict
        if decision_verdict == "explore":
            # Simple similarity check (can be enhanced with embeddings)
            topic_words = set(topic_normalized.split())
            decision_words = set(decision_topic.split())
            
            # If topics share significant words, consider them similar
            if len(topic_words & decision_words) >= 1 or topic_normalized in decision_topic or decision_topic in topic_normalized:
                if recent_explore is None or decision.get("days_ago", 999) < recent_explore.get("days_ago", 999):
                    recent_explore = decision
    
    # If we found a previous "explore" decision, check upgrade conditions
    if recent_explore:
        market = state.reality_check.market_signal
        feasibility = state.reality_check.feasibility
        hype = state.reality_check.hype_score
        
        # NEGATIVE GATE: Require proof of grounded value
        # Block upgrade unless market is strong OR feasibility is high
        # This prevents hype bubbles and academic-only topics
        upgrade_allowed = (
            market == "strong" or feasibility == "high"
        )
        
        # Additional safety: hype alone is never enough
        if upgrade_allowed and hype <= 6:
            print(f"🚀 DECISION TRAJECTORY: Upgrading 'explore' → 'pursue'")
            print(f"   Previous: {recent_explore.get('topic', 'N/A')} → explore ({recent_explore.get('days_ago', 'N/A')} days ago)")
            print(f"   Conditions: market={market}, feasibility={feasibility}, hype={hype}")
            print(f"   ✅ Upgrade allowed: market='strong' OR feasibility='high'")
            return "pursue"
        else:
            print(f"🚫 DECISION TRAJECTORY: Upgrade BLOCKED")
            print(f"   Previous: {recent_explore.get('topic', 'N/A')} → explore ({recent_explore.get('days_ago', 'N/A')} days ago)")
            print(f"   Conditions: market={market}, feasibility={feasibility}, hype={hype}")
            if not upgrade_allowed:
                print(f"   ❌ Blocked: Need market='strong' OR feasibility='high' (got market='{market}', feasibility='{feasibility}')")
            if hype > 6:
                print(f"   ❌ Blocked: Hype score too high ({hype} > 6)")
    
    return None


# ============================================================================
# GRAPH CONSTRUCTION
# ============================================================================

workflow = StateGraph(AxiomState)

# Add nodes with memory integration
workflow.add_node("load_memory", memory_context_node)  # PRE: Load memories
workflow.add_node("signal_framing", signal_framing_node)  # LTM-informed
workflow.add_node("run_reality_check", reality_check_node)  # STM-informed
workflow.add_node("synthesize_verdict", verdict_node)  # LTM+STM integration
workflow.add_node("memory_store", memory_store_node)  # POST: Store/update

# Define the flow
workflow.add_edge("load_memory", "signal_framing")  # Memories → Analysis
workflow.add_edge("signal_framing", "run_reality_check")  # Signal → Reality
workflow.add_edge("run_reality_check", "synthesize_verdict")  # Reality → Verdict
workflow.add_edge("synthesize_verdict", "memory_store")  # Verdict → Memory update
workflow.add_edge("memory_store", END)  # Complete cycle

# Set entry point
workflow.set_entry_point("load_memory")

# Compile the graph
app = workflow.compile()

# Initialize Opik tracer
opik_tracer = OpikTracer(tags=["axiom-v0", "memory-integration"])


# ============================================================================
# WRAPPER FUNCTION WITH OPIK TRACING
# ============================================================================


@track(name="axiom_query", project_name="axiom-v0")
def run_axiom_query(topic: str, user_profile: str):
    """
    Main entry point for Axiom queries with Opik tracing
    Now includes full memory integration
    """
    # Invoke the graph with Opik callback
    result_dict = app.invoke(
        {"topic": topic, "user_profile": user_profile},
        config={"callbacks": [opik_tracer]},
    )

    # Convert dict to AxiomState for consistent access
    result = AxiomState(**result_dict)

    opik_context.update_current_trace(
        feedback_scores=[
            {
                "name": "signal_evidence_alignment",
                "value": result.signal_evidence_alignment or 0.0,
            },
            {
                "name": "evidence_verdict_alignment",
                "value": result.evidence_verdict_alignment or 0.0,
            },
            {
                "name": "chain_coherence_score",
                "value": result.chain_coherence_score or 0.0,
            },
            {
                "name": "memory_relevance_score",
                "value": result.memory_relevance_score or 0.0,
            },
            {"name": "contract_violation", "value": float(result.contract_violation)},
        ],
        metadata={
            "topic": topic,
            "verdict": result.verdict.verdict if result.verdict else "unknown",
            "market_signal": result.reality_check.market_signal
            if result.reality_check
            else "unknown",
            "hype_score": result.reality_check.hype_score
            if result.reality_check
            else 0,
            "timeline": result.verdict.timeline if result.verdict else "unknown",
            "confidence": result.verdict.confidence if result.verdict else "unknown",
            "signal_confidence": result.signal.confidence_level
            if result.signal
            else "unknown",
            "memory_available": MEMORY_AVAILABLE,
        },
        thread_id=f"conversation_{hashlib.md5(user_profile.encode()).hexdigest()[:8]}",
    )

    return result_dict

def check_memory_stats():
    """Check what's actually in memory"""
    memory_manager = get_memory_manager()

    if not MEMORY_AVAILABLE or memory_manager is None:
        print("❌ Memory manager not available")
        return

    # Check health
    health = memory_manager.health_check()
    print("🧠 Memory System Health:")
    print(f"  Status: {health['status']}")
    print(f"  Memory counts: {health['memory_counts']}")

    # Check specific user
    test_profile = "Backend developer, optimizing API performance"
    user_id = derive_user_id(test_profile)
    print(f"\n🔍 Checking user: {user_id}")

    # Try to directly query Redis
    try:
        # Query user traits
        query = f"@user_id:{{{user_id}}}"
        result = memory_manager.vector_memory.redis.ft("idx:axiom:user_traits").search(
            Query(query).return_fields("fact", "confidence", "created_at")
        )
        print(f"  User traits in Redis: {len(result.docs)}")

        # Query decisions
        result = memory_manager.vector_memory.redis.ft("idx:axiom:decisions").search(
            Query(query).return_fields("topic", "verdict", "reasoning", "created_at")
        )
        print(f"  Decisions in Redis: {len(result.docs)}")
        for doc in result.docs:
            print(f"    - {doc.topic}: {doc.verdict}")

    except Exception as e:
        print(f"  Error querying: {e}")

# ============================================================================
# QUICK TEST
# ============================================================================

if __name__ == "__main__":
    print("🧪 Testing Axiom with Memory Integration")
    print("=" * 80)

    check_memory_stats()

    test_result = run_axiom_query(
        topic="TypeScript",
        user_profile="Frontend developer, 2 years JavaScript experience",
    )

    print("\nTEST OUTPUT:")
    print("=" * 80)
    print("Topic: Redis 7 for caching")
    print(
        f"Signal Status: {test_result['signal'].status if test_result.get('signal') else 'N/A'}"
    )
    print(
        f"Market Signal: {test_result['reality_check'].market_signal if test_result.get('reality_check') else 'N/A'}"
    )
    print(
        f"Hype Score: {test_result['reality_check'].hype_score if test_result.get('reality_check') else 'N/A'}"
    )
    print(
        f"Verdict: {test_result['verdict'].verdict if test_result.get('verdict') else 'N/A'}"
    )
    print(
        f"Timeline: {test_result['verdict'].timeline if test_result.get('verdict') else 'N/A'}"
    )
    print(f"Memory Available: {MEMORY_AVAILABLE}")
    print(f"Memory Hints: {test_result.get('memory_hints', 'N/A')[:100]}...")

    print("\nAlignment Metrics:")
    print(
        f"  Signal-Evidence Alignment: {test_result.get('signal_evidence_alignment', 'N/A')}"
    )
    print(
        f"  Evidence-Verdict Alignment: {test_result.get('evidence_verdict_alignment', 'N/A')}"
    )
    print(
        f"  Memory Relevance Score: {test_result.get('memory_relevance_score', 'N/A')}"
    )
    print(f"  Chain Coherence Score: {test_result.get('chain_coherence_score', 'N/A')}")
    print(f"  Contract Violation: {test_result.get('contract_violation', 'N/A')}")
    print("=" * 80 + "\n")
