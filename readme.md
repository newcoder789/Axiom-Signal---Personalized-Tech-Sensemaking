# Axiom

**Axiom** is a career-relevant tech sensemaking engine.  
It helps users decide **what technology trends actually matter to them**, why they matter, and how they connect to skills, money, and real-world traction — instead of drowning in hype, news feeds, and shallow tutorials.

---

## The Problem

Most tech content today fails in predictable ways:

- It reports *what happened*, not *why it matters*
- It avoids calling out bad or misleading ideas
- It treats all users the same, regardless of career stage or goals
- It disconnects technology from **skills, incentives, and economic reality**

As a result, engineers, founders, and students waste time chasing trends that never pay off.

---

## The Axiom Approach

Axiom is **not** a news app, tutorial platform, or hype feed.

Instead, it answers questions like:

- *Should I care about this technology?*
- *Who is paying for this right now — not “someday”?*
- *Is this real traction or fake momentum?*
- *What skills does this map to in the real job market?*

Axiom filters technology through **context**, not popularity.

---

## Who This Is For

- Early-career engineers who don’t want to chase every trend
- Indie hackers looking for second-order ideas
- Founders who want filters, not feeds
- Students 6–18 months ahead of the herd

---

## Core Idea

Users describe themselves in plain language:

> “I’m a backend engineer with 2 years of experience, interested in AI infra, and want stable income growth.”

Axiom then uses **agentic AI workflows** to:
- Analyze relevant tech signals
- Evaluate real-world traction
- Connect tech → skills → money → risk
- Produce **explainable, opinionated insights**

No generic summaries. No hype recycling.

---

## High-Level Architecture

### Agentic System (LangGraph)

Axiom is built using **LangGraph**, enabling structured, multi-step reasoning workflows:

- **Signal Analysis Agent**  
  Extracts and interprets tech signals (news, tools, ideas)

- **Reality Check Agent**  
  Evaluates adoption, funding, hiring signals, and economic incentives

- **Career Mapping Agent**  
  Maps technologies to skills, roles, and time-to-value

- **Decision Synthesis Agent**  
  Produces a final, explainable recommendation:
  - Why it matters (or doesn’t)
  - Who benefits
  - Who should ignore it

Workflows include:
- Sequential reasoning
- Conditional branching
- Iterative refinement

---

## Observability & Evaluation (Opik)

Axiom integrates **Opik** for:

- Agent trace observability
- Prompt and reasoning evaluation
- Output comparison and feedback loops
- Iterative improvement of decision quality

This ensures Axiom is **inspectable, debuggable, and improvable**, not a black box.

---

## Current Status (Hackathon Phase)

✅ Problem definition and scope  
✅ User personas and decision framing  
✅ Agent workflow design (LangGraph)  
✅ Evaluation strategy using Opik  

🚧 Backend implementation in progress  
🚧 Agent execution and persistence  
🚧 Minimal demo interface

---

## Tech Stack (Planned)

- **LangGraph** — agentic workflows
- **LLMs** — reasoning and synthesis
- **Opik** — observability and evaluation
- **Python** — backend logic
- **SQLite / simple DB** — persistence (initial)
- **Minimal frontend** — demo interface

---

## Roadmap (Post-Hackathon)

- Personalized long-term user memory
- Journaling and insight saving
- Interactive “why / why not” conversations
- Newsletter and digest formats
- Stronger signal sourcing and redundancy

---

## Philosophy

Axiom is opinionated by design.

Clarity beats completeness.  
Context beats content volume.  
Reality beats hype.

---

## Disclaimer

Axiom is an evolving research and product prototype.  
Outputs are meant to support decision-making, not replace judgment.

---

## Team

Built during the Comet Resolution Hackathon by an independent team exploring **career-relevant AI decision systems**.
