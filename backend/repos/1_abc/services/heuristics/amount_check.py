from typing import Dict
from database import get_db
from sqlalchemy.orm import Session
from models.transaction import Transaction
import statistics

class AmountCheck:
    """Flag transactions with unusually high or low amounts"""
    
    async def check(self, transaction_data: Dict, db: Session) -> Dict:
        """Check for amount anomalies
        
        Returns:
            Dict with score (0-100) and details
        """
        user_id = transaction_data.get("user_id")
        current_amount = transaction_data.get("amount", 0)
        
        if not user_id:
            return {
                "score": 0,
                "details": {"reason": "No user ID provided"}
            }
        
        # Get user's transaction history
        user_transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.decision == "allow"  # Only consider successful transactions
        ).order_by(Transaction.created_at.desc()).limit(50).all()
        
        if len(user_transactions) < 3:
            # Not enough history
            return {
                "score": 5,
                "details": {"reason": "Insufficient transaction history"}
            }
        
        amounts = [t.amount for t in user_transactions]
        avg_amount = statistics.mean(amounts)
        median_amount = statistics.median(amounts)
        std_dev = statistics.stdev(amounts) if len(amounts) > 1 else avg_amount * 0.5
        
        # Check if amount is significantly higher than average
        if current_amount > avg_amount + (3 * std_dev):
            deviation = ((current_amount - avg_amount) / avg_amount) * 100
            score = min(100, 50 + (deviation / 2))
            return {
                "score": score,
                "details": {
                    "reason": f"Amount {deviation:.1f}% above average",
                    "current_amount": current_amount,
                    "average_amount": avg_amount,
                    "median_amount": median_amount
                }
            }
        
        # Check if amount is unusually low (potential test transaction)
        if current_amount < avg_amount * 0.1 and current_amount < 1.0:
            return {
                "score": 40,
                "details": {
                    "reason": "Unusually low amount, possible test transaction",
                    "current_amount": current_amount,
                    "average_amount": avg_amount
                }
            }
        
        return {
            "score": 0,
            "details": {
                "reason": "Amount check passed",
                "current_amount": current_amount,
                "average_amount": avg_amount
            }
        }
