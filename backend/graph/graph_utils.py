"""
Axiom v0 - LangGraph Pipeline with Memory Integration
5-node decision pipeline: Memory Context → Signal Framing → Reality Check → Verdict Synthesis → Memory Store

Memory integration status: Full LTM/STM cycle implemented
"""

from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field
from typing import Optional, Literal, Any, Dict #, List
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
from redis.commands.search.query import Query

load_dotenv()

# Add parent directory to path for memory imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import memory system
try:
    from memory.manager import AxiomMemoryManager
    from memory.schemas import MemoryContext
    from memory.integration import enhance_verdict_prompt

    MEMORY_AVAILABLE = True  
    print("✅ Memory system loaded successfully")
except ImportError as e:
    print(f"⚠️  Memory system not available: {e}")
    MEMORY_AVAILABLE = False

    # Create dummy classes for fallback
    class AxiomMemoryManager:
        def __init__(self, *args, **kwargs):
            pass

        def get_memory_context(self, *args, **kwargs):
            class DummyContext:
                def to_prompt_string(self):
                    return "No relevant memories found."

                user_traits = []
                topic_patterns = []
                similar_decisions = []

            return DummyContext()

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
        ..., description="How feasible is this for the user's background"
    )
    market_signal: Literal["weak", "mixed", "strong"] = Field(
        ..., description="Community/market adoption signal strength"
    )
    risk_factors: list[str] = Field(
        ..., description="2-4 specific risks or concerns", min_length=2, max_length=4
    )
    known_unknowns: list[str] = Field(
        ...,
        description="1-3 things we don't know but should",
        min_length=1,
        max_length=3,
    )
    hype_score: int = Field(
        ..., description="0-10 where 10 = maximum hype", ge=0, le=10
    )
    evidence_summary: str = Field(
        ..., description="What signals were used to assess this"
    )


