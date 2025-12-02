from typing import Dict
from services.risk_threshold import RiskThreshold
import logging

logger = logging.getLogger(__name__)

class DecisionEngine:
    """Makes blocking/flagging decisions based on fraud scores"""
    
    def __init__(self):
        self.threshold = RiskThreshold()
    
    def make_decision(self, fraud_score: float, transaction_data: Dict) -> Dict:
        """Make decision based on fraud score
        
        Args:
            fraud_score: Calculated fraud score (0-100)
            transaction_data: Transaction information
            
        Returns:
            Dict with decision, risk_level, and reason
        """
        risk_level = self.threshold.get_risk_level(fraud_score)
        
        if risk_level == "high":
            decision = "block"
            reason = f"High fraud risk detected (score: {fraud_score:.2f})"
        elif risk_level == "medium":
            decision = "flag"
            reason = f"Medium fraud risk detected (score: {fraud_score:.2f}), requires review"
        else:
            decision = "allow"
            reason = f"Low fraud risk (score: {fraud_score:.2f})"
        
        logger.info(f"Decision: {decision} for transaction {transaction_data.get('transaction_id')}")
        
        return {
            "decision": decision,
            "risk_level": risk_level,
            "reason": reason,
            "fraud_score": fraud_score
        }
