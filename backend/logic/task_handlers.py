from typing import List, Dict, Any, Optional
from datetime import datetime
import os
from sqlmodel import Session, select
from database.engine import engine
from database.models import UserMemory
from memory.memory_service import MemoryService
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from logic.pattern_detector import PatternDetector
from events.event_manager import AgentEventManager

import logging

from memory.manager import AxiomMemoryManager

logger = logging.getLogger(__name__)

class AxiomSignalHandlers:
    def __init__(self):
        logger.info("Initializing AxiomSignalHandlers...")
        self.memory_service = MemoryService()
        self.memory_manager = AxiomMemoryManager() # Redis memory
        self.event_manager = AgentEventManager.get_instance()
        self.llm = ChatGroq(
            temperature=0.1,
            model_name="llama-3.3-70b-versatile"
        )
        self.engine = engine
        logger.info(f"AxiomSignalHandlers initialized. Engine available: {hasattr(self, 'engine')}")

    async def _emit_status(self, user_id: str, message: str):
        """Helper to emit task status events."""
        await self.event_manager.emit("AGENT_STATUS", {
            "user_id": user_id,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        })

    async def execute_task(self, task_id: str, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Unified entry point for task execution."""
        logger.info(f"Executing task: {task_id} for user: {user_id}")
        logger.info(f"Self state - Engine attr: {hasattr(self, 'engine')}")
        await self._emit_status(user_id, f"Initializing {task_id} handler...")
        method_map = {
            'analyze': self.analyze,
            'summarize': self.summarize,
            'extract-actions': self.extract_actions,
            'find-contradictions': self.find_contradictions,
            'quick-advice': self.quick_advice,
            'daily-review': self.daily_review,
            'decide-now': self.decide_now,
            'extract-tasks': self.extract_tasks,
            'generate_pitch': self.generate_pitch
        }
        
        handler = method_map.get(task_id)
        if not handler:
            return {"success": False, "error": f"Task {task_id} not implemented"}
            
        try:
            return await handler(user_id, context)
        except Exception as e:
            print(f"Error executing task {task_id}: {e}")
            return {"success": False, "error": str(e)}

    async def summarize(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Summarize recent memories, prioritizing journal-local context if provided."""
        # Force a sync to ensure fresh data for the summary
        from logic.data_bridge import data_bridge
        await data_bridge.sync_now()
        
        journal_id = context.get("journalId")
        
        if journal_id:
            memories = self.memory_service.get_memories_by_journal(user_id, journal_id, limit=20)
            logger.info(f"Summarizing for specific journal {journal_id}. Found {len(memories)} entries.")
        else:
            memories = self.memory_service.get_recent_memories(user_id, limit=15)
        
        content_text = "\n".join([f"[{m.content_type}] {m.content}" for m in memories])

        # Merge live unsaved content if provided
        latest = context.get("latestEntry")
        if latest:
            content_text = f"=== CURRENT UNSAVED THOUGHT ===\n{latest}\n\n=== PAST JOURNEY ===\n" + content_text

        # Backup: Pull from Redis if SQLite is empty and no content (past or live)
        if not content_text and not journal_id:
            logger.info("SQLite memories empty, attempting Redis pull...")
            # Use demo profile as fallback for identification
            demo_profile = "Backend developer, 3 years experience, focused on Rust and systems programming."
            redis_summary = self.memory_manager.get_user_profile_summary(demo_profile)
            redis_decisions = redis_summary.get('recent_decisions', [])
            content_text = "\n".join([f"[REDIS_DECISION] {d.get('topic')}: {d.get('verdict')}" for d in redis_decisions])
        
        if not content_text and not context.get("conversation_history"):
            return {"success": False, "error": "No recent activity found to summarize"}
            
        # Add conversation context if available
        if context.get("conversation_history"):
            content_text += f"\n\n=== RECENT CONVERSATION ===\n{context.get('conversation_history')}"
        
        await self._emit_status(user_id, "Generating semantic summary...")
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are the Axiom Signal Engine. Provide a high-level technical summary.
            IMPORTANT: Clearly distinguish between 'Journal Activity' (what the user recorded) and 'Development Context' (the current conversation/working session).
            Filter out low-signal noise.
            Voice: Concise, Professional, Objective."""),
            ("user", "CONTEXT TO SUMMARIZE:\n{content}")
        ])
        
        chain = prompt | self.llm
        response = await chain.ainvoke({"content": content_text})
        
        return {
            "taskId": "summarize",
            "success": True,
            "summary": response.content,
            "timestamp": datetime.utcnow().isoformat()
        }

    def _clean_json_output(self, content: str) -> str:
        """Helper to clean LLM output for JSON parsing using regex."""
        import re
        content = content.strip()
        
        # Try to find JSON array or object
        match = re.search(r'(\[.*\]|\{.*\})', content, re.DOTALL)
        if match:
            return match.group(1).strip()
            
        return content.strip()

    def _parse_llm_list(self, response_content: str) -> List[str]:
        """Robustly parse a list of strings from LLM output (JSON or Bullets)."""
        import re
        import json
        
        # 1. Try JSON list extraction
        cleaned = self._clean_json_output(response_content)
        if cleaned.startswith('['):
            try:
                data = json.loads(cleaned)
                if isinstance(data, list):
                    return [str(i) for i in data]
            except:
                pass
                
        # 2. Try Markdown Bullet Point Extraction as fallback
        lines = response_content.strip().split('\n')
        bullets = []
        for line in lines:
            line = line.strip()
            # Match lines starting with -, *, or 1.
            m = re.match(r'^[-*\d\.]+\s+(.*)', line)
            if m:
                bullets.append(m.group(1).strip())
            elif line and not line.startswith('`') and not line.startswith('{') and len(line) > 5:
                # If it's just a raw line that looks like a task/sentence
                # But filter out common LLM conversational filler
                if not any(word in line.lower() for word in ["here are", "sure,", "found the following"]):
                    bullets.append(line)
        
        return bullets

    async def analyze(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Perform deep architectural and technical analysis."""
        # NEW: Force a sync before analysis to ensure fresh data
        from logic.data_bridge import data_bridge
        await data_bridge.sync_now()
        
        journal_id = context.get("journalId")
        if journal_id:
            memories = self.memory_service.get_memories_by_journal(user_id, journal_id, limit=30)
            logger.info(f"Analyzing specific journal {journal_id}. Found {len(memories)} entries.")
        else:
            memories = self.memory_service.get_recent_memories(user_id, limit=20)

        # Construction of Evidence
        journals = [m for m in memories if m.content_type in ['journal', 'verdict']]
        journal_text = "\n".join([f"[{m.content_type}] {m.content}" for m in journals])
        
        # Merge live unsaved content if provided
        latest = context.get("latestEntry")
        if latest:
            journal_text = f"=== CURRENT UNSAVED THOUGHT ===\n{latest}\n\n=== PAST JOURNEY ===\n" + journal_text

        if not journal_text:
            return {"success": False, "error": "No memories or current thoughts found to analyze"}
        
        # Only add history as secondary context
        context_text = ""
        if context.get("conversation_history"):
            context_text = f"\n\n=== RECENT CONVERSATION (Context Only) ===\n{context.get('conversation_history')}"

        await self._emit_status(user_id, "Performing deep architectural audit...")
        
        # Enhance prompt for "Decision Intelligence" and structured audit output
        system_msg = """You are the Axiom Decision Intelligence Engine.
TECHNICAL CHALLENGE: Analyze USER'S JOURNAL ENTRIES to build a structured 'Decision Evidence Ledger'.
Identify architectural drift, technical trade-offs, and strategic pivots.

REPORT REQUIREMENTS:
1. ONLY extract evidence from the provided 'JOURNAL ENTRIES'.
2. Identify specific 'Evidence' items with high technical signal.
3. For each Evidence item, assign a 'type': 'Trade-off', 'Architectural Drift', or 'Strategic Pivot'.
4. List 'Sources' as professional audit references (e.g., "Audited via: [Entry Title]").
5. Voice: Expert-to-Expert, objective, and audited.

You MUST return a JSON object with this EXACT structure:
{{
  "summary": "Full markdown report with sections: Decision Arc, Alignment Check, Pattern Twitches, Expert Provocation",
  "evidence": [
    {{ "title": "Identifying Name", "type": "Trade-off|Drift|Pivot", "snippet": "Technical verification of the finding" }}
  ],
  "sources": ["Audited via: Entry Name/Date"]
}}"""

        import json
        
        system_msg += "\n\nCRITICAL: Return ONLY and EXACTLY the JSON object. Do not wrap in ```json blocks."

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_msg),
            ("user", f"JOURNAL ENTRIES ({len(journals)} items):\n{journal_text}\n\n{context_text}")
        ])
        
        # Use direct invocation and manual parsing to be more robust
        chain = prompt | self.llm
        response = await chain.ainvoke({})
        
        try:
            content = self._clean_json_output(response.content)
            result = json.loads(content)
        except Exception as e:
            logger.error(f"Failed to parse analyze JSON: {e}. Content: {response.content[:500]}")
            # Fallback for demo stability
            return {
                "taskId": "analyze",
                "success": True, 
                "summary": response.content if "Narrative" in response.content else "Analysis generated, but in unformatted state. Please try again.",
                "evidence": [],
                "sources": [],
                "timestamp": datetime.utcnow().isoformat()
            }
        
        return {
            "taskId": "analyze",
            "success": True,
            "summary": result.get("summary", "Analysis failed to generate report."),
            "evidence": result.get("evidence", []),
            "sources": result.get("sources", []),
            "timestamp": datetime.utcnow().isoformat()
        }

    async def extract_actions(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract immediate technical actions from recent notes, scoped to journal if provided."""
        latest = context.get("latestEntry")
        journal_id = context.get("journalId")
        
        # 1. Gather Context
        if journal_id:
            memories = self.memory_service.get_memories_by_journal(user_id, journal_id, limit=10)
        else:
            memories = self.memory_service.get_recent_memories(user_id, limit=10)
            
        history_text = "\n".join([f"HISTORY: {m.content}" for m in memories])
        
        # 2. Prioritize Live Content
        content_text = history_text
        if latest:
            content_text = f"=== CURRENT LIVE THOUGHT (Unsaved) ===\n{latest}\n\n=== RECENT HISTORY ===\n{history_text}"
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Extract a list of IMMEDIATE technical or research actions from the 'CURRENT LIVE THOUGHT'.
            Use 'RECENT HISTORY' only for context. 
            Focus on commands to run, libraries to install, or docs to read.
            Return as a JSON list of strings. If none, return []."""),
            ("user", "{content}")
        ])
        
        # Robust parsing
        chain = prompt | self.llm
        response = await chain.ainvoke({"content": content_text})
        
        actions = self._parse_llm_list(response.content)
        
        return {
            "taskId": "extract-actions",
            "success": True,
            "actions": actions,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def extract_tasks(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract broader project tasks or milestones."""
        latest = context.get("latestEntry")
        journal_id = context.get("journalId")
        
        if journal_id:
            memories = self.memory_service.get_memories_by_journal(user_id, journal_id, limit=15)
        else:
            memories = self.memory_service.get_recent_memories(user_id, limit=15)
            
        history_text = "\n".join([f"HISTORY: {m.content}" for m in memories])

        content_text = history_text
        if latest:
            content_text = f"=== CURRENT LIVE THOUGHT (Unsaved) ===\n{latest}\n\n=== RECENT HISTORY ===\n{history_text}"
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Extract a list of HIGH-LEVEL PROJECT TASKS from the 'CURRENT LIVE THOUGHT'.
            Use 'RECENT HISTORY' to de-duplicate.
            Focus on features, refactors, or milestones.
            Return as a JSON list of strings. If none, return []."""),
            ("user", "{content}")
        ])
        
        chain = prompt | self.llm
        response = await chain.ainvoke({"content": content_text})
    
        tasks = self._parse_llm_list(response.content)
    
        return {
            "taskId": "extract-tasks",
            "success": True,
            "tasks": tasks,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def find_contradictions(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Find conflicting thoughts or decisions, strictly checking Live Input vs History."""
        latest = context.get("latestEntry")
        journal_id = context.get("journalId")
        
        # 1. Gather Context
        if journal_id:
            memories = self.memory_service.get_memories_by_journal(user_id, journal_id, limit=20)
        else:
            memories = self.memory_service.get_recent_memories(user_id, limit=20)
            
        history_text = "\n".join([f"[{m.created_at}] {m.content}" for m in memories])
        
        # 2. If no live input, fallback to standard pattern detection
        if not latest:
            detector = PatternDetector()
            patterns = await detector.analyze_patterns(user_id, trigger="task")
            return {
                "taskId": "find-contradictions",
                "success": True,
                "contradictions": [p for p in patterns if p["type"] == "contradiction"],
                "timestamp": datetime.utcnow().isoformat()
            }

        # 3. LLM Check: Live Input vs History
        system_msg = """You are the Axiom Consistency Engine.
        TASK: Check if the USER'S CURRENT THOUGHT contradicts their PAST JOURNEY/DECISIONS.
        
        INPUT:
        1. CURRENT THOUGHT (Unsaved)
        2. PAST JOURNEY (Historical data)
        
        OUTPUT:
        - Return a JSON list of strings.
        - Each string must be a specific contradiction found.
        - If the current thought aligns with history or is neutral, return [].
        - IGNORE "learning new things" as a contradiction. Focus on "Strategic Pivots" (e.g. "I love Rust" vs "I hate Rust").
        """
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_msg),
            ("user", f"CURRENT THOUGHT:\n{latest}\n\nPAST JOURNEY:\n{history_text}")
        ])
        
        chain = prompt | self.llm
        response = await chain.ainvoke({})
    
        contradictions = self._parse_llm_list(response.content)

        return {
            "taskId": "find-contradictions",
            "success": True,
            "contradictions": contradictions,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def quick_advice(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate immediate advice based on the latest entry and journal journey."""
        latest = context.get("latestEntry")
        journal_id = context.get("journalId")
        
        journey_context = ""
        if journal_id:
            past_memories = self.memory_service.get_memories_by_journal(user_id, journal_id, limit=10)
            journey_context = "\n".join([f"PAST_{m.content_type}: {m.content[:200]}" for m in past_memories])

        # Fallback if no live typing
        if not latest:
            if journal_id:
                memories = self.memory_service.get_memories_by_journal(user_id, journal_id, limit=1)
            else:
                memories = self.memory_service.get_recent_memories(user_id, limit=1)
            latest = memories[0].content if memories else "No recent context."
            
        system_prompt = """You are Axiom Signal. Provide ONE high-impact technical insight or strategic 'provocation' (question).
        
        CONTEXT:
        The user is typing a 'CURRENT THOUGHT'.
        Compare it against their 'JOURNEY CONTEXT'.
        
        GOAL:
        - If they are stuck, unblock them.
        - If they are excited, ground them with a trade-off check.
        - If they are contradictory, gently point it out.
        
        Start directly with the insight. No "Here is some advice".
        """
            
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", f"JOURNEY CONTEXT:\n{journey_context}\n\nCURRENT LINKED THOUGHT:\n{latest}")
        ])
        
        chain = prompt | self.llm
        response = await chain.ainvoke({})
        
        return {
            "taskId": "quick-advice",
            "success": True,
            "advice": response.content,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def daily_review(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a daily review report."""
        with Session(self.engine) as session:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            statement = select(UserMemory).where(
                UserMemory.user_id == user_id,
                UserMemory.created_at >= today_start
            )
            today_memories = session.exec(statement).all()
            
        if not today_memories:
            return {
                "taskId": "daily-review",
                "success": True,
                "review": {
                    "text": "Your terminal is quiet today! No technical entries recorded for the current 24h cycle.",
                    "stats": {
                        "entries": 0,
                        "totalWords": 0,
                        "topTopics": []
                    }
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
        total_words = sum([len(m.content.split()) for m in today_memories])
        topics = []
        for m in today_memories:
            if m.tags: topics.extend(m.tags.split(','))
            
        top_topics = sorted(set(topics), key=topics.count, reverse=True)[:3]
        
        summary_prompt = ChatPromptTemplate.from_messages([
            ("system", "Summarize today's technical progress and identify the primary focus based on these entries."),
            ("user", "{content}")
        ])
        
        content_text = "\n".join([m.content for m in today_memories])
        chain = summary_prompt | self.llm
        review_text = await chain.ainvoke({"content": content_text})
        
        return {
            "taskId": "daily-review",
            "success": True,
            "review": {
                "text": review_text.content,
                "stats": {
                    "entries": len(today_memories),
                    "totalWords": total_words,
                    "topTopics": top_topics
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }

    async def decide_now(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Help make decisions on pending items OR the current live thought."""
        latest = context.get("latestEntry")
        
        # 1. LIVE CONTEXT MODE: Analyze the current thought for a decision
        if latest:
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are the Axiom Decision Engine.
                The user is writing a technical thought that may need a decision.
                1. Identify the core dilemma or choice (if any).
                2. Provide a 'Proposed Verdict' (Pursue/Explore/Ignore) with reasoning.
                3. Listing 2-3 pros/cons.
                
                Return specific, decisive guidance.
                """),
                ("user", f"CURRENT THOUGHT:\n{latest}")
            ])
            chain = prompt | self.llm
            response = await chain.ainvoke({})
            return {
                "taskId": "decide-now",
                "success": True,
                "decisions": [
                    {
                        "id": "live-1", 
                        "verdict": "LIVE ANALYSIS", 
                        "reasoning": response.content
                    }
                ],
                "timestamp": datetime.utcnow().isoformat()
            }

        # 2. PENDING MODE: Fetch from DB
        with Session(self.engine) as session:
            statement = select(UserMemory).where(
                UserMemory.user_id == user_id,
                UserMemory.content_type == 'verdict',
                UserMemory.is_archived == False
            ).order_by(UserMemory.created_at.desc()).limit(5)
            pending = session.exec(statement).all()
            
        if not pending:
            # Backup: Pull from Redis
            redis_summary = self.memory_manager.get_user_profile_summary("developer")
            redis_decisions = [d for d in redis_summary.get('recent_decisions', []) if d.get('verdict') in ['pursue', 'explore', 'watchlist']]
            
            if not redis_decisions:
                return {
                    "taskId": "decide-now",
                    "success": True,
                    "summary": "All caught up! No pending items found.",
                    "decisions": [],
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            content_text = "\n".join([f"REDIS_ID: {d.get('id')} - Topic: {d.get('topic')} -> {d.get('verdict')}" for d in redis_decisions])
        else:
            content_text = "\n".join([f"ID: {m.id} - Content: {m.content}" for m in pending])
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Analyze these technical items and provide a recommended verdict (PURSUE, EXPLORE, WATCHLIST, or IGNORE) for each with a brief reasoning. Return as JSON list of objects: {{id, verdict, reasoning}}."),
            ("user", "{content}")
        ])
        
        import json
        parser = JsonOutputParser()
        chain = prompt | self.llm | parser
        decisions = await chain.ainvoke({"content": content_text})
        
        return {
            "taskId": "decide-now",
            "success": True,
            "decisions": decisions,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def generate_pitch(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesize a 'Pitch-Ready' narrative from the journal journey."""
        from logic.data_bridge import data_bridge
        await data_bridge.sync_now()
        
        journal_id = context.get("journalId")
        if not journal_id:
            return {"success": False, "error": "Pitch generation requires a specific journal context."}
            
        memories = self.memory_service.get_memories_by_journal(user_id, journal_id, limit=50)
        if not memories:
            return {"success": False, "error": "Not enough data in this journal to generate a pitch."}
            
        journey_text = "\n".join([f"[{m.content_type}] {m.content}" for m in memories])
        
        await self._emit_status(user_id, "Synthesizing executive technical vision...")
        
        system_msg = """You are the Axiom Strategic Architect. 
Your goal is to transform raw technical journal entries into a 'Pitch-Ready' Executive Report suitable for judges or stakeholders.

REPORT STRUCTURE:
1. **The Vision**: What is the core technical ambition documented in this journey?
2. **Technical Architecture**: What stack and patterns (e.g., Rust, Postgres, Tokyo) are being utilized or explored?
3. **Key Milestones**: What significant technical leaps or decisions were made?
4. **The Friction**: What were the real bottlenecks encountered and how were they mitigated (or what is the plan)?
5. **Future Roadmap**: Based on the trends, what is the next strategic technical move?

VOICE: Clear, Persuasive, Expert, and Visionary. High Signal only."""

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_msg),
            ("user", f"JOURNAL JOURNEY DATA:\n{journey_text}")
        ])
        
        chain = prompt | self.llm
        response = await chain.ainvoke({})
        
        return {
            "taskId": "generate-pitch",
            "success": True,
            "pitch_report": response.content,
            "timestamp": datetime.utcnow().isoformat()
        }
