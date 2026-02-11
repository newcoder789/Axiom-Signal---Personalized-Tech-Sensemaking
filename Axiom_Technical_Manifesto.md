# Axiom Technical Manifesto: Capability Map & Interface Spec

**Project Name**: Axiom Signal  
**Core Thesis**: Technical sensemaking for high-velocity builders via real-time journey synthesis.

---

## 1. Core Feature Set & Capability Map

### A. Live RAG Journaling (The "Journey Merger")
*   **Interaction**: User types in a live editor.
*   **Mechanism**: The system performs 1000ms "Pulse Checks" on unsaved buffers.
*   **AI Context**: Merges the "Live Unsaved Thought" with "Journal Scoped" memory. 
*   **Bot-to-Bot Note**: When querying this, always pass `latestEntry` and `journalId` to get the most relevant architectural advice.

### B. Proactive Advice Engine (Notification Layer)
*   **Interaction**: Silent notifications appear in the sidebar or via dashboard alerts.
*   **Mechanism**: A background `PatternDetector` scans SQL `user_memory` and Redis vector stores for repetitions, contradictions, or technical debt patterns.
*   **Reaction Type**: Template-based advice with "Actionable" buttons (e.g., "Install Rust", "Add Focus Session").

### C. Decision Adjudication (Axiom with Power)
*   **Interaction**: "Decide Now" interface or "Verdict" cards.
*   **Mechanism**: Multi-step LangGraph workflow (`reality_check_node`, `verdict_node`).
*   **Output**: Structured Verdict (verdict, confidence score, 3-point reasoning, action items, and market signal analysis).

### D. Executive Synthesis (Pitch Mode)
*   **Interaction**: One-click "Generate Pitch" in the Assistant Panel.
*   **Mechanism**: Synthesizes the "Narrative Arc" from unstructured historical data into a 5-pillar report (Vision, Architecture, Milestones, Friction, Future Roadmap).
*   **Bot-to-Bot Note**: This is the primary endpoint for extracting a "Judge-Ready" project state.

### E. Technical Snapshots (History Detail)
*   **Interaction**: Clicking a past decision in the timeline.
*   **Mechanism**: Instant local synthesis of event metadata (`topic`, `verdict`, `confidence`) into a concise card, avoiding redundant API calls.

---

## 2. Interaction Model: User <-> AI

| User Action | System Interaction | Logic Trigger |
| :--- | :--- | :--- |
| **Typing a Note** | Live memory lookup/related entry suggestions. | Semantic similarity search (Redis). |
| **Solving Friction** | Assistant identifies the bottleneck and suggests a "Strategic Pivot." | `analyze` or `quick-advice` task. |
| **Reviewing History** | Timeline rendering with pulse/impact scores. | Drizzle ORM query over SQL history. |
| **Pitching to Judges** | Premium markdown report with gold-glow styling. | `generate_pitch` handler. |

---

## 3. High-Signal Tech Stack
*   **Frontend**: Next.js 15, Framer Motion (Animations), Tailwind (Glassmorphism).
*   **Backend**: FastAPI (Python), LangChain/LangGraph (Reasoning).
*   **Memory**: Redis (Vector DB for RAG), Postgres/SQLite (Structured History).
*   **Systems Layer**: Rust & Tokyo (Performance-critical concurrency).

---
**Technical Signature**: Axiom-v1.0.0-Hackathon-Stable
