"""
Tool 2: Market Signal Tool
Purpose: Measure real-world adoption evidence
Data: Static lookup (Week 2). APIs in Week 3+.

Output: adoption, hiring_signal, ecosystem, confidence
"""

from typing import Dict, Any
from datetime import datetime, timezone

from .base import BaseTool, ToolOutput


class MarketSignalTool(BaseTool):
    """
    Measures market adoption signals from static data.
    Hard rule: Returns structured data only, no opinions.
    """
    
    # Static market signals (production: query job boards, GitHub, npm)
    MARKET_DATA = {
        # Established technologies - high adoption
        "redis": {
            "adoption": "high",
            "hiring_signal": "strong",
            "ecosystem": "mature",
            "confidence": 0.9
        },
        "postgresql": {
            "adoption": "high",
            "hiring_signal": "strong",
            "ecosystem": "mature",
            "confidence": 0.9
        },
        "mysql": {
            "adoption": "high",
            "hiring_signal": "strong",
            "ecosystem": "mature",
            "confidence": 0.9
        },
        "typescript": {
            "adoption": "high",
            "hiring_signal": "strong",
            "ecosystem": "mature",
            "confidence": 0.85
        },
        "python": {
            "adoption": "high",
            "hiring_signal": "strong",
            "ecosystem": "mature",
            "confidence": 0.95
        },
        "docker": {
            "adoption": "high",
            "hiring_signal": "strong",
            "ecosystem": "mature",
            "confidence": 0.9
        },
        "kubernetes": {
            "adoption": "high",
            "hiring_signal": "strong",
            "ecosystem": "mature",
            "confidence": 0.85
        },
        "react": {
            "adoption": "high",
            "hiring_signal": "strong",
            "ecosystem": "mature",
            "confidence": 0.9
        },
        "node": {
            "adoption": "high",
            "hiring_signal": "strong",
            "ecosystem": "mature",
            "confidence": 0.9
        },
        "fastapi": {
            "adoption": "high",
            "hiring_signal": "strong",
            "ecosystem": "mature",
            "confidence": 0.8
        },
        "aws": {
            "adoption": "high",
            "hiring_signal": "strong",
            "ecosystem": "mature",
            "confidence": 0.95
        },
        "golang": {
            "adoption": "high",
            "hiring_signal": "strong",
            "ecosystem": "mature",
            "confidence": 0.85
        },
        "go": {
            "adoption": "high",
            "hiring_signal": "strong",
            "ecosystem": "mature",
            "confidence": 0.85
        },
        
        # Growing technologies - medium adoption
        "rust": {
            "adoption": "medium",
            "hiring_signal": "moderate",
            "ecosystem": "growing",
            "confidence": 0.8
        },
        "svelte": {
            "adoption": "medium",
            "hiring_signal": "moderate",
            "ecosystem": "growing",
            "confidence": 0.7
        },
        "deno": {
            "adoption": "medium",
            "hiring_signal": "weak",
            "ecosystem": "growing",
            "confidence": 0.7
        },
        "bun": {
            "adoption": "medium",
            "hiring_signal": "weak",
            "ecosystem": "growing",
            "confidence": 0.6
        },
        "htmx": {
            "adoption": "medium",
            "hiring_signal": "weak",
            "ecosystem": "growing",
            "confidence": 0.6
        },
        "solid": {
            "adoption": "medium",
            "hiring_signal": "weak",
            "ecosystem": "growing",
            "confidence": 0.6
        },
        "astro": {
            "adoption": "medium",
            "hiring_signal": "weak",
            "ecosystem": "growing",
            "confidence": 0.6
        },
        
        # AI/ML specific
        "langchain": {
            "adoption": "medium",
            "hiring_signal": "moderate",
            "ecosystem": "growing",
            "confidence": 0.7
        },
        "langgraph": {
            "adoption": "low",
            "hiring_signal": "weak",
            "ecosystem": "immature",
            "confidence": 0.6
        },
        "llamaindex": {
            "adoption": "medium",
            "hiring_signal": "weak",
            "ecosystem": "growing",
            "confidence": 0.6
        },
        "openai": {
            "adoption": "high",
            "hiring_signal": "strong",
            "ecosystem": "growing",
            "confidence": 0.85
        },
        
        # Low adoption / niche
        "zig": {
            "adoption": "low",
            "hiring_signal": "weak",
            "ecosystem": "immature",
            "confidence": 0.7
        },
        "nim": {
            "adoption": "low",
            "hiring_signal": "weak",
            "ecosystem": "immature",
            "confidence": 0.7
        },
        "crystal": {
            "adoption": "low",
            "hiring_signal": "weak",
            "ecosystem": "immature",
            "confidence": 0.7
        },
        
        # Vaporware / hype
        "quantum css": {
            "adoption": "low",
            "hiring_signal": "weak",
            "ecosystem": "immature",
            "confidence": 0.9
        },
        "web3": {
            "adoption": "low",
            "hiring_signal": "weak",
            "ecosystem": "immature",
            "confidence": 0.8
        },
    }
    
    @property
    def name(self) -> str:
        return "market_signal"
    
    @property
    def description(self) -> str:
        return "Measures market adoption, hiring signals, and ecosystem maturity"
    
    def execute(self, topic: str, context: Dict[str, Any] = None) -> ToolOutput:
        """
        Execute market signal analysis.
        Returns structured adoption data only.
        """
        try:
            normalized = self._normalize_topic(topic)
            
            # Find best match in static data
            match_result = self._find_match(normalized)
            
            if match_result:
                data, match_quality = match_result
                structured_data = data.copy()
                structured_data["match_quality"] = match_quality
            else:
                # Unknown technology - return low signals with low confidence
                structured_data = {
                    "adoption": "low",
                    "hiring_signal": "weak",
                    "ecosystem": "immature",
                    "confidence": 0.4,
                    "match_quality": "none",
                }
            
            structured_data["topic_normalized"] = normalized
            confidence = structured_data.get("confidence", 0.5)
            
            return ToolOutput(
                raw_data={"topic": topic, "normalized": normalized},
                structured_data=structured_data,
                confidence=confidence,
                tool_name=self.name
            )
            
        except Exception as e:
            return ToolOutput(
                raw_data={"error": str(e), "topic": topic},
                structured_data={
                    "adoption": "low",
                    "hiring_signal": "weak",
                    "ecosystem": "immature",
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
        
        # Remove version numbers
        topic_lower = re.sub(r'\d+(\.\d+)*', '', topic_lower)
        
        # Remove common qualifiers
        qualifiers = ["for", "with", "using", "in", "and", "or", "the", "a", "an", "as", "to"]
        words = [w.strip() for w in topic_lower.split() if w.strip() not in qualifiers]
        
        return " ".join(words).strip()
    
    def _find_match(self, normalized: str):
        """Find best match in market data"""
        normalized_lower = normalized.lower()
        
        # Exact match first
        for tech, data in self.MARKET_DATA.items():
            if tech == normalized_lower:
                return (data, "exact")
        
        # Substring match
        for tech, data in self.MARKET_DATA.items():
            if tech in normalized_lower or normalized_lower in tech:
                return (data, "partial")
        
        # Word match
        words = normalized_lower.split()
        for tech, data in self.MARKET_DATA.items():
            if tech in words:
                return (data, "word")
        
        return None
    
    def health_check(self) -> Dict[str, Any]:
        """Health check"""
        base = super().health_check()
        base.update({
            "status": "healthy",
            "technologies_known": len(self.MARKET_DATA),
            "sample": list(self.MARKET_DATA.keys())[:5],
        })
        return base
