"""
Axiom v0 - LangGraph Pipeline (Day 4 - Fixed Prompts)
3-node decision pipeline: Signal Framing → Reality Check → Verdict Synthesis

Day 4 Status: Fixed verdict logic to not ignore everything
Key changes:
- Clarified market_signal meanings (mixed ≠ weak)
- Better hype score calibration (established tech = 3-5, not 6)
- Strengthened decision rules with concrete examples
"""

from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field
from typing import Optional, Literal
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from dotenv import load_dotenv
import os

load_dotenv()

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
    """State that flows through the entire pipeline"""

    topic: str
    user_profile: str
    signal: Optional[SignalFramingOutput] = None
    reality_check: Optional[RealityCheckOutput] = None
    verdict: Optional[VerdictOutput] = None


# ============================================================================
# LLM SETUP
# ============================================================================

llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.1,
)


# ============================================================================
# PROMPTS (Fixed - Day 4)
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
FEASIBILITY ASSESSMENT:(according to users current conditoin or thier  surrounding evironment of team member, their skills, undrestanding, exppreience )
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

CRITICAL CALIBRATION EXAMPLES:

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


VERDICT_PROMPT = ChatPromptTemplate.from_messages(
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
feasibiltiy measured according to users current conditoin or thier  surrounding evironment of team member, their skills, undrestanding, exppreience.
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


# ============================================================================
# NODE FUNCTIONS
# ============================================================================


def signal_framing_node(state: AxiomState) -> AxiomState:
    """Node 1: Parse and categorize the signal"""
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
    return state


def reality_check_node(state: AxiomState) -> AxiomState:
    """Node 2: Assess feasibility and detect hype"""

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
    return state


def verdict_node(state: AxiomState) -> AxiomState:
    """Node 3: Synthesize verdict and action items"""

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

    parser = JsonOutputParser(pydantic_object=VerdictOutput)
    chain = VERDICT_PROMPT | llm | parser

    result = chain.invoke(
        {
            "signal": state.signal.model_dump(),
            "reality_check": state.reality_check.model_dump(),
            "format_instructions": parser.get_format_instructions(),
        }
    )

    state.verdict = VerdictOutput(**result)
    return state


# ============================================================================
# GRAPH ASSEMBLY
# ============================================================================

workflow = StateGraph(AxiomState)

# Add nodes
workflow.add_node("signal_framing", signal_framing_node)
workflow.add_node("reality_check", reality_check_node)
workflow.add_node("verdict", verdict_node)

# Define edges (sequential flow)
workflow.add_edge("signal_framing", "reality_check")
workflow.add_edge("reality_check", "verdict")
workflow.add_edge("verdict", END)

# Set entry point
workflow.set_entry_point("signal_framing")

# Compile the graph
app = workflow.compile()


# ============================================================================
# QUICK TEST
# ============================================================================

if __name__ == "__main__":
    test_result = app.invoke(
        {
            "topic": "PostgreSQL 16",
            "user_profile": "Backend developer, 3 years experience, building data-heavy applications",
        }
    )

    print("\n" + "=" * 80)
    print("QUICK TEST OUTPUT:")
    print("=" * 80)
    print(f"Topic: PostgreSQL 16")
    print(f"Signal Status: {test_result['signal'].status}")
    print(f"Market Signal: {test_result['reality_check'].market_signal}")
    print(f"Hype Score: {test_result['reality_check'].hype_score}")
    print(f"Verdict: {test_result['verdict'].verdict}")
    print(f"Timeline: {test_result['verdict'].timeline}")
    print("=" * 80 + "\n")
