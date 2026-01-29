# Axiom v0 Node Architecture
---
## This is scoped Right for Deep Technical People:
What Deep Technical People Actually Need:

1. **Signal-to-noise filtering** ✅ (Node 1 handles this)
2. **Hype detection** ✅ (Node 2's job)
3. **Career-oriented decisions, not just "cool tech"** ✅ (Node 3's opinionated advice)

They don't need hand-holding on "what is a database" — they need someone to tell them:

"Postgres 17 has logical replication improvements, but you're running MySQL at work and not switching DBs anytime soon. Ignore for now. Revisit if you join a Postgres shop."

That's valuable. Most tools can't say "ignore this" — they try to be helpful about everything.

---

## Design Principles

1. **Single Responsibility:** Each node does ONE thing well
        This separates cognition cleanly:
            Parsing ≠ judging ≠ advising
2. **No Leakage:** Nodes cannot see beyond their defined inputs
        This enforced node blindness
            Node 2 cannot see raw input
            Node 3 cannot hallucinate new facts
            Especially banning optimism in Node 2
            Especially banning hedging in Node 3
3. **Traceable:** Every node input/output must be loggable to Opik
4. **Enforceable:** All schemas must be Pydantic-compatible

---

## Node 1: Signal Framing

### Purpose
Transform ambiguous user input into a structured, neutral signal that downstream nodes can process. This node is a **parser and categorizer**, not an analyst.

### Input Schema
```json
{
  "topic": "string (required)",
  "user_profile": "string (optional)"
}
```

**Example Input:**
```json
{
  "topic": "LangGraph",
  "user_profile": "3rd-year CS student, interested in backend + AI, preparing for job market"
}
```

### Output Schema
```json
{
  "signal_summary": "string (1-2 sentences, 
        ***a neutral description of what the topic claims to be or is commonly described as***
        )",
  "domain": "string (e.g., 'AI/ML tooling', 'database', 'frontend framework', 'DevOps')",
  "time_horizon": "enum: 'short' | 'medium' | 'long'",
  "confidence_level": "enum: 'low' | 'medium' | 'high'",
  "user_context_summary": "string (extract key facts: role, skill level, goals)"
}
```

**Example Output:**
```json
{
  "signal_summary": "LangGraph is commonly described as a library for structuring LLM applications using graph-based workflows.",
  "domain": "AI/ML tooling",
  "time_horizon": "short",
  "confidence_level": "high",
  "user_context_summary": "Student, CS background, interested in backend/AI, job-seeking phase"
}
```

### Forbidden Behaviors
- ❌ No opinions ("this is good/bad")
- ❌ No predictions ("this will become popular")
- ❌ No advice ("you should learn this")
- ❌ No analysis beyond categorization
- ❌ No speculation about user intent beyond what's stated

### Prompt Template
```
You are a technical signal parser. Your job is to extract structured information from user queries.

Given:
- Topic: {topic}
- User Profile: {user_profile}

Extract and categorize the signal. Be neutral and factual.
neutral description of what the topic claims to be or is commonly described as
Time horizon rules:
- "short" = emerging/experimental (< 1 year old OR not production-ready)
- "medium" = maturing (1-3 years, seeing adoption)
- "long" = established (3+ years, widely used)

Confidence rules:
- "high" = topic is well-defined, you know what it is
- "medium" = topic exists but details are unclear
- "low" = topic is ambiguous or you're uncertain

Return ONLY JSON. No explanations.

{format_instructions}
```

---

## Node 2: Reality Check

### Purpose
Detect hype, assess feasibility, and surface risks. This node is the **BS detector** — it challenges assumptions and flags unknowns. It does NOT give advice.

### Input Schema
```json
{
  "signal_summary": "string",
  "domain": "string",
  "time_horizon": "enum",
  "user_context_summary": "string"
}
```

(This is the ENTIRE output of Node 1)

### Output Schema
```json
{
  "feasibility": "enum: 'low' | 'medium' | 'high'",
  "market_signal": "enum: 'weak' | 'mixed' | 'strong'",
  "risk_factors": ["string array (2-4 items)"],
  "known_unknowns": ["string array (1-3 items)"],
  "hype_score": "integer (0-10, where 10 = maximum hype)",
  "evidence_summary": "string (what signals did you use to assess this?)"
}
```

**Example Output:**
```json
{
  "feasibility": "medium",
  "market_signal": "mixed",
  "risk_factors": [
    "Relatively new library (< 2 years old), API may change",
    "Requires understanding of graph concepts + LLM orchestration",
    "Smaller community compared to LangChain core"
  ],
  "known_unknowns": [
    "Production stability unclear",
    "Enterprise adoption data not available"
  ],
  "hype_score": 6,
  "evidence_summary": "Based on GitHub activity, documentation quality, and mention frequency in AI engineering communities"
}
```

### Forbidden Behaviors
- ❌ No recommendations ("you should...")
- ❌ No predictions ("this will succeed/fail")
- ❌ No personalized advice
- ❌ Cannot ignore risks to be optimistic
- ❌ Cannot assert facts without flagging uncertainty

### Rules (Hard Constraints)
1. **Must mention at least 2 risk factors**
2. **Must mention at least 1 known unknown**
3. **Hype score must be justified in evidence_summary**
4. **If time_horizon = "short", feasibility cannot be "high"**

### Prompt Template
```
You are a critical analyst. Your job is to assess feasibility and detect hype.

Given this signal:
{signal_summary}
Domain: {domain}
Time horizon: {time_horizon}
User context: {user_context_summary}

Evaluate:
1. How feasible is this for someone with this background?
2. What's the market/community signal?
3. What are the risks?
4. What don't we know?
5. How hyped is this topic? (0 = unknown, 10 = extreme hype)

Be skeptical. Surface uncertainty. Do NOT recommend actions.

Return ONLY JSON. No explanations.

{format_instructions}
```

---

## Node 3: Verdict Synthesis

### Purpose
Convert analysis into a clear, actionable decision. This is the ONLY node that gives advice. It must match the user's level and be opinionated.

### Input Schema
```json
{
  "signal": { ... },  // Full Node 1 output
  "reality_check": { ... }  // Full Node 2 output
}
```

### Output Schema
```json
{
  "verdict": "enum: 'pursue' | 'explore' | 'ignore'",
  "reasoning": "string (2-3 sentences, explain the verdict clearly)",
  "action_items": ["string array (2-4 specific next steps)"],
  "timeline": "string (when to act: 'now', 'in 3 months', 'wait 6+ months')",
  "confidence": "enum: 'low' | 'medium' | 'high'"
}
```

**Verdict Definitions:**
- **pursue** = Invest time now, this is worth learning deeply
- **explore** = Stay aware, do light research, revisit in 3-6 months
- **ignore** = Not relevant right now, focus elsewhere

**Example Output:**
```json
{
  "verdict": "explore",
  "reasoning": "LangGraph is relevant to your AI/backend interests, but it's early-stage and you have limited time as a job-seeker. Build core skills first, then explore this as a differentiation tool later.",
  "action_items": [
    "Master LangChain basics first (agents, chains, retrieval)",
    "Build 1-2 portfolio projects with standard LLM patterns",
    "Bookmark LangGraph docs, revisit in 3 months if job hunt allows"
  ],
  "timeline": "in 3 months",
  "confidence": "high"
}
```

### Forbidden Behaviors
- ❌ No hedging language ("maybe", "possibly", "you could consider")
- ❌ No generic advice ("learn the basics", "read the docs")
- ❌ Cannot contradict reality_check findings without explanation
- ❌ Must match user's skill level (don't advise PhD-level topics to beginners)

### Rules (Hard Constraints)
1. **verdict must be one of the 3 options** (no "it depends")
2. **action_items must be specific and ordered by priority**
3. **If feasibility = "low" AND user is beginner, verdict cannot be "pursue"**
4. **If hype_score > 7, reasoning must acknowledge hype**

### Prompt Template
```
You are a career advisor for technical professionals. Your job is to give clear, actionable advice.

Signal Analysis:
{signal}

Reality Check:
{reality_check}

Based on this analysis, decide:
- Should this person pursue, explore, or ignore this topic?
- What specific actions should they take?
- When should they act?

Rules:
- Be opinionated. Pick ONE verdict.
- Match advice to their skill level and goals.
- If the topic is hyped, say so.
- If it's not relevant, say "ignore" and explain why.

Return ONLY JSON. No explanations.

{format_instructions}
```

---

## Validation Checklist

Before implementing, verify:

- [ ] Node 2 can operate using ONLY Node 1's output (no direct access to user input)
- [ ] Node 3 can operate using ONLY Node 1 + Node 2 outputs
- [ ] All output schemas are Pydantic-compatible
- [ ] Each node has at least 2 forbidden behaviors listed
- [ ] Prompt templates enforce the output schema
- [ ] You can trace each node independently in Opik

---

## Next Steps (Day 4)

1. Convert these specs into Pydantic models (`models.py`)
2. Implement 3 node functions (`nodes.py`)
3. Wire with LangGraph (`graph.py`)
4. Test with 2-3 example queries
5. Verify output quality before adding Opik tracing

---

**Notes:**
- Deferred (Intentionally Out of Scope for v0)
- Ground truth verification (web / RAG)
- Source attribution per claim
- Cross-node contradiction detection
- Guardrails for factual accuracy
- Model specialization per node