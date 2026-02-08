"""
Tool Orchestrator - The ONLY place tools are called
Hard rule: LLMs NEVER call tools directly. Only orchestrator calls tools.

Week 2: Runs freshness + market + friction
With Opik tracing and detailed logging
"""

from typing import Dict, Any
from datetime import datetime, timezone

try:
    from opik import track
    OPIK_AVAILABLE = True
except ImportError:
    # Fallback decorator if opik not available
    def track(*args, **kwargs):
        def decorator(func):
            return func
        return decorator
    OPIK_AVAILABLE = False

from .freshness_checker import FreshnessChecker
from .market_signal import MarketSignalTool
from .friction_estimator import FrictionEstimator
from .logging_utils import ToolLogger


class ToolOrchestrator:
    """
    Orchestrates tool execution.
    This is the ONLY place tools are called from.
    
    All executions are:
    - Logged to file (tools/logs/)
    - Traced with Opik (if available)
    """
    
    def __init__(self, session_id: str = None):
        self.freshness_checker = FreshnessChecker()
        self.market_signal = MarketSignalTool()
        self.friction_estimator = FrictionEstimator()
        
        # Create session-specific logger
        self.session_id = session_id or datetime.now().strftime("%Y%m%d_%H%M%S")
        self.logger = ToolLogger(self.session_id)
        
        print(f"\n{'='*60}")
        print(f"[ORCHESTRATOR] Initialized")
        print(f"  Session: {self.session_id}")
        print(f"  Opik Tracing: {'ENABLED' if OPIK_AVAILABLE else 'DISABLED'}")
        print(f"  Log File: tools/logs/tools_{self.session_id}.log")
        print(f"{'='*60}\n")
    
    @track(name="tool_orchestrator_execute", project_name="axiom-v0")
    def execute_tools(self, topic: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute all tools and return combined evidence.
        
        Order:
        1. Freshness (highest priority - can force watchlist)
        2. Market signal
        3. Friction (uses user_profile from context)
        
        Returns:
            Dict with all tool evidence and metadata
        """
        if context is None:
            context = {}
        
        start_time = datetime.now(timezone.utc)
        
        print(f"\n{'='*60}")
        print(f"[ORCHESTRATOR] Starting tool execution")
        print(f"  Topic: {topic}")
        print(f"  User Profile: {context.get('user_profile', 'Not specified')[:50]}")
        print(f"{'='*60}")
        
        # ═══════════════════════════════════════════════════════════
        # TOOL 1: FRESHNESS CHECK (CRITICAL)
        # ═══════════════════════════════════════════════════════════
        print(f"\n[1/3] FRESHNESS CHECK")
        print(f"  Checking if model knowledge is outdated...")
        
        self.logger.log_tool_start("freshness", topic, context)
        freshness_result = self._execute_freshness(topic, context)
        freshness_data = freshness_result.structured_data
        self.logger.log_tool_result("freshness", freshness_data, freshness_result.confidence)
        
        watchlist_triggered = freshness_data.get("is_model_likely_outdated", False)
        
        if watchlist_triggered:
            print(f"  [!] OUTDATED: {freshness_data.get('reason')}")
            print(f"  [!] Latest version: {freshness_data.get('latest_known_version')}")
            print(f"  [!] Release date: {freshness_data.get('release_date')}")
        else:
            print(f"  [OK] Knowledge is current")
            if freshness_data.get("latest_known_version"):
                print(f"  Latest version: {freshness_data.get('latest_known_version')}")
        
        # ═══════════════════════════════════════════════════════════
        # TOOL 2: MARKET SIGNAL
        # ═══════════════════════════════════════════════════════════
        print(f"\n[2/3] MARKET SIGNAL")
        print(f"  Analyzing adoption, hiring, ecosystem...")
        
        self.logger.log_tool_start("market", topic, context)
        market_result = self._execute_market(topic, context)
        market_data = market_result.structured_data
        self.logger.log_tool_result("market", market_data, market_result.confidence)
        
        print(f"  Adoption: {market_data.get('adoption', 'unknown').upper()}")
        print(f"  Hiring Signal: {market_data.get('hiring_signal', 'unknown')}")
        print(f"  Ecosystem: {market_data.get('ecosystem_maturity', 'unknown')}")
        print(f"  Confidence: {market_result.confidence:.2f}")
        
        # ═══════════════════════════════════════════════════════════
        # TOOL 3: FRICTION ESTIMATION
        # ═══════════════════════════════════════════════════════════
        print(f"\n[3/3] FRICTION ESTIMATION")
        user_profile = context.get("user_profile", "")
        print(f"  Estimating adoption friction for user...")
        if user_profile:
            print(f"  User profile: {user_profile[:50]}")
        
        self.logger.log_tool_start("friction", topic, context)
        friction_result = self._execute_friction(topic, context)
        friction_data = friction_result.structured_data
        self.logger.log_tool_result("friction", friction_data, friction_result.confidence)
        
        overall_friction = friction_data.get("overall_friction", 0.5)
        user_modifier = friction_data.get("user_modifier", 0)
        
        print(f"  Overall Friction: {overall_friction:.0%}")
        print(f"  Learning Curve: {friction_data.get('learning_curve', 'N/A')}")
        print(f"  Infra Cost: {friction_data.get('infra_cost', 'N/A')}")
        if user_modifier != 0:
            print(f"  User Modifier: {user_modifier:+.0%} (based on profile)")
        print(f"  Confidence: {friction_result.confidence:.2f}")
        
        # ═══════════════════════════════════════════════════════════
        # CALCULATE COMBINED CONFIDENCE
        # ═══════════════════════════════════════════════════════════
        confidences = [
            freshness_result.confidence,
            market_result.confidence,
            friction_result.confidence,
        ]
        combined_confidence = sum(confidences) / len(confidences)
        
        # Build evidence bundle
        tool_evidence = {
            "freshness": freshness_data,
            "market": market_data,
            "friction": friction_data,
            "watchlist_triggered": watchlist_triggered,
            "combined_confidence": round(combined_confidence, 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        # ═══════════════════════════════════════════════════════════
        # DETERMINE WHICH RULE WOULD FIRE
        # ═══════════════════════════════════════════════════════════
        print(f"\n{'='*60}")
        print("[VERDICT RULE ANALYSIS]")
        
        if watchlist_triggered:
            self.logger.log_decision("RULE 1", "watchlist", freshness_data.get("reason", "Outdated"))
            print(f"  [RULE 1] Freshness outdated -> WATCHLIST")
            print(f"  Verdict: WATCHLIST (absolute, no debate)")
        elif overall_friction >= 0.75 and market_data.get("adoption") == "low":
            self.logger.log_decision("RULE 2", "ignore", f"Friction {overall_friction:.0%} + weak market")
            print(f"  [RULE 2] High friction ({overall_friction:.0%}) + weak market -> IGNORE")
            print(f"  Verdict: IGNORE (absolute)")
        elif overall_friction < 0.4 and market_data.get("adoption") == "high":
            hiring = market_data.get("hiring_signal", "")
            if hiring in ("strong", "moderate"):
                self.logger.log_decision("RULE 3", "pursue", f"Low friction + strong market")
                print(f"  [RULE 3] Low friction ({overall_friction:.0%}) + strong market -> PURSUE")
                print(f"  Verdict: PURSUE (force)")
            else:
                print(f"  [RULE 4] Mixed signals -> LLM decides")
                print(f"  Friction OK but hiring signal weak")
        else:
            print(f"  [RULE 4] Mixed signals -> LLM decides")
            print(f"  No absolute rule triggered")
        
        # Elapsed time
        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
        print(f"\n  Execution time: {elapsed:.2f}s")
        print(f"  Combined confidence: {combined_confidence:.2f}")
        print(f"{'='*60}\n")
        
        # Log summary to file
        self.logger.log_summary(tool_evidence)
        
        return tool_evidence
    
    @track(name="freshness_check", project_name="axiom-v0")
    def _execute_freshness(self, topic: str, context: dict):
        """Execute freshness check with tracing"""
        return self.freshness_checker.execute(topic, context)
    
    @track(name="market_signal", project_name="axiom-v0")
    def _execute_market(self, topic: str, context: dict):
        """Execute market signal with tracing"""
        return self.market_signal.execute(topic, context)
    
    @track(name="friction_estimate", project_name="axiom-v0")
    def _execute_friction(self, topic: str, context: dict):
        """Execute friction estimation with tracing"""
        return self.friction_estimator.execute(topic, context)
    
    def health_check(self) -> Dict[str, Any]:
        """Check health of all tools"""
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "session_id": self.session_id,
            "opik_enabled": OPIK_AVAILABLE,
            "tools": {
                "freshness": self.freshness_checker.health_check(),
                "market": self.market_signal.health_check(),
                "friction": self.friction_estimator.health_check(),
            },
            "all_healthy": True,
        }
