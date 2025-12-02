from typing import Dict
import os

class RiskThreshold:
    """Manages configurable risk thresholds"""
    
    def __init__(self):
        # Default thresholds (can be overridden by config)
        self.thresholds = {
            "low": float(os.getenv("FRAUD_THRESHOLD_LOW", "30.0")),
            "medium": float(os.getenv("FRAUD_THRESHOLD_MEDIUM", "60.0")),
            "high": float(os.getenv("FRAUD_THRESHOLD_HIGH", "80.0"))
        }
    
    def get_risk_level(self, score: float) -> str:
        """Determine risk level from score
        
        Args:
            score: Fraud score (0-100)
            
        Returns:
            Risk level: low, medium, or high
        """
        if score >= self.thresholds["high"]:
            return "high"
        elif score >= self.thresholds["medium"]:
            return "medium"
        else:
            return "low"
    
    def update_thresholds(self, thresholds: Dict[str, float]):
        """Update risk thresholds"""
        self.thresholds.update(thresholds)
    
    def get_thresholds(self) -> Dict[str, float]:
        """Get current thresholds"""
        return self.thresholds.copy()
