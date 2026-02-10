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

class TaskHandlers:
    def __init__(self):
        self.memory_service = MemoryService()
        self.engine = engine
        self.llm = ChatGroq(
            temperature=0,
            model_name="llama-3.3-70b-versatile",
            groq_api_key=os.getenv("GROQ_API_KEY")
        )

    async def execute_task(self, task_id: str, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Unified entry point for task execution."""
        method_map = {
            'analyze': self.summarize,
            'summarize': self.summarize,
            'extract-actions': self.extract_actions,
            'find-contradictions': self.find_contradictions,
            'quick-advice': self.quick_advice,
            'daily-review': self.daily_review,
            'decide-now': self.decide_now,
            'extract-tasks': self.extract_actions
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
        """Summarize recent memories."""
        memories = self.memory_service.get_recent_memories(user_id, limit=15)
        if not memories:
            return {"success": False, "error": "No recent memories to summarize"}
        
        content_text = "\n".join([f"[{m.content_type}] {m.content}" for m in memories])
        
        # Add conversation context if available
        if context.get("conversation_history"):
            content_text += f"\n\n=== RECENT CONVERSATION ===\n{context.get('conversation_history')}"
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are the Axiom Signal Engine. Your goal is high-signal technical sensemaking.
            Summarize the following notes by identifying the core 'Signal' (what matters) and filtering out the 'Noise'.
            Look for pivots in technical strategy, underlying architectural patterns, and implicit risks.
            Be decisive, expert, and brief."""),
            ("user", "{content}")
        ])
        
        chain = prompt | self.llm
        response = await chain.ainvoke({"content": content_text})
        
        return {
            "taskId": "summarize",
            "success": True,
            "summary": response.content,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def extract_actions(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract actionable items from recent notes."""
        memories = self.memory_service.get_recent_memories(user_id, limit=10)
        content_text = "\n".join([m.content for m in memories])
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Extract a list of specific, actionable TODO items from these notes. Return as a JSON list of strings. If no actions found, return an empty list []."),
            ("user", "{content}")
        ])
        
        parser = JsonOutputParser()
        chain = prompt | self.llm | parser
        actions = await chain.ainvoke({"content": content_text})
        
        return {
            "taskId": "extract-actions",
            "success": True,
            "actions": actions,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def find_contradictions(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Find conflicting thoughts or decisions."""
        detector = PatternDetector()
        patterns = await detector.analyze_patterns(user_id, trigger="task")
        contradictions = [p for p in patterns if p["type"] == "contradiction"]
        
        return {
            "taskId": "find-contradictions",
            "success": True,
            "contradictions": contradictions,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def quick_advice(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate immediate advice based on the latest entry."""
        latest = context.get("latestEntry")
        if not latest:
            memories = self.memory_service.get_recent_memories(user_id, limit=1)
            latest = memories[0].content if memories else ""
            
        if not latest:
            return {"success": False, "error": "No recent entry found"}
            
        history = context.get("conversation_history", "")
        strategy = context.get("agent_strategy", {})
        verbosity = strategy.get("verbosity", "balanced")
        
        system_prompt = """You are Axiom Signal. Provide one high-impact technical insight or a strategic 'provocation' (question) based on the latest note.
        Focus on trade-offs, scalability, or developer velocity. No generic advice.
        Voice: Direct, Minimalist, Expert."""
        
        if verbosity == "high":
            system_prompt = """You are Axiom Signal. Provide a deep architectural insight and a proactive follow-up based on context.
            Connect this note to previous interactions if possible. Identify deep patterns.
            Voice: Proactive, Sophisticated, Correlative."""
        elif verbosity == "low":
            system_prompt = "Provide a single, 10-word technical tip. No filler."
            
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", f"Context:\n{history}\n\nLatest Note:\n{{latest}}")
        ])
        
        chain = prompt | self.llm
        response = await chain.ainvoke({"latest": latest})
        
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
            return {"success": False, "error": "No activity recorded today"}
            
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
        """Help make decisions on pending items."""
        # Fetch pending decisions
        with Session(self.engine) as session:
            statement = select(UserMemory).where(
                UserMemory.user_id == user_id,
                UserMemory.content_type == 'verdict',
                UserMemory.is_archived == False
            ).order_by(UserMemory.created_at.desc()).limit(5)
            pending = session.exec(statement).all()
            
        if not pending:
            return {"success": False, "error": "No pending items found"}
            
        content_text = "\n".join([f"ID: {m.id} - Content: {m.content}" for m in pending])
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Analyze these technical items and provide a recommended verdict (PURSUE, EXPLORE, WATCHLIST, or IGNORE) for each with a brief reasoning. Return as JSON list of objects: {id, verdict, reasoning}."),
            ("user", "{content}")
        ])
        
        parser = JsonOutputParser()
        chain = prompt | self.llm | parser
        decisions = await chain.ainvoke({"content": content_text})
        
        return {
            "taskId": "decide-now",
            "success": True,
            "decisions": decisions,
            "timestamp": datetime.utcnow().isoformat()
        }
