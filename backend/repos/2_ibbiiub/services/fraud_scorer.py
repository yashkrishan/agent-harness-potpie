from typing import Dict, List
from services.heuristics.velocity_check import VelocityCheck
from services.heuristics.geographic_check import GeographicCheck
from services.heuristics.amount_check import AmountCheck
from services.heuristics.card_pattern_check import CardPatternCheck
import logging

logger = logging.getLogger(__name__)

class FraudScorer:
    """Aggregates heuristic scores into unified fraud risk score"""
    
    def __init__(self):
        self.velocity_check = VelocityCheck()
        self.geographic_check = GeographicCheck()
        self.amount_check = AmountCheck()
        self.card_pattern_check = CardPatternCheck()
        
        # Heuristic weights (configurable)
        self.weights = {
            "velocity": 0.25,
            "geographic": 0.20,
            "amount": 0.20,
            "card_pattern": 0.35
        }
    
    async def calculate_score(self, transaction_data: Dict) -> float:
        """Calculate final fraud score
        
        Args:
            transaction_data: Transaction information
            
        Returns:
            Final fraud score (0-100)
        """
        from database import SessionLocal
        db = SessionLocal()
        
        try:
            results = {}
            
            # Run all heuristics
            velocity_result = await self.velocity_check.check(transaction_data, db)
            results["velocity"] = velocity_result
            
            geographic_result = await self.geographic_check.check(transaction_data, db)
            results["geographic"] = geographic_result
            
            amount_result = await self.amount_check.check(transaction_data, db)
            results["amount"] = amount_result
            
            card_result = await self.card_pattern_check.check(transaction_data, db)
            results["card_pattern"] = card_result
            
            # Calculate weighted score
            final_score = (
                velocity_result["score"] * self.weights["velocity"] +
                geographic_result["score"] * self.weights["geographic"] +
                amount_result["score"] * self.weights["amount"] +
                card_result["score"] * self.weights["card_pattern"]
            )
            
            logger.info(f"Fraud score calculated: {final_score:.2f}")
            logger.debug(f"Heuristic breakdown: {results}")
            
            return min(100, max(0, final_score))
        
        finally:
            db.close()
