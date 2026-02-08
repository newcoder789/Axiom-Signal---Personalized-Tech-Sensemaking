"""
Axiom Tool System - Base Classes
Hard rule: LLMs NEVER call tools directly. Only orchestrator calls tools.
Tools provide immutable evidence only.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class ToolOutput(BaseModel):
    """
    Immutable tool output - CANNOT be overridden by LLM.
    Tools return facts/evidence only.
    """
    raw_data: Dict[str, Any] = Field(..., description="Raw tool response")
    structured_data: Dict[str, Any] = Field(..., description="Structured output for decision logic")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Tool confidence in this evidence")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tool_name: str = Field(..., description="Which tool produced this evidence")
    
    model_config = {"frozen": True}  # Immutable - LLM cannot modify
    
    def is_high_confidence(self) -> bool:
        """Check if this evidence can be trusted"""
        return self.confidence > 0.7


class BaseTool(ABC):
    """
    Base class for all Axiom tools.
    Tools are evidence sources, not decision makers.
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Tool identifier (e.g., 'freshness_checker')"""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """What this tool measures/provides"""
        pass
    
    @abstractmethod
    def execute(self, topic: str, context: Dict[str, Any] = None) -> ToolOutput:
        """
        Execute tool and return immutable evidence.
        
        Args:
            topic: Technology topic to analyze
            context: Optional context (signal, reality_check, user_profile, etc.)
            
        Returns:
            Immutable ToolOutput with evidence
        """
        pass
    
    def health_check(self) -> Dict[str, Any]:
        """Check if tool is operational"""
        return {
            "tool": self.name,
            "status": "unknown",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
