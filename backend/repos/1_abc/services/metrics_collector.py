from typing import Dict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class MetricsCollector:
    """Collects metrics for fraud detection performance"""
    
    def __init__(self):
        self.metrics = {
            "total_checks": 0,
            "blocked": 0,
            "flagged": 0,
            "allowed": 0,
            "avg_score": 0.0,
            "avg_latency_ms": 0.0
        }
    
    def record_check(self, result: Dict, latency_ms: float):
        """Record a fraud check
        
        Args:
            result: Fraud detection result
            latency_ms: Processing latency in milliseconds
        """
        self.metrics["total_checks"] += 1
        
        decision = result.get("decision", "allow")
        if decision == "block":
            self.metrics["blocked"] += 1
        elif decision == "flag":
            self.metrics["flagged"] += 1
        else:
            self.metrics["allowed"] += 1
        
        # Update average score
        current_avg = self.metrics["avg_score"]
        count = self.metrics["total_checks"]
        new_score = result.get("fraud_score", 0)
        self.metrics["avg_score"] = ((current_avg * (count - 1)) + new_score) / count
        
        # Update average latency
        current_avg_latency = self.metrics["avg_latency_ms"]
        self.metrics["avg_latency_ms"] = ((current_avg_latency * (count - 1)) + latency_ms) / count
        
        logger.debug(f"Metrics updated: {self.metrics}")
    
    def get_metrics(self) -> Dict:
        """Get current metrics"""
        return self.metrics.copy()
    
    def reset_metrics(self):
        """Reset all metrics"""
        self.metrics = {
            "total_checks": 0,
            "blocked": 0,
            "flagged": 0,
            "allowed": 0,
            "avg_score": 0.0,
            "avg_latency_ms": 0.0
        }
