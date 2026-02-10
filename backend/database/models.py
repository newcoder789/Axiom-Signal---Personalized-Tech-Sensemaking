from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship, JSON
from sqlalchemy import Column
import json

class UserMemory(SQLModel, table=True):
    __tablename__ = "user_memory"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(default="default", index=True)
    content_type: str = Field(index=True)  # 'journal', 'decision', 'verdict', 'interaction'
    content: str
    metadata_: Optional[Dict[str, Any]] = Field(default={}, sa_column=Column("metadata", JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    importance_score: float = Field(default=0.5, index=True)
    tags: Optional[str] = Field(default=None, index=True) # comma-separated
    is_archived: bool = Field(default=False)

class AgentInteraction(SQLModel, table=True):
    __tablename__ = "agent_interactions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    interaction_type: str  # 'advice', 'notification', 'question'
    content: str
    user_response: Optional[str] = None # 'acted', 'dismissed', 'clicked'
    was_helpful: Optional[bool] = None
    related_memory_ids: List[int] = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DetectedPattern(SQLModel, table=True):
    __tablename__ = "detected_patterns"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    pattern_type: str # 'repetition', 'contradiction', 'followup_needed'
    related_memory_ids: List[int] = Field(default=[], sa_column=Column(JSON))
    details: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    severity: float = Field(default=0.5)
    resolved: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserPreference(SQLModel, table=True):
    __tablename__ = "user_preferences"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, unique=True)
    notification_settings: Dict[str, Any] = Field(default={"frequency": "medium", "enabled_types": ["repetition", "contradiction", "followup_needed"]}, sa_column=Column(JSON))
    focus_mode_settings: Dict[str, Any] = Field(default={"timer_duration": 25, "auto_start": False}, sa_column=Column(JSON))
    updated_at: datetime = Field(default_factory=datetime.utcnow)
