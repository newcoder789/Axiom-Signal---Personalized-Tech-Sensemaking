"""
Tool 4: Web Search Tool (Real Integration)
Purpose: Provide real-time evidence and source links from Tavily and SerpAPI.
Features: Tavily primary -> SerpAPI fallback -> Simulation fallback.
"""

import os
import random
from typing import Dict, Any, List
from datetime import datetime, timedelta, timezone

try:
    from tavily import TavilyClient
    TAVILY_AVAILABLE = True
except ImportError:
    TAVILY_AVAILABLE = False

try:
    from serpapi import GoogleSearch
    SERP_AVAILABLE = True
except ImportError:
    SERP_AVAILABLE = False

from .base import BaseTool, ToolOutput


class WebSearchTool(BaseTool):
    """
    Real-time web search tool with multi-provider fallback.
    """

    def __init__(self):
        super().__init__()
        self.tavily_api_key = os.getenv("TAVILY_API_KEY")
        self.serp_api_key = os.getenv("SERP_API_KEY")

    @property
    def name(self) -> str:
        return "web_search"

    @property
    def description(self) -> str:
        return "Search the web for real-time evidence, articles, and community discussions using Tavily and SerpAPI."

    def execute(self, topic: str, context: Dict[str, Any] = None) -> ToolOutput:
        """
        Execute web search with cascading fallbacks.
        """
        sources = []
        provider = "none"

        # 1. Try Tavily (Primary)
        if TAVILY_AVAILABLE and self.tavily_api_key:
            try:
                print(f"  [SEARCH] Trying Tavily for '{topic}'...")
                client = TavilyClient(api_key=self.tavily_api_key)
                response = client.search(query=topic, search_depth="advanced")
                
                for res in response.get("results", []):
                    # Map Tavily fields to our standard format
                    sources.append({
                        "title": res.get("title", "Untitled"),
                        "url": res.get("url", ""),
                        "snippet": res.get("content", ""),
                        "domain": self._extract_domain(res.get("url", "")),
                        "date": res.get("published_date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                        "source": "Tavily"
                    })
                
                if sources:
                    provider = "tavily"
                    print(f"  [SEARCH] Success with Tavily ({len(sources)} results)")
            except Exception as e:
                print(f"  [SEARCH] Tavily failed: {e}")

        # 2. Try SerpAPI (Fallback 1)
        if not sources and SERP_AVAILABLE and self.serp_api_key:
            try:
                print(f"  [SEARCH] Trying SerpAPI for '{topic}'...")
                params = {
                    "q": topic,
                    "api_key": self.serp_api_key,
                    "engine": "google",
                    "num": 5
                }
                search = GoogleSearch(params)
                results = search.get_dict()
                
                for res in results.get("organic_results", []):
                    # Map SerpAPI fields to our standard format
                    sources.append({
                        "title": res.get("title", "Untitled"),
                        "url": res.get("link", ""),
                        "snippet": res.get("snippet", ""),
                        "domain": self._extract_domain(res.get("link", "")),
                        "date": res.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                        "source": "SerpAPI"
                    })
                
                if sources:
                    provider = "serpapi"
                    print(f"  [SEARCH] Success with SerpAPI ({len(sources)} results)")
            except Exception as e:
                print(f"  [SEARCH] SerpAPI failed: {e}")

        # 3. Simulation (Fallback 2 - The "Safety Net")
        if not sources:
            print(f"  [SEARCH] All real APIs failed or unavailable. Using simulation.")
            sources = self._simulate_search(topic)
            provider = "simulation"

        return ToolOutput(
            raw_data={"topic": topic, "provider": provider},
            structured_data={"sources": sources, "provider": provider},
            confidence=0.9 if provider != "simulation" else 0.5,
            tool_name=self.name
        )

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL for UI display."""
        from urllib.parse import urlparse
        try:
            domain = urlparse(url).netloc
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except:
            return "unknown"

    def _simulate_search(self, topic: str) -> List[Dict[str, Any]]:
        """The pre-existing simulation logic as a final safety net."""
        domains = [
            {"name": "Medium", "url": "medium.com"},
            {"name": "Hacker News", "url": "news.ycombinator.com"},
            {"name": "Dev.to", "url": "dev.to"},
            {"name": "InfoQ", "url": "infoq.com"},
        ]
        
        results = []
        for i in range(3):
            domain = random.choice(domains)
            results.append({
                "title": f"Understanding {topic}: A Guide for 2024",
                "url": f"https://{domain['url']}/{topic.lower().replace(' ', '-')}-{i}",
                "snippet": f"This simulated guide explores {topic} and its impact on modern software development.",
                "domain": domain["name"],
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "source": "Simulation"
            })
        return results

    def health_check(self) -> Dict[str, Any]:
        return {
            **super().health_check(),
            "tavily_available": TAVILY_AVAILABLE and bool(self.tavily_api_key),
            "serp_available": SERP_AVAILABLE and bool(self.serp_api_key),
            "status": "healthy"
        }