class VerdictOutput(BaseModel):
    """Output schema for Node 3: Verdict Synthesis"""

    verdict: Literal["pursue", "explore", "ignore"] = Field(
        ..., description="Clear decision: pursue, explore, or ignore"
    )
    reasoning: str = Field(
        ..., description="2-3 sentences explaining the verdict clearly"
    )
    action_items: list[str] = Field(
        ..., description="2-4 specific, testable next steps", min_length=2, max_length=4
    )
    timeline: Literal["now", "in 3 months", "wait 6+ months"] = Field(
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

    # Memory fields
    memory_context: Optional[Dict[str, Any]] = None
    memory_hints: Optional[str] = None
    memory_relevance_score: Optional[float] = None

    # Alignment metrics
    signal_evidence_alignment: Optional[float] = None
    evidence_verdict_alignment: Optional[float] = None
    chain_coherence_score: Optional[float] = None
    contract_violation: Optional[bool] = False
    violations: Optional[list[str]] = []


# ============================================================================
# LLM SETUP
# ============================================================================

llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.1,
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
            print("🧠 Memory manager initialized")
        except Exception as e:
            print(f"⚠️  Failed to initialize memory manager: {e}")
            _memory_manager = None
    return _memory_manager


def derive_user_id(user_profile: str) -> str:
    """Derive stable user ID from profile"""
    profile_hash = hashlib.sha256(user_profile.encode()).hexdigest()[:8]
    return f"user_{profile_hash}"
    # return "user_id_Byomkesh_Bakshi"

def calculate_memory_relevance(memory_context) -> float:
    """Calculate relevance score for memory context (0-1)"""
    if not memory_context:
        return 0.0

    relevance = 0.0
    weight = 0.0

    # Score based on number of relevant memories
    if hasattr(memory_context, "user_traits") and memory_context.user_traits:
        relevance += min(len(memory_context.user_traits) * 0.2, 0.4)
        weight += 0.4

    if hasattr(memory_context, "topic_patterns") and memory_context.topic_patterns:
        relevance += min(len(memory_context.topic_patterns) * 0.3, 0.4)
        weight += 0.4

    if (
        hasattr(memory_context, "similar_decisions")
        and memory_context.similar_decisions
    ):
        relevance += min(len(memory_context.similar_decisions) * 0.1, 0.2)
        weight += 0.2

    if weight > 0:
        print("memory reference is being calculated as:", relevance/ weight)
        return round(relevance / weight, 2)
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
        print("📦 Memory context found:")
        print(f"   User traits: {len(memory_context.user_traits)}")
        print(f"   Topic patterns: {len(memory_context.topic_patterns)}")
        print(f"   Similar decisions: {len(memory_context.similar_decisions)}")

        # Show details of what was found
        if memory_context.similar_decisions:
            print("   Recent decisions:")
            for i, decision in enumerate(memory_context.similar_decisions[:3]):
                print(
                    f"     {i + 1}. {decision.get('topic', 'N/A')} -> {decision.get('verdict', 'N/A')}"
                )

        # Store in state
        state.memory_context = (
            memory_context.__dict__ if hasattr(memory_context, "__dict__") else {}
        )
        state.memory_hints = memory_context.to_prompt_string()

        # Calculate relevance score
        state.memory_relevance_score = calculate_memory_relevance(memory_context)

        print(f"🧠 Memory relevance score: {state.memory_relevance_score}")

    except Exception as e:
        print(f"⚠️  Error loading memory context: {e}")
        import traceback

        traceback.print_exc()
        state.memory_hints = "Error loading memory context"
        state.memory_relevance_score = 0.0

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

Extract and categorize this signal.""",
        ),
    ]
)


def signal_framing_node(state: AxiomState) -> AxiomState:
    """Node 1: Parse and categorize the signal (memory-informed)"""
    parser = JsonOutputParser(pydantic_object=SignalFramingOutput)
    chain = SIGNAL_FRAMING_PROMPT | llm | parser

    result = chain.invoke(
        {
            "topic": state.topic,
            "user_profile": state.user_profile,
            "format_instructions": parser.get_format_instructions(),
        }
    )

    state.signal = SignalFramingOutput(**result)

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
            """You are a skeptical technical analyst.

You evaluate feasibility and hype WITHOUT optimism or politeness.

Input signal:
{signal_summary}

Context:
- Domain: {domain}
- Time horizon: {time_horizon}
- Signal confidence: {confidence_level}
- Signal status: {status}
- User background: {user_context_summary}

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
- TypeScript (JavaScript standard in 2024+)
- Docker, Kubernetes (container standards)
- Nginx, Apache (web server standards)
- React, Vue (dominant frontend frameworks)
- Python, Go, Rust for backends

These are "mixed":
- Svelte, Solid.js (growing but not dominant)
- GraphQL (used but REST still more common)
- Deno (exists but Node.js dominates)
- FastAPI (popular in Python but not universal)

If a technology is THE default choice for its category, it's "strong".
If it's A legitimate choice but not THE default, it's "mixed".

Return ONLY valid JSON.
{format_instructions}""",
        )
    ]
)


def reality_check_node(state: AxiomState) -> AxiomState:
    """Node 2: Assess feasibility and detect hype (memory-informed)"""

    # Short-circuit if signal is insufficient
    if state.signal.status == "insufficient_signal":
        state.reality_check = RealityCheckOutput(
            feasibility="low",
            market_signal="weak",
            risk_factors=[
                "Topic lacks clear definition or consensus",
                "Insufficient information to assess viability",
            ],
            known_unknowns=["Unclear what the topic actually represents"],
            hype_score=0,
            evidence_summary="Insufficient signal to assess feasibility",
        )
        return state

    parser = JsonOutputParser(pydantic_object=RealityCheckOutput)
    chain = REALITY_CHECK_PROMPT | llm | parser

    result = chain.invoke(
        {
            "status": state.signal.status,
            "signal_summary": state.signal.signal_summary,
            "domain": state.signal.domain,
            "time_horizon": state.signal.time_horizon,
            "user_context_summary": state.signal.user_context_summary,
            "confidence_level": state.signal.confidence_level,
            "format_instructions": parser.get_format_instructions(),
        }
    )

    state.reality_check = RealityCheckOutput(**result)

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
            """You are a blunt, opinionated career decision advisor.

Inputs:
Signal: {signal}
Reality check: {reality_check}

═══════════════════════════════════════════════════════════════
DECISION RULES:
═══════════════════════════════════════════════════════════════

PURSUE = Worth learning deeply NOW
- feasibility = "high" OR "medium"
- market_signal = "strong" OR "mixed" (mixed = real but not universal)
- User profile aligns with technology
- Technology is established (time_horizon = "medium" or "long")

Examples: PostgreSQL for backend dev, Docker for full-stack, TypeScript for frontend

EXPLORE = Keep on radar, light research
- feasibility = "medium"
- market_signal = "mixed"
- Technology is emerging (time_horizon = "short")
- OR: hype_score > 6 AND user should be aware

Examples: Rust for senior engineer, LangGraph for AI/ML engineer

IGNORE = Not worth time, clear opportunity cost
- feasibility = "low" AND market_signal = "weak"
- OR: Obsolete for stated goals (COBOL for modern SaaS)
- OR: status = "insufficient_signal" (vaporware)
- OR: hype_score > 8 AND feasibility = "low"

Examples: COBOL for web, Quantum CSS, Blockchain for Git

═══════════════════════════════════════════════════════════════
CRITICAL:
═══════════════════════════════════════════════════════════════

"mixed" market signal does NOT mean ignore!
"mixed" often means "explore" or "pursue" depending on user context.

Action items must be concrete:
✅ "Build a CRUD app using FastAPI"
✅ "Read PostgreSQL 16 release notes"
❌ "Learn more about X"
❌ "Study fundamentals"

If "ignore": state opportunity cost, suggest alternative.

Return ONLY valid JSON.
{format_instructions}""",
        )
    ]
)


def verdict_node(state: AxiomState) -> AxiomState:
    """Node 3: Synthesize verdict with memory integration"""

    # Short-circuit if signal is insufficient
    if state.signal.status == "insufficient_signal":
        state.verdict = VerdictOutput(
            verdict="ignore",
            reasoning="The topic lacks sufficient public clarity or substance to justify investment of time.",
            action_items=[
                "Do not allocate learning time unless clearer signal emerges",
                "Focus on established technologies with proven value",
            ],
            timeline="wait 6+ months",
            confidence="high",
        )
        return state

    # PRE-VERDICT CONTRACT CHECKS (before creating verdict)
    hype = state.reality_check.hype_score
    market = state.reality_check.market_signal
    evidence_strength = evidence_strength_from_market(market, hype)

    # Check confidence alignment violation early
    check_contract(
        condition=state.signal.confidence_level == "high" and evidence_strength < 0.5,
        reason="High confidence signal contradicts weak evidence strength",
        state=state,
    )

    # GATE: If violations exist, return ignore verdict immediately
    if state.contract_violation:
        violation_items = [f"• {v}" for v in state.violations]
        # Ensure at least 2 action items
        if len(violation_items) < 2:
            violation_items.append("• Re-evaluate when evidence is clearer")
        
        state.verdict = VerdictOutput(
            verdict="ignore",
            reasoning="Contract violations detected during evaluation",
            action_items=violation_items,
            timeline="wait 6+ months",
            confidence="high",
        )
        return state

    # Enhance prompt with memory context if available
    if state.memory_hints and state.memory_hints != "No relevant memories found.":
        # Create enhanced prompt
        enhanced_prompt = enhance_verdict_prompt(
            base_prompt=BASE_VERDICT_PROMPT.format_messages(
                signal=state.signal.model_dump(),
                reality_check=state.reality_check.model_dump(),
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
    parser = JsonOutputParser(pydantic_object=VerdictOutput)
    chain = VERDICT_PROMPT_WITH_MEMORY | llm | parser

    result = chain.invoke(
        {
            "signal": state.signal.model_dump(),
            "reality_check": state.reality_check.model_dump(),
            "format_instructions": parser.get_format_instructions(),
        }
    )

    state.verdict = VerdictOutput(**result)

    # Memory calibration: Adjust confidence if memory shows contradictory patterns
    if state.verdict.confidence == "high" and state.memory_relevance_score > 0.7:
        # Check for contradiction patterns in memory
        if state.memory_hints and "contradict" in state.memory_hints.lower():
            state.verdict.confidence = "medium"
            state.verdict.reasoning += (
                " [Confidence lowered due to contradictory memory patterns]"
            )

    # Calculate evidence-verdict alignment
    state.evidence_verdict_alignment = calculate_alignment(
        state.verdict.confidence, evidence_strength
    )

    # Calculate overall chain coherence (include memory relevance)
    if state.memory_relevance_score:
        coherence_components = [
            state.signal_evidence_alignment or 0.5,
            state.evidence_verdict_alignment or 0.5,
            state.memory_relevance_score,
        ]
        state.chain_coherence_score = round(
            sum(coherence_components) / len(coherence_components), 3
        )
    else:
        state.chain_coherence_score = round(
            (state.signal_evidence_alignment + state.evidence_verdict_alignment) / 2.0,
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
    if state.chain_coherence_score is None:
        evidence_strength = evidence_strength_from_market(
            state.reality_check.market_signal if state.reality_check else "weak",
            state.reality_check.hype_score if state.reality_check else 0,
        )

        signal_alignment = (
            calculate_alignment(
                state.signal.confidence_level or "low", evidence_strength
            )
            if state.signal
            else 0.5
        )

        verdict_alignment = (
            calculate_alignment(
                state.verdict.confidence if state.verdict else "medium",
                evidence_strength,
            )
            if state.verdict
            else 0.5
        )

        state.chain_coherence_score = round(
            (signal_alignment + verdict_alignment) / 2, 3
        )

    return state


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def check_contract(condition, reason, state):
    """Check for contract violations"""
    if condition:
        state.contract_violation = True
        state.violations.append(reason)


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


# ============================================================================
# GRAPH CONSTRUCTION
# ============================================================================

workflow = StateGraph(AxiomState)

# Add nodes with memory integration
workflow.add_node("memory_context", memory_context_node)  # PRE: Load memories
workflow.add_node("signal_framing", signal_framing_node)  # LTM-informed
workflow.add_node("reality_check", reality_check_node)  # STM-informed
workflow.add_node("verdict", verdict_node)  # LTM+STM integration
workflow.add_node("memory_store", memory_store_node)  # POST: Store/update

# Define the flow
workflow.add_edge("memory_context", "signal_framing")  # Memories → Analysis
workflow.add_edge("signal_framing", "reality_check")  # Signal → Reality
workflow.add_edge("reality_check", "verdict")  # Reality → Verdict
workflow.add_edge("verdict", "memory_store")  # Verdict → Memory update
workflow.add_edge("memory_store", END)  # Complete cycle

# Set entry point
workflow.set_entry_point("memory_context")

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
