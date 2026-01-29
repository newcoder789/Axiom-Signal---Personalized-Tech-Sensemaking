"""
Axiom v0 - LangGraph Pipeline
3-node decision pipeline: Signal Framing → Reality Check → Verdict Synthesis

Day 3 Status: Core pipeline functional, ready for evaluation testing
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
        None, description="Maturity level: short (<1yr), medium (1-3yr), long (3+yr)"
    )
    confidence_level: Optional[Literal["low", "medium", "high"]] = Field(
        None,  description="Confidence in understanding what the topic is"
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
# PROMPTS (One for each node)
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
- confidence_level: "low","medium","high"
- user_context_summary: string (summarize how this relates to the user profile)

signal_summary rules:
- May ONLY paraphrase common descriptions
- MUST include uncertainty if present
- MUST NOT introduce new technical claims

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

CRITICAL RULES:
1. If evidence is indirect or inferred, SAY SO in evidence_summary.
2. If patterns are based on similar past trends, say "based on analogous patterns".
3. Do NOT fill gaps with guesses.
4. Unknowns are valid answers - state them explicitly.
5. Be harsh on hype. Do not soften risk factors.

Hype scale (anchor it):
- 0–2: obscure / barely discussed
- 3–5: niche but real
- 6–8: popular, possibly inflated
- 9–10: hype-driven, noise > signal

evidence_summary:
- If no direct sources are provided, MUST state:
  "Assessment based on general ecosystem patterns, not direct evidence"

risk_factors rules:
- Must mention at least 2 concrete risks
- Be specific (not "may be challenging" but "steep learning curve for X")

Do NOT recommend actions.
Do NOT soften risks to be encouraging.

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
Signal analysis:
{signal}

Reality check:
{reality_check}

Your job is to decide ONE verdict: "pursue", "explore", or "ignore"

CRITICAL DECISION RULES:
1. Pick exactly ONE verdict. No hedging.
2. If hype_score > 7 AND feasibility = "low" → default to "ignore"
3. If market_signal = "weak" AND user has clear modern goals → "ignore"
4. If topic is obsolete/legacy AND user wants to build new products → "ignore"
5. "Explore" is allowed ONLY if downside is low and signal is non-trivial
6. Do NOT use "explore" as a soft "no" - if it's not worth their time, say "ignore"

Action items rules:
- Must be concrete and testable
- Must reference a real artifact (repo, spec, API, benchmark, dataset)
- Must produce an observable outcome within weeks, not months
- NO generic advice like "learn more", "study fundamentals", "get familiar with"

VALID action items:
- "Build a simple CRUD app using X to test DX"
- "Read the RFC spec for Y to understand the design tradeoffs"
- "Compare benchmarks of X vs Y for your use case"

INVALID action items:
- "Learn more about X"
- "Study the fundamentals"
- "Get familiar with the ecosystem"

If the best advice is to ignore:
- Say so clearly and directly
- State the opportunity cost (what they should focus on instead)

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
# QUICK TEST (Remove before production)
# ============================================================================

if __name__ == "__main__":
    test_result = app.invoke(
        {
            "topic": "LangGraph",
            "user_profile": "3rd-year CS student interested in backend + AI, preparing for job market",
        }
    )

    print("\n" + "=" * 80)
    print("QUICK TEST OUTPUT:")
    print("=" * 80)
    print(f"Signal Status: {test_result['signal'].status}")
    print(f"Verdict: {test_result['verdict'].verdict}")
    print(f"Timeline: {test_result['verdict'].timeline}")
    print("=" * 80 + "\n")
