from typing import Dict, Optional
from models.transaction import Transaction
from services.fraud_scorer import FraudScorer
from services.decision_engine import DecisionEngine
import logging

logger = logging.getLogger(__name__)

class FraudDetectionService:
    """Main service for fraud detection pipeline"""
    
    def __init__(self):
        self.scorer = FraudScorer()
        self.decision_engine = DecisionEngine()
    
    async def analyze_transaction(self, transaction_data: Dict) -> Dict:
        """Analyze a transaction for fraud
        
        Args:
            transaction_data: Transaction information including card, amount, location, etc.
            
        Returns:
            Dict with fraud_score, risk_level, decision, and reason
        """
        logger.info(f"Analyzing transaction: {transaction_data.get('transaction_id')}")
        
        # Calculate fraud score using heuristics
        fraud_score = await self.scorer.calculate_score(transaction_data)
        
        # Make decision based on score
        decision_result = self.decision_engine.make_decision(fraud_score, transaction_data)
        
        return {
            "fraud_score": fraud_score,
            "risk_level": decision_result["risk_level"],
            "decision": decision_result["decision"],
            "reason": decision_result["reason"]
        }
    
    async def get_transaction_history(self, user_id: str) -> List[Dict]:
        """Get fraud detection history for a user"""
        # Implementation for retrieving transaction history
        pass
