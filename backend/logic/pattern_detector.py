from datetime import datetime, timedelta
from typing import List, Dict, Any
from memory.memory_service import MemoryService
from database.models import UserMemory, DetectedPattern
from events.event_manager import AgentEventManager

class PatternDetector:
    def __init__(self):
        self.memory_service = MemoryService()
        self.event_manager = AgentEventManager.get_instance()

    async def analyze_patterns(self, user_id: str, trigger: str = 'scheduled') -> List[Dict[str, Any]]:
        """Run all pattern detection logic for a user."""
        print(f"[DETECTOR] Analyzing patterns for {user_id} (trigger: {trigger})")
        
        patterns = []
        
        # Get recent memories
        memories = self.memory_service.get_recent_memories(user_id, limit=100)
        
        # Run detectors
        patterns.extend(self._detect_repetitions(user_id, memories))
        patterns.extend(self._detect_contradictions(user_id, memories))
        patterns.extend(self._detect_followup_needed(user_id, memories))
        patterns.extend(self._detect_technical_debt(user_id, memories))
        
        # Store and emit
        for p in patterns:
            # Check if impactful enough
            if p.get("severity", 0) > 0.3:
                # Store in DB (omitted for brevity in this step, but in production we'd save to DetectedPattern)
                pass 
                
            if p.get("severity", 0) > 0.6:
                await self.event_manager.emit("PATTERN_DETECTED", {
                    "user_id": user_id,
                    "pattern": p,
                    "trigger": trigger
                })
                
        return patterns

    def _detect_repetitions(self, user_id: str, memories: List[UserMemory]) -> List[Dict[str, Any]]:
        """Detect recurring tags in recent history."""
        patterns = []
        recent_days = 7
        tag_map = {}
        
        for m in memories:
            if not m.tags: continue
            for tag in m.tags.split(','):
                tag = tag.strip()
                if tag not in tag_map: tag_map[tag] = []
                tag_map[tag].append(m)
        
        for tag, tag_memories in tag_map.items():
            # Filter for recent
            recent = [m for m in tag_memories if (datetime.utcnow() - m.created_at).days <= recent_days]
            
            if len(recent) >= 3:
                patterns.append({
                    "type": "repetition",
                    "tag": tag,
                    "count": len(recent),
                    "memory_ids": [m.id for m in recent],
                    "severity": min(0.3 + (len(recent) * 0.1), 1.0),
                    "details": {
                        "message": f"You've mentioned '{tag}' {len(recent)} times recently.",
                        "suggestion": "Consider focusing on this topic."
                    }
                })
        return patterns

    def _detect_contradictions(self, user_id: str, memories: List[UserMemory]) -> List[Dict[str, Any]]:
        """Detect conflicting sentiments."""
        patterns = []
        journals = [m for m in memories if m.content_type == 'journal']
        
        pairs = [
            ("want to", "don't want to"),
            ("love", "hate"),
            ("good", "bad"),
            ("easy", "hard")
        ]
        
        for pos, neg in pairs:
            pos_mems = [m for m in journals if pos in m.content.lower()]
            neg_mems = [m for m in journals if neg in m.content.lower()]
            
            if pos_mems and neg_mems:
                # Check for context overlap (simple check for now)
                for p_mem in pos_mems:
                    for n_mem in neg_mems:
                        # If relatively close in time (2 weeks)
                        if abs((p_mem.created_at - n_mem.created_at).days) < 14:
                            patterns.append({
                                "type": "contradiction",
                                "memory_ids": [p_mem.id, n_mem.id],
                                "severity": 0.7,
                                "details": {
                                    "message": f"Conflict detected: '{pos}' vs '{neg}'",
                                    "context": {"positive": p_mem.content, "negative": n_mem.content},
                                    "suggestion": "Review these conflicting thoughts."
                                }
                            })
        return patterns

    def _detect_followup_needed(self, user_id: str, memories: List[UserMemory]) -> List[Dict[str, Any]]:
        """Detect stalled decisions."""
        patterns = []
        decisions = [m for m in memories if m.content_type == 'verdict']
        journals = [m for m in memories if m.content_type == 'journal']
        
        # Recent journals (last 3 days)
        recent_journal_text = " ".join([m.content.lower() for m in journals if (datetime.utcnow() - m.created_at).days < 3])
        
        for d in decisions:
            meta = d.metadata_ or {}
            if meta.get("new_verdict") == "pursue":
                item = meta.get("item", "").lower()
                if item and item not in recent_journal_text:
                    days_ago = (datetime.utcnow() - d.created_at).days
                    if days_ago > 2: # No mention in > 2 days
                        patterns.append({
                            "type": "followup_needed",
                            "memory_ids": [d.id],
                            "severity": min(0.3 + (days_ago * 0.1), 0.9),
                            "details": {
                                "item": item,
                                "message": f"You decided to pursue '{item}' {days_ago} days ago but haven't mentioned it.",
                                "suggestion": "Any progress or update?"
                            }
                        })
    def _detect_technical_debt(self, user_id: str, memories: List[UserMemory]) -> List[Dict[str, Any]]:
        """Detect recurring mentions of technical debt or blockers."""
        patterns = []
        debt_keywords = ["todo", "fixme", "technical debt", "refactor", "hack", "messy", "blocking"]
        
        journals = [m for m in memories if m.content_type == 'journal']
        debt_count = 0
        debt_memories = []
        
        for m in journals:
            if any(k in m.content.lower() for k in debt_keywords):
                debt_count += 1
                debt_memories.append(m)
        
        if debt_count >= 2:
            patterns.append({
                "type": "technical_debt",
                "count": debt_count,
                "memory_ids": [m.id for m in debt_memories],
                "severity": min(0.4 + (debt_count * 0.1), 1.0),
                "details": {
                    "message": f"Axiom detects recurring technical debt signals ({debt_count} mentions).",
                    "suggestion": "Consider a 'Clearance Session' to address these build-ups."
                }
            })
        return patterns
