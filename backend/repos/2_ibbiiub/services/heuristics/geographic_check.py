from typing import Dict, Optional
from database import get_db
from sqlalchemy.orm import Session
from models.transaction import Transaction

class GeographicCheck:
    """Detect transactions from unusual locations or rapid location changes"""
    
    async def check(self, transaction_data: Dict, db: Session) -> Dict:
        """Check for geographic anomalies
        
        Returns:
            Dict with score (0-100) and details
        """
        user_id = transaction_data.get("user_id")
        current_location = transaction_data.get("location", {})
        current_country = current_location.get("country")
        current_city = current_location.get("city")
        
        if not user_id or not current_country:
            return {
                "score": 0,
                "details": {"reason": "Insufficient location data"}
            }
        
        # Get user's recent transaction locations
        recent_transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id
        ).order_by(Transaction.created_at.desc()).limit(10).all()
        
        if not recent_transactions:
            # New user, no history
            return {
                "score": 10,  # Low risk for new users
                "details": {"reason": "New user, no location history"}
            }
        
        # Check if location changed rapidly
        last_transaction = recent_transactions[0]
        last_location = last_transaction.location_data or {}
        last_country = last_location.get("country")
        
        if last_country and last_country != current_country:
            # Different country - could be travel or fraud
            # Check time difference
            time_diff = (transaction_data.get("timestamp") - last_transaction.created_at).total_seconds() / 3600
            
            if time_diff < 2:  # Less than 2 hours
                return {
                    "score": 80,
                    "details": {
                        "reason": f"Rapid location change: {last_country} to {current_country} in {time_diff:.1f} hours",
                        "last_country": last_country,
                        "current_country": current_country
                    }
                }
        
        # Check for transactions from known high-risk countries
        high_risk_countries = ["XX", "YY"]  # Placeholder
        if current_country in high_risk_countries:
            return {
                "score": 60,
                "details": {"reason": f"Transaction from high-risk country: {current_country}"}
            }
        
        return {
            "score": 0,
            "details": {"reason": "Geographic check passed"}
        }
