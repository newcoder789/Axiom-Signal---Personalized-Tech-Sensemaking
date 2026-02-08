"""
Tool 1: Freshness Checker
Purpose: Detect when model knowledge is likely outdated
Critical: If outdated → automatic watchlist verdict
"""

import re
from typing import Dict, Any
from datetime import datetime, timezone

from .base import BaseTool, ToolOutput


class FreshnessChecker(BaseTool):
    """
    Checks if topic has major updates post-model-cutoff.
    Critical: This triggers watchlist verdict if outdated.
    """
    
    # Model knowledge cutoff (adjust based on your LLM)
    MODEL_CUTOFF = datetime(2024, 4, 1, tzinfo=timezone.utc)
    
    # Known major releases (in production, query a database or API)
    MAJOR_RELEASES = {
        "redis": {
            "redis 7": {"date": datetime(2022, 4, 27, tzinfo=timezone.utc), "version": "7"},
            "redis 7.2": {"date": datetime(2023, 8, 1, tzinfo=timezone.utc), "version": "7.2"},
            "redis 7.4": {"date": datetime(2024, 7, 1, tzinfo=timezone.utc), "version": "7.4"},
        },
        "postgresql": {
            "postgresql 15": {"date": datetime(2022, 10, 13, tzinfo=timezone.utc), "version": "15"},
            "postgresql 16": {"date": datetime(2023, 9, 14, tzinfo=timezone.utc), "version": "16"},
            "postgresql 17": {"date": datetime(2024, 9, 26, tzinfo=timezone.utc), "version": "17"},
        },
        "typescript": {
            "typescript 5.0": {"date": datetime(2023, 3, 16, tzinfo=timezone.utc), "version": "5.0"},
            "typescript 5.4": {"date": datetime(2024, 3, 6, tzinfo=timezone.utc), "version": "5.4"},
            "typescript 5.5": {"date": datetime(2024, 6, 20, tzinfo=timezone.utc), "version": "5.5"},
            "typescript 5.7": {"date": datetime(2024, 11, 22, tzinfo=timezone.utc), "version": "5.7"},
        },
        "docker": {
            "docker 24": {"date": datetime(2023, 7, 1, tzinfo=timezone.utc), "version": "24"},
            "docker 25": {"date": datetime(2024, 1, 19, tzinfo=timezone.utc), "version": "25"},
            "docker 27": {"date": datetime(2024, 6, 27, tzinfo=timezone.utc), "version": "27"},
        },
        "kubernetes": {
            "kubernetes 1.28": {"date": datetime(2023, 8, 15, tzinfo=timezone.utc), "version": "1.28"},
            "kubernetes 1.29": {"date": datetime(2023, 12, 13, tzinfo=timezone.utc), "version": "1.29"},
            "kubernetes 1.30": {"date": datetime(2024, 4, 17, tzinfo=timezone.utc), "version": "1.30"},
            "kubernetes 1.31": {"date": datetime(2024, 8, 13, tzinfo=timezone.utc), "version": "1.31"},
        },
        "python": {
            "python 3.11": {"date": datetime(2022, 10, 24, tzinfo=timezone.utc), "version": "3.11"},
            "python 3.12": {"date": datetime(2023, 10, 2, tzinfo=timezone.utc), "version": "3.12"},
            "python 3.13": {"date": datetime(2024, 10, 7, tzinfo=timezone.utc), "version": "3.13"},
        },
    }
    
    @property
    def name(self) -> str:
        return "freshness_checker"
    
    @property
    def description(self) -> str:
        return "Checks if topic has major updates post-model-cutoff"
    
    def execute(self, topic: str, context: Dict[str, Any] = None) -> ToolOutput:
        """
        Execute freshness check.
        Returns immutable evidence about knowledge recency.
        """
        try:
            # Normalize topic
            normalized = self._normalize_topic(topic)
            
            # Extract version if present
            version_info = self._extract_version(topic)
            
            # Check if we know about this technology
            is_outdated = False
            reason = "No known major releases post-cutoff"
            risk = "low"
            detected_version = None
            
            # Look for technology family match
            for tech_family, releases in self.MAJOR_RELEASES.items():
                if tech_family in normalized.lower():
                    # Find all releases after model cutoff
                    recent_releases = [
                        (name, data) for name, data in releases.items()
                        if data["date"] > self.MODEL_CUTOFF
                    ]
                    
                    if recent_releases:
                        # Get the latest release
                        latest_name, latest_data = max(recent_releases, key=lambda x: x[1]["date"])
                        is_outdated = True
                        detected_version = latest_data["version"]
                        reason = f"Major release {latest_data['version']} on {latest_data['date'].strftime('%Y-%m-%d')} after model cutoff"
                        risk = "high"
                        break
            
            # Calculate confidence based on match quality
            confidence = 0.85 if is_outdated else 0.7
            
            # Build structured output
            structured_data = {
                "is_model_likely_outdated": is_outdated,
                "reason": reason,
                "risk": risk,
                "model_cutoff": self.MODEL_CUTOFF.isoformat(),
                "topic_normalized": normalized,
                "version_detected": detected_version,
                "version_in_query": version_info.get("version") if version_info.get("found") else None,
            }
            
            return ToolOutput(
                raw_data={"topic": topic, "normalized": normalized},
                structured_data=structured_data,
                confidence=confidence,
                tool_name=self.name
            )
            
        except Exception as e:
            # On error, assume not outdated (conservative)
            return ToolOutput(
                raw_data={"error": str(e), "topic": topic},
                structured_data={
                    "is_model_likely_outdated": False,
                    "reason": f"Error checking: {str(e)[:100]}",
                    "risk": "medium",
                    "model_cutoff": self.MODEL_CUTOFF.isoformat(),
                },
                confidence=0.3,  # Low confidence on error
                tool_name=self.name
            )
    
    def _normalize_topic(self, topic: str) -> str:
        """Normalize topic for matching"""
        # Remove common qualifiers
        qualifiers = ["for", "with", "using", "in", "and", "or", "the", "a", "an", "as"]
        words = [word.lower() for word in topic.split() if word.lower() not in qualifiers]
        return " ".join(words)
    
    def _extract_version(self, topic: str) -> Dict[str, Any]:
        """Extract version information from topic"""
        # Look for version patterns: "X.Y.Z", "X.Y", "X", "vX", "version X"
        version_patterns = [
            r'(\d+\.\d+\.\d+)',  # X.Y.Z
            r'(\d+\.\d+)',       # X.Y
            r'v(\d+)',           # vX
            r'version\s+(\d+)',  # version X
            r'\s(\d+)(?:\s|$)',  # standalone number
        ]
        
        for pattern in version_patterns:
            match = re.search(pattern, topic.lower())
            if match:
                return {
                    "version": match.group(1),
                    "pattern": pattern,
                    "found": True
                }
        
        return {"found": False}
    
    def health_check(self) -> Dict[str, Any]:
        """Enhanced health check"""
        base = super().health_check()
        base.update({
            "status": "healthy",
            "model_cutoff": self.MODEL_CUTOFF.isoformat(),
            "known_technologies": list(self.MAJOR_RELEASES.keys()),
            "release_count": sum(len(releases) for releases in self.MAJOR_RELEASES.values()),
        })
        return base
