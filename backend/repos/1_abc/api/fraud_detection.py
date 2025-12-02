from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Optional
from services.fraud_detection_service import FraudDetectionService
from models.transaction import Transaction
from database import get_db
from sqlalchemy.orm import Session

router = APIRouter()
service = FraudDetectionService()

class FraudCheckRequest(BaseModel):
    transaction_id: str
    card_number: str  # Will be hashed
    amount: float
    currency: str = "USD"
    user_id: str
    ip_address: str
    location: Optional[Dict] = None

@router.post("/check")
async def check_fraud(request: FraudCheckRequest, db: Session = Depends(get_db)):
    """Check transaction for fraud"""
    try:
        transaction_data = {
            "transaction_id": request.transaction_id,
            "card_number": request.card_number,
            "amount": request.amount,
            "currency": request.currency,
            "user_id": request.user_id,
            "ip_address": request.ip_address,
            "location": request.location
        }
        
        result = await service.analyze_transaction(transaction_data)
        
        # Store transaction in database
        transaction = Transaction(
            transaction_id=request.transaction_id,
            card_number_hash=hash_card(request.card_number),
            amount=request.amount,
            currency=request.currency,
            user_id=request.user_id,
            ip_address=request.ip_address,
            location_data=request.location,
            fraud_score=result["fraud_score"],
            risk_level=result["risk_level"],
            decision=result["decision"]
        )
        db.add(transaction)
        db.commit()
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{transaction_id}")
async def get_history(transaction_id: str, db: Session = Depends(get_db)):
    """Get fraud detection history for transaction"""
    transaction = db.query(Transaction).filter(
        Transaction.transaction_id == transaction_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {
        "transaction_id": transaction.transaction_id,
        "fraud_score": transaction.fraud_score,
        "risk_level": transaction.risk_level,
        "decision": transaction.decision,
        "created_at": transaction.created_at.isoformat()
    }

def hash_card(card_number: str) -> str:
    """Hash card number for storage"""
    import hashlib
    return hashlib.sha256(card_number.encode()).hexdigest()
