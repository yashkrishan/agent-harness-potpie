from typing import Dict
from models.transaction import Transaction, FraudEvent
from database import SessionLocal
import logging

logger = logging.getLogger(__name__)

class TransactionLogger:
    """Logs all fraud detection events for audit and analysis"""
    
    def log_fraud_check(self, transaction_id: str, result: Dict, heuristic_results: Dict):
        """Log fraud check result
        
        Args:
            transaction_id: Transaction ID
            result: Fraud detection result
            heuristic_results: Individual heuristic results
        """
        db = SessionLocal()
        try:
            transaction = db.query(Transaction).filter(
                Transaction.transaction_id == transaction_id
            ).first()
            
            if not transaction:
                logger.warning(f"Transaction {transaction_id} not found for logging")
                return
            
            # Log each heuristic result
            for heuristic_name, heuristic_result in heuristic_results.items():
                event = FraudEvent(
                    transaction_id=transaction.id,
                    event_type="heuristic_check",
                    heuristic_name=heuristic_name,
                    score_contribution=heuristic_result.get("score", 0),
                    details=heuristic_result.get("details", {})
                )
                db.add(event)
            
            # Log final decision
            event = FraudEvent(
                transaction_id=transaction.id,
                event_type="final_decision",
                heuristic_name="decision_engine",
                score_contribution=result.get("fraud_score", 0),
                details={
                    "decision": result.get("decision"),
                    "risk_level": result.get("risk_level"),
                    "reason": result.get("reason")
                }
            )
            db.add(event)
            db.commit()
            
            logger.info(f"Logged fraud check for transaction {transaction_id}")
        
        except Exception as e:
            logger.error(f"Error logging fraud check: {e}")
            db.rollback()
        finally:
            db.close()
