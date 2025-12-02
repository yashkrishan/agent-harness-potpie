from typing import Dict
from datetime import datetime, timedelta
from database import get_db
from sqlalchemy.orm import Session
from models.transaction import Transaction

class VelocityCheck:
    """Check for multiple transactions from same card/IP in short time period"""
    
    def __init__(self, time_window_minutes: int = 5, max_transactions: int = 3):
        self.time_window_minutes = time_window_minutes
        self.max_transactions = max_transactions
    
    async def check(self, transaction_data: Dict, db: Session) -> Dict:
        """Check velocity of transactions
        
        Returns:
            Dict with score (0-100) and details
        """
        card_hash = self._hash_card(transaction_data.get("card_number", ""))
        ip_address = transaction_data.get("ip_address")
        user_id = transaction_data.get("user_id")
        
        time_threshold = datetime.utcnow() - timedelta(minutes=self.time_window_minutes)
        
        # Check transactions from same card
        card_count = db.query(Transaction).filter(
            Transaction.card_number_hash == card_hash,
            Transaction.created_at >= time_threshold
        ).count()
        
        # Check transactions from same IP
        ip_count = db.query(Transaction).filter(
            Transaction.ip_address == ip_address,
            Transaction.created_at >= time_threshold
        ).count()
        
        # Check transactions from same user
        user_count = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.created_at >= time_threshold
        ).count()
        
        max_count = max(card_count, ip_count, user_count)
        
        if max_count >= self.max_transactions:
            score = min(100, (max_count - self.max_transactions + 1) * 30)
            return {
                "score": score,
                "details": {
                    "card_transactions": card_count,
                    "ip_transactions": ip_count,
                    "user_transactions": user_count,
                    "reason": f"High velocity detected: {max_count} transactions in {self.time_window_minutes} minutes"
                }
            }
        
        return {
            "score": 0,
            "details": {
                "card_transactions": card_count,
                "ip_transactions": ip_count,
                "user_transactions": user_count,
                "reason": "Velocity check passed"
            }
        }
    
    def _hash_card(self, card_number: str) -> str:
        import hashlib
        return hashlib.sha256(card_number.encode()).hexdigest()
