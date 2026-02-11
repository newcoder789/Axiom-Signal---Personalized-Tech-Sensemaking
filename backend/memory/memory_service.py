from sqlmodel import Session, select, col
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from database.models import UserMemory, AgentInteraction
from database.models import UserMemory, AgentInteraction
from database.engine import engine
from logic.agent_evolution import agent_evolution

class MemoryService:
    def __init__(self):
        self.engine = engine

    def store_memory(
        self, 
        user_id: str, 
        content_type: str, 
        content: str, 
        metadata: Dict[str, Any] = {},
        tags: List[str] = []
    ) -> int:
        """Store a new memory with automatic importance scoring."""
        
        # Auto-extract tags if none provided
        if not tags:
            tags = self._extract_tags(content)
            
        # Calculate importance
        importance = self._calculate_importance(content, content_type)
        
        memory = UserMemory(
            user_id=user_id,
            content_type=content_type,
            content=content,
            metadata_=metadata,
            tags=",".join(tags),
            importance_score=importance,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        with Session(self.engine) as session:
            session.add(memory)
            session.commit()
            session.refresh(memory)
            return memory.id

    def get_recent_memories(
        self, 
        user_id: str, 
        limit: int = 50, 
        content_type: Optional[str] = None
    ) -> List[UserMemory]:
        """Retrieve recent memories for a user."""
        with Session(self.engine) as session:
            statement = select(UserMemory).where(
                UserMemory.user_id == user_id,
                UserMemory.is_archived == False
            )
            
            if content_type:
                statement = statement.where(UserMemory.content_type == content_type)
                
            statement = statement.order_by(UserMemory.created_at.desc()).limit(limit)
            return session.exec(statement).all()

    def get_memories_by_journal(self, user_id: str, journal_id: str, limit: int = 20) -> List[UserMemory]:
        """Retrieve memories specifically associated with a journal ID."""
        with Session(self.engine) as session:
            # We search for the journal_id in the JSON metadata
            # Since SQLite JSON is stored as string, we use LIKE for robust matching
            statement = select(UserMemory).where(
                UserMemory.user_id == user_id,
                UserMemory.metadata_.like(f'%"{journal_id}"%')
            ).order_by(UserMemory.created_at.desc()).limit(limit)
            return session.exec(statement).all()

    def search_memories(self, user_id: str, query: str, limit: int = 10) -> List[UserMemory]:
        """Search memories by keyword content."""
        with Session(self.engine) as session:
            statement = select(UserMemory).where(
                UserMemory.user_id == user_id,
                UserMemory.content.ilike(f"%{query}%")
            ).order_by(UserMemory.importance_score.desc(), UserMemory.created_at.desc()).limit(limit)
            return session.exec(statement).all()

    def get_memories_by_tags(self, user_id: str, tags: List[str], limit: int = 20) -> List[UserMemory]:
        """Retrieve memories matching specific tags."""
        with Session(self.engine) as session:
            # SQLModel doesn't support array contains easily for SQLite, so we use LIKE
            # This is a simple implementation; customizable filters would be better
            conditions = []
            for tag in tags:
                conditions.append(col(UserMemory.tags).contains(tag))
                
            from sqlmodel import or_
            statement = select(UserMemory).where(
                UserMemory.user_id == user_id,
                or_(*conditions)
            ).order_by(UserMemory.importance_score.desc(), UserMemory.created_at.desc()).limit(limit)
            
            return session.exec(statement).all()

    def update_memory_importance(self, memory_id: int, delta: float):
        """Adjust the importance score of a memory."""
        with Session(self.engine) as session:
            memory = session.get(UserMemory, memory_id)
            if memory:
                memory.importance_score = min(max(memory.importance_score + delta, 0.0), 1.0)
                memory.updated_at = datetime.utcnow()
                session.add(memory)
                session.commit()

    def get_memory(self, memory_id: int) -> Optional[UserMemory]:
        """Retrieve a specific memory by ID."""
        with Session(self.engine) as session:
            return session.get(UserMemory, memory_id)

    def update_memory(self, memory_id: int, content: str = None, metadata: Dict[str, Any] = None, tags: List[str] = None):
        """Update memory content, metadata, or tags."""
        with Session(self.engine) as session:
            memory = session.get(UserMemory, memory_id)
            if memory:
                if content is not None:
                    memory.content = content
                    # Recalculate tags/importance if content changes significantly? 
                    # For now just manual update
                if metadata is not None:
                    # Update JSON metadata (merge or replace?)
                    current_meta = memory.metadata_ or {}
                    current_meta.update(metadata)
                    memory.metadata_ = current_meta
                if tags is not None:
                    memory.tags = ",".join(tags)
                
                memory.updated_at = datetime.utcnow()
                session.add(memory)
                session.commit()
                session.refresh(memory)
                return memory
            return None

    # --- Preferences ---

    def get_user_preferences(self, user_id: str) -> Any:
        """Fetch user preferences or create default if missing."""
        from database.models import UserPreference
        with Session(self.engine) as session:
            statement = select(UserPreference).where(UserPreference.user_id == user_id)
            pref = session.exec(statement).first()
            if not pref:
                pref = UserPreference(user_id=user_id)
                session.add(pref)
                session.commit()
                session.refresh(pref)
            return pref

    def update_user_preferences(self, user_id: str, settings: Dict[str, Any]) -> Any:
        """Update user preferences."""
        from database.models import UserPreference
        pref = self.get_user_preferences(user_id)
        with Session(self.engine) as session:
            session.add(pref)
            if "notification_settings" in settings:
                pref.notification_settings = settings["notification_settings"]
            if "focus_mode_settings" in settings:
                pref.focus_mode_settings = settings["focus_mode_settings"]
            pref.updated_at = datetime.utcnow()
            session.commit()
            session.refresh(pref)
            return pref

    # --- Interactions ---

    def record_interaction(self, user_id: str, interaction_type: str, content: str, related_memory_ids: List[int] = []) -> int:
        """Record an agent-initiated interaction (advice, notification)."""
        interaction = AgentInteraction(
            user_id=user_id,
            interaction_type=interaction_type,
            content=content,
            related_memory_ids=related_memory_ids,
            created_at=datetime.utcnow()
        )
        with Session(self.engine) as session:
            session.add(interaction)
            session.commit()
            session.refresh(interaction)
            session.refresh(interaction)
            
            # Update evolution metrics
            agent_evolution.update_engagement("query")
            
            return interaction.id

    def update_interaction(self, interaction_id: int, user_response: str, was_helpful: bool = None):
        """Update an interaction with user feedback."""
        with Session(self.engine) as session:
            interaction = session.get(AgentInteraction, interaction_id)
            if interaction:
                interaction.user_response = user_response
                if was_helpful is not None:
                    interaction.was_helpful = was_helpful
                session.add(interaction)
                session.commit()
                session.commit()
                
                # Update evolution based on feedback
                if was_helpful is not None:
                     agent_evolution.update_engagement("feedback", feedback=was_helpful)
                     
                return True
        return False

    # --- Helpers ---

    def _extract_tags(self, content: str) -> List[str]:
        """Simple rule-based tag extraction."""
        common_tags = ['rust', 'cli', 'startup', 'learn', 'project', 'work', 'ai', 'cloud']
        found_tags = []
        
        content_lower = content.lower()
        for tag in common_tags:
            if tag in content_lower.split():
                found_tags.append(tag)
                
        # Custom logic
        if 'i want to' in content_lower: found_tags.append('desire')
        if 'problem' in content_lower: found_tags.append('problem')
        if 'how to' in content_lower: found_tags.append('question')
        
        return list(set(found_tags))

    def _calculate_importance(self, content: str, content_type: str) -> float:
        """Calculate base importance score."""
        score = 0.5
        
        if content_type == 'decision': score += 0.2
        if content_type == 'verdict': score += 0.3
        
        # Length bonus
        if len(content) > 200: score += 0.1
        
        # Keyword bonus
        keywords = ['important', 'urgent', 'must', 'need', 'critical', 'deployment', 'production']
        if any(k in content.lower() for k in keywords):
            score += 0.15
            
        # Evolution bonus: High engagement = higher importance threshold?
        # Or maybe we store MORE usage data if engagement is high
        if agent_evolution.engagement_score > 0.7:
             score += 0.1
            
        return min(max(score, 0.0), 1.0)

    def clear_all_memories(self, user_id: str):
        """Nuclear delete: wipes all memories and patterns for a user."""
        from sqlalchemy import delete
        from database.models import UserMemory
        from sqlalchemy.orm import Session
        with Session(self.engine) as session:
            session.execute(delete(UserMemory).where(UserMemory.user_id == user_id))
            session.commit()
