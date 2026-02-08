"""
Tool 3: Friction Estimator
Purpose: Quantify real-world adoption pain
Design: Baseline + user modifier (not user-driven)

Output: learning_curve, infra_cost, operational_risk, overall_friction
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone

from .base import BaseTool, ToolOutput


class FrictionEstimator(BaseTool):
    """
    Estimates real-world friction for technology adoption.
    
    Design principle: 
    - Friction baseline = technology inherent pain
    - User profile = modifier, not driver
    """
    
    # Friction baselines (inherent to technology)
    FRICTION_BASELINES = {
        # Low friction - easy to adopt
        "redis": {
            "learning_curve": "gentle",
            "infra_cost": "low",
            "operational_risk": "low",
            "baseline": 0.25
        },
        "typescript": {
            "learning_curve": "gentle",
            "infra_cost": "low",
            "operational_risk": "low",
            "baseline": 0.2
        },
        "fastapi": {
            "learning_curve": "gentle",
            "infra_cost": "low",
            "operational_risk": "low",
            "baseline": 0.25
        },
        "python": {
            "learning_curve": "gentle",
            "infra_cost": "low",
            "operational_risk": "low",
            "baseline": 0.15
        },
        "react": {
            "learning_curve": "medium",
            "infra_cost": "low",
            "operational_risk": "low",
            "baseline": 0.35
        },
        "node": {
            "learning_curve": "gentle",
            "infra_cost": "low",
            "operational_risk": "low",
            "baseline": 0.25
        },
        "htmx": {
            "learning_curve": "gentle",
            "infra_cost": "low",
            "operational_risk": "low",
            "baseline": 0.2
        },
        
        # Medium friction
        "docker": {
            "learning_curve": "medium",
            "infra_cost": "medium",
            "operational_risk": "medium",
            "baseline": 0.5
        },
        "postgresql": {
            "learning_curve": "medium",
            "infra_cost": "low",
            "operational_risk": "low",
            "baseline": 0.4
        },
        "mysql": {
            "learning_curve": "medium",
            "infra_cost": "low",
            "operational_risk": "low",
            "baseline": 0.35
        },
        "golang": {
            "learning_curve": "medium",
            "infra_cost": "low",
            "operational_risk": "low",
            "baseline": 0.45
        },
        "go": {
            "learning_curve": "medium",
            "infra_cost": "low",
            "operational_risk": "low",
            "baseline": 0.45
        },
        "langchain": {
            "learning_curve": "medium",
            "infra_cost": "medium",
            "operational_risk": "medium",
            "baseline": 0.55
        },
        "langgraph": {
            "learning_curve": "medium",
            "infra_cost": "medium",
            "operational_risk": "medium",
            "baseline": 0.55
        },
        "aws": {
            "learning_curve": "medium",
            "infra_cost": "high",
            "operational_risk": "medium",
            "baseline": 0.6
        },
        "svelte": {
            "learning_curve": "medium",
            "infra_cost": "low",
            "operational_risk": "low",
            "baseline": 0.4
        },
        
        # High friction - steep learning curve or high ops burden
        "kubernetes": {
            "learning_curve": "steep",
            "infra_cost": "high",
            "operational_risk": "high",
            "baseline": 0.8
        },
        "rust": {
            "learning_curve": "steep",
            "infra_cost": "low",
            "operational_risk": "medium",
            "baseline": 0.7
        },
        "kafka": {
            "learning_curve": "steep",
            "infra_cost": "high",
            "operational_risk": "high",
            "baseline": 0.85
        },
        "elasticsearch": {
            "learning_curve": "steep",
            "infra_cost": "high",
            "operational_risk": "high",
            "baseline": 0.75
        },
        "cassandra": {
            "learning_curve": "steep",
            "infra_cost": "high",
            "operational_risk": "high",
            "baseline": 0.85
        },
        "zig": {
            "learning_curve": "steep",
            "infra_cost": "low",
            "operational_risk": "medium",
            "baseline": 0.75
        },
    }
    
    # User profile modifiers (small adjustments, not drivers)
    PROFILE_MODIFIERS = {
        "backend": {
            "redis": -0.05,
            "postgresql": -0.05,
            "mysql": -0.05,
            "docker": -0.1,
            "kubernetes": -0.1,
            "fastapi": -0.05,
            "golang": -0.1,
            "go": -0.1,
            "kafka": -0.1,
        },
        "frontend": {
            "react": -0.1,
            "typescript": -0.05,
            "svelte": -0.05,
            "htmx": -0.05,
            "node": -0.05,
            "redis": +0.1,
            "kubernetes": +0.1,
        },
        "devops": {
            "kubernetes": -0.15,
            "docker": -0.1,
            "aws": -0.1,
            "kafka": -0.1,
            "elasticsearch": -0.1,
        },
        "ml": {
            "python": -0.05,
            "langchain": -0.1,
            "langgraph": -0.1,
            "docker": -0.05,
        },
        "fullstack": {
            "react": -0.05,
            "typescript": -0.05,
            "node": -0.05,
            "postgresql": -0.05,
            "docker": -0.05,
        },
    }
    
    @property
    def name(self) -> str:
        return "friction_estimator"
    
    @property
    def description(self) -> str:
        return "Estimates adoption friction with baseline + user modifier"
    
    def execute(self, topic: str, context: Dict[str, Any] = None) -> ToolOutput:
        """
        Execute friction estimation.
        
        Context may include:
        - user_profile: string describing user's background
        """
        try:
            normalized = self._normalize_topic(topic)
            user_profile = context.get("user_profile", "") if context else ""
            
            # Get baseline friction
            baseline_data = self._get_baseline(normalized)
            
            if baseline_data:
                structured_data = baseline_data.copy()
                baseline = baseline_data["baseline"]
                
                # Apply user modifier
                modifier = self._get_user_modifier(normalized, user_profile)
                overall_friction = max(0.0, min(1.0, baseline + modifier))
                
                structured_data["overall_friction"] = round(overall_friction, 2)
                structured_data["user_modifier"] = modifier
                structured_data["match_quality"] = "exact" if normalized in self.FRICTION_BASELINES else "partial"
                confidence = 0.8
            else:
                # Unknown technology - estimate from keywords
                structured_data = self._estimate_friction(normalized)
                structured_data["match_quality"] = "estimated"
                confidence = 0.5
            
            structured_data["topic_normalized"] = normalized
            structured_data["confidence"] = confidence
            
            return ToolOutput(
                raw_data={"topic": topic, "normalized": normalized, "user_profile": user_profile[:50]},
                structured_data=structured_data,
                confidence=confidence,
                tool_name=self.name
            )
            
        except Exception as e:
            return ToolOutput(
                raw_data={"error": str(e), "topic": topic},
                structured_data={
                    "learning_curve": "medium",
                    "infra_cost": "medium",
                    "operational_risk": "medium",
                    "overall_friction": 0.5,
                    "confidence": 0.3,
                    "error": True,
                },
                confidence=0.3,
                tool_name=self.name
            )
    
    def _normalize_topic(self, topic: str) -> str:
        """Normalize topic for matching"""
        import re
        
        topic_lower = topic.lower()
        topic_lower = re.sub(r'\d+(\.\d+)*', '', topic_lower)
        
        qualifiers = ["for", "with", "using", "in", "and", "or", "the", "a", "an", "as", "to"]
        words = [w.strip() for w in topic_lower.split() if w.strip() not in qualifiers]
        
        return " ".join(words).strip()
    
    def _get_baseline(self, normalized: str) -> Optional[Dict[str, Any]]:
        """Get friction baseline for technology"""
        normalized_lower = normalized.lower()
        
        # Exact match
        if normalized_lower in self.FRICTION_BASELINES:
            return self.FRICTION_BASELINES[normalized_lower]
        
        # Substring match
        for tech, data in self.FRICTION_BASELINES.items():
            if tech in normalized_lower or normalized_lower in tech:
                return data
        
        # Word match
        words = normalized_lower.split()
        for tech, data in self.FRICTION_BASELINES.items():
            if tech in words:
                return data
        
        return None
    
    def _get_user_modifier(self, normalized: str, user_profile: str) -> float:
        """Get friction modifier based on user profile"""
        if not user_profile:
            return 0.0
        
        profile_lower = user_profile.lower()
        normalized_lower = normalized.lower()
        
        # Detect user type
        detected_type = None
        if "backend" in profile_lower:
            detected_type = "backend"
        elif "frontend" in profile_lower:
            detected_type = "frontend"
        elif "devops" in profile_lower or "sre" in profile_lower or "platform" in profile_lower:
            detected_type = "devops"
        elif "ml" in profile_lower or "machine learning" in profile_lower or "ai" in profile_lower:
            detected_type = "ml"
        elif "fullstack" in profile_lower or "full-stack" in profile_lower:
            detected_type = "fullstack"
        
        if not detected_type:
            return 0.0
        
        # Get modifier for this user type and technology
        modifiers = self.PROFILE_MODIFIERS.get(detected_type, {})
        
        # Try exact match
        if normalized_lower in modifiers:
            return modifiers[normalized_lower]
        
        # Try word match
        for tech, mod in modifiers.items():
            if tech in normalized_lower:
                return mod
        
        return 0.0
    
    def _estimate_friction(self, normalized: str) -> Dict[str, Any]:
        """Estimate friction for unknown technology"""
        normalized_lower = normalized.lower()
        
        # Default medium friction
        result = {
            "learning_curve": "medium",
            "infra_cost": "medium",
            "operational_risk": "medium",
            "baseline": 0.5,
            "overall_friction": 0.5,
            "user_modifier": 0.0,
        }
        
        # Adjust based on keywords
        high_friction_keywords = ["distributed", "blockchain", "quantum", "cluster", "orchestrat"]
        low_friction_keywords = ["library", "cli", "utility", "tool", "sdk"]
        
        for kw in high_friction_keywords:
            if kw in normalized_lower:
                result["learning_curve"] = "steep"
                result["operational_risk"] = "high"
                result["overall_friction"] = 0.75
                break
        
        for kw in low_friction_keywords:
            if kw in normalized_lower:
                result["learning_curve"] = "gentle"
                result["overall_friction"] = 0.3
                break
        
        return result
    
    def health_check(self) -> Dict[str, Any]:
        """Health check"""
        base = super().health_check()
        base.update({
            "status": "healthy",
            "baselines_known": len(self.FRICTION_BASELINES),
            "profile_types": list(self.PROFILE_MODIFIERS.keys()),
        })
        return base
