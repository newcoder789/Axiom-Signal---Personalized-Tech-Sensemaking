"""
Axiom Logging System
Creates readable log files for each run with proper formatting
"""

import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


# Log directory
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)


def get_axiom_logger(name: str, run_id: Optional[str] = None) -> logging.Logger:
    """
    Get a logger configured for Axiom with both console and file output.
    
    Args:
        name: Logger name (e.g., 'orchestrator', 'freshness')
        run_id: Optional run ID for grouping logs
        
    Returns:
        Configured logger
    """
    logger = logging.getLogger(f"axiom.{name}")
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    logger.setLevel(logging.DEBUG)
    
    # Create formatters
    console_formatter = logging.Formatter(
        "[%(levelname)s] %(message)s"
    )
    
    file_formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Console handler (INFO and above)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File handler (DEBUG and above) - per-session log file
    if run_id:
        log_file = LOG_DIR / f"{run_id}_{name}.log"
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = LOG_DIR / f"{timestamp}_{name}.log"
    
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)
    
    return logger


def get_run_logger(topic: str) -> logging.Logger:
    """
    Get a logger for a specific run with a unique file.
    
    Args:
        topic: The topic being analyzed
        
    Returns:
        Logger with unique file for this run
    """
    # Create a sanitized filename from topic
    safe_topic = "".join(c if c.isalnum() else "_" for c in topic[:30])
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_id = f"{timestamp}_{safe_topic}"
    
    logger = logging.getLogger(f"axiom.run.{run_id}")
    
    if logger.handlers:
        return logger
    
    logger.setLevel(logging.DEBUG)
    
    # File formatter with nice spacing
    file_formatter = logging.Formatter(
        "\n%(asctime)s\n"
        "================================================================================\n"
        "%(levelname)s: %(message)s\n"
        "================================================================================",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Simple console formatter
    console_formatter = logging.Formatter(
        "[%(levelname)s] %(message)s"
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File handler - one file per run
    log_file = LOG_DIR / f"run_{run_id}.log"
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)
    
    logger.info(f"Log file created: {log_file}")
    
    return logger


class ToolLogger:
    """
    Dedicated logger for tool execution with structured output.
    Creates a new log file for each tool run session.
    """
    
    def __init__(self, session_id: Optional[str] = None):
        self.session_id = session_id or datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_file = LOG_DIR / f"tools_{self.session_id}.log"
        
        # Create logger
        self.logger = logging.getLogger(f"axiom.tools.{self.session_id}")
        self.logger.setLevel(logging.DEBUG)
        
        # Clear existing handlers
        self.logger.handlers = []
        
        # File handler with detailed format
        file_handler = logging.FileHandler(self.log_file, encoding="utf-8")
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(logging.Formatter(
            "%(asctime)s | %(message)s",
            datefmt="%H:%M:%S"
        ))
        self.logger.addHandler(file_handler)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(logging.Formatter("[%(levelname)s] %(message)s"))
        self.logger.addHandler(console_handler)
        
        self._write_header()
    
    def _write_header(self):
        """Write log file header"""
        self.logger.info("")
        self.logger.info("=" * 80)
        self.logger.info("AXIOM TOOL EXECUTION LOG")
        self.logger.info(f"Session: {self.session_id}")
        self.logger.info(f"Started: {datetime.now(timezone.utc).isoformat()}")
        self.logger.info("=" * 80)
    
    def log_tool_start(self, tool_name: str, topic: str, context: dict = None):
        """Log tool execution start"""
        self.logger.info("")
        self.logger.info("-" * 60)
        self.logger.info(f"TOOL: {tool_name.upper()}")
        self.logger.info(f"Topic: {topic}")
        if context:
            self.logger.debug(f"Context: {context}")
        self.logger.info("-" * 60)
    
    def log_tool_result(self, tool_name: str, result: dict, confidence: float):
        """Log tool execution result"""
        self.logger.info(f"Result from {tool_name}:")
        for key, value in result.items():
            self.logger.info(f"  {key}: {value}")
        self.logger.info(f"Confidence: {confidence:.2f}")
    
    def log_decision(self, rule: str, verdict: str, reason: str):
        """Log a verdict decision"""
        self.logger.info("")
        self.logger.info("*" * 60)
        self.logger.info(f"DECISION: {verdict.upper()}")
        self.logger.info(f"Rule: {rule}")
        self.logger.info(f"Reason: {reason}")
        self.logger.info("*" * 60)
    
    def log_summary(self, evidence: dict):
        """Log final summary"""
        self.logger.info("")
        self.logger.info("=" * 80)
        self.logger.info("EXECUTION SUMMARY")
        self.logger.info("=" * 80)
        
        freshness = evidence.get("freshness", {})
        market = evidence.get("market", {})
        friction = evidence.get("friction", {})
        
        self.logger.info("")
        self.logger.info("FRESHNESS CHECK:")
        self.logger.info(f"  Outdated: {freshness.get('is_model_likely_outdated', False)}")
        self.logger.info(f"  Reason: {freshness.get('reason', 'N/A')}")
        
        self.logger.info("")
        self.logger.info("MARKET SIGNAL:")
        self.logger.info(f"  Adoption: {market.get('adoption', 'N/A')}")
        self.logger.info(f"  Hiring Signal: {market.get('hiring_signal', 'N/A')}")
        self.logger.info(f"  Ecosystem: {market.get('ecosystem_maturity', 'N/A')}")
        
        self.logger.info("")
        self.logger.info("FRICTION ESTIMATE:")
        self.logger.info(f"  Overall: {friction.get('overall_friction', 'N/A')}")
        self.logger.info(f"  Learning Curve: {friction.get('learning_curve', 'N/A')}")
        self.logger.info(f"  Infra Cost: {friction.get('infra_cost', 'N/A')}")
        self.logger.info(f"  User Modifier: {friction.get('user_modifier', 0):+.2f}")
        
        self.logger.info("")
        self.logger.info("COMBINED:")
        self.logger.info(f"  Watchlist Triggered: {evidence.get('watchlist_triggered', False)}")
        self.logger.info(f"  Combined Confidence: {evidence.get('combined_confidence', 'N/A')}")
        self.logger.info(f"  Timestamp: {evidence.get('timestamp', 'N/A')}")
        
        self.logger.info("")
        self.logger.info("=" * 80)
        self.logger.info(f"Log saved to: {self.log_file}")
        self.logger.info("=" * 80)


# Create a default tool logger for easy import
_default_tool_logger = None

def get_tool_logger(session_id: Optional[str] = None) -> ToolLogger:
    """Get or create a tool logger"""
    global _default_tool_logger
    if session_id:
        return ToolLogger(session_id)
    if _default_tool_logger is None:
        _default_tool_logger = ToolLogger()
    return _default_tool_logger
