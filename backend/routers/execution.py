from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db, Project, Task, ExecutionLog, Phase, SessionLocal
from pydantic import BaseModel
from typing import Optional, List
import os
import asyncio
import time
from pathlib import Path

router = APIRouter()

class ExecutionCommand(BaseModel):
    command: str  # play, pause, stop
    task_id: Optional[int] = None
    user_instruction: Optional[str] = None

execution_state = {}  # In-memory state for execution

# Hardcoded code snippets for demo
DEMO_CODE_SNIPPETS = {
    "services/fraud_detection_service.py": """from typing import Dict, Optional
from models.transaction import Transaction
from services.fraud_scorer import FraudScorer
from services.decision_engine import DecisionEngine
import logging

logger = logging.getLogger(__name__)

class FraudDetectionService:
    \"\"\"Main service for fraud detection pipeline\"\"\"
    
    def __init__(self):
        self.scorer = FraudScorer()
        self.decision_engine = DecisionEngine()
    
    async def analyze_transaction(self, transaction_data: Dict) -> Dict:
        \"\"\"Analyze a transaction for fraud
        
        Args:
            transaction_data: Transaction information including card, amount, location, etc.
            
        Returns:
            Dict with fraud_score, risk_level, decision, and reason
        \"\"\"
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
        \"\"\"Get fraud detection history for a user\"\"\"
        # Implementation for retrieving transaction history
        pass
""",
    "models/transaction.py": """from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from database import Base

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(String, unique=True, nullable=False, index=True)
    card_number_hash = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    user_id = Column(String, nullable=False, index=True)
    ip_address = Column(String)
    location_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    fraud_score = Column(Float)
    risk_level = Column(String)  # low, medium, high
    decision = Column(String)  # allow, flag, block
    
    fraud_events = relationship("FraudEvent", back_populates="transaction")

class FraudEvent(Base):
    __tablename__ = "fraud_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=False)
    event_type = Column(String, nullable=False)
    heuristic_name = Column(String, nullable=False)
    score_contribution = Column(Float)
    details = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    transaction = relationship("Transaction", back_populates="fraud_events")
""",
    "api/fraud_detection.py": """from fastapi import APIRouter, HTTPException, Depends
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
    \"\"\"Check transaction for fraud\"\"\"
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
    \"\"\"Get fraud detection history for transaction\"\"\"
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
    \"\"\"Hash card number for storage\"\"\"
    import hashlib
    return hashlib.sha256(card_number.encode()).hexdigest()
""",
    "services/heuristics/velocity_check.py": """from typing import Dict
from datetime import datetime, timedelta
from database import get_db
from sqlalchemy.orm import Session
from models.transaction import Transaction

class VelocityCheck:
    \"\"\"Check for multiple transactions from same card/IP in short time period\"\"\"
    
    def __init__(self, time_window_minutes: int = 5, max_transactions: int = 3):
        self.time_window_minutes = time_window_minutes
        self.max_transactions = max_transactions
    
    async def check(self, transaction_data: Dict, db: Session) -> Dict:
        \"\"\"Check velocity of transactions
        
        Returns:
            Dict with score (0-100) and details
        \"\"\"
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
""",
    "services/heuristics/geographic_check.py": """from typing import Dict, Optional
from database import get_db
from sqlalchemy.orm import Session
from models.transaction import Transaction

class GeographicCheck:
    \"\"\"Detect transactions from unusual locations or rapid location changes\"\"\"
    
    async def check(self, transaction_data: Dict, db: Session) -> Dict:
        \"\"\"Check for geographic anomalies
        
        Returns:
            Dict with score (0-100) and details
        \"\"\"
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
""",
    "services/heuristics/amount_check.py": """from typing import Dict
from database import get_db
from sqlalchemy.orm import Session
from models.transaction import Transaction
import statistics

class AmountCheck:
    \"\"\"Flag transactions with unusually high or low amounts\"\"\"
    
    async def check(self, transaction_data: Dict, db: Session) -> Dict:
        \"\"\"Check for amount anomalies
        
        Returns:
            Dict with score (0-100) and details
        \"\"\"
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
""",
    "services/heuristics/card_pattern_check.py": """from typing import Dict, List
import re

class CardPatternCheck:
    \"\"\"Check against known patterns of stolen or compromised cards\"\"\"
    
    def __init__(self):
        # In production, this would be loaded from database or external service
        self.blocked_patterns = [
            r"^4[0-9]{12}(?:[0-9]{3})?$",  # Example pattern
        ]
        self.blocked_bins = ["411111", "424242"]  # Test card BINs
    
    async def check(self, transaction_data: Dict, db) -> Dict:
        \"\"\"Check card against known patterns
        
        Returns:
            Dict with score (0-100) and details
        \"\"\"
        card_number = transaction_data.get("card_number", "")
        card_bin = card_number[:6]
        
        # Check against blocked BINs
        if card_bin in self.blocked_bins:
            return {
                "score": 100,
                "details": {
                    "reason": f"Card BIN {card_bin} is in blocked list",
                    "card_bin": card_bin
                }
            }
        
        # Check against patterns
        for pattern in self.blocked_patterns:
            if re.match(pattern, card_number):
                return {
                    "score": 90,
                    "details": {
                        "reason": "Card matches known fraud pattern",
                        "pattern": pattern
                    }
                }
        
        # Check for sequential numbers (potential test cards)
        if self._is_sequential(card_number):
            return {
                "score": 70,
                "details": {"reason": "Card number appears sequential"}
            }
        
        return {
            "score": 0,
            "details": {"reason": "Card pattern check passed"}
        }
    
    def _is_sequential(self, card_number: str) -> bool:
        \"\"\"Check if card number is sequential\"\"\"
        digits = [int(d) for d in card_number if d.isdigit()]
        if len(digits) < 4:
            return False
        
        # Check if digits are sequential
        diffs = [digits[i+1] - digits[i] for i in range(len(digits)-1)]
        return all(d == diffs[0] for d in diffs) and abs(diffs[0]) == 1
""",
    "services/fraud_scorer.py": """from typing import Dict, List
from services.heuristics.velocity_check import VelocityCheck
from services.heuristics.geographic_check import GeographicCheck
from services.heuristics.amount_check import AmountCheck
from services.heuristics.card_pattern_check import CardPatternCheck
import logging

logger = logging.getLogger(__name__)

class FraudScorer:
    \"\"\"Aggregates heuristic scores into unified fraud risk score\"\"\"
    
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
        \"\"\"Calculate final fraud score
        
        Args:
            transaction_data: Transaction information
            
        Returns:
            Final fraud score (0-100)
        \"\"\"
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
""",
    "services/risk_threshold.py": """from typing import Dict
import os

class RiskThreshold:
    \"\"\"Manages configurable risk thresholds\"\"\"
    
    def __init__(self):
        # Default thresholds (can be overridden by config)
        self.thresholds = {
            "low": float(os.getenv("FRAUD_THRESHOLD_LOW", "30.0")),
            "medium": float(os.getenv("FRAUD_THRESHOLD_MEDIUM", "60.0")),
            "high": float(os.getenv("FRAUD_THRESHOLD_HIGH", "80.0"))
        }
    
    def get_risk_level(self, score: float) -> str:
        \"\"\"Determine risk level from score
        
        Args:
            score: Fraud score (0-100)
            
        Returns:
            Risk level: low, medium, or high
        \"\"\"
        if score >= self.thresholds["high"]:
            return "high"
        elif score >= self.thresholds["medium"]:
            return "medium"
        else:
            return "low"
    
    def update_thresholds(self, thresholds: Dict[str, float]):
        \"\"\"Update risk thresholds\"\"\"
        self.thresholds.update(thresholds)
    
    def get_thresholds(self) -> Dict[str, float]:
        \"\"\"Get current thresholds\"\"\"
        return self.thresholds.copy()
""",
    "services/decision_engine.py": """from typing import Dict
from services.risk_threshold import RiskThreshold
import logging

logger = logging.getLogger(__name__)

class DecisionEngine:
    \"\"\"Makes blocking/flagging decisions based on fraud scores\"\"\"
    
    def __init__(self):
        self.threshold = RiskThreshold()
    
    def make_decision(self, fraud_score: float, transaction_data: Dict) -> Dict:
        \"\"\"Make decision based on fraud score
        
        Args:
            fraud_score: Calculated fraud score (0-100)
            transaction_data: Transaction information
            
        Returns:
            Dict with decision, risk_level, and reason
        \"\"\"
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
""",
    "services/transaction_blocker.py": """from typing import Dict
import logging

logger = logging.getLogger(__name__)

class TransactionBlocker:
    \"\"\"Handles automatic blocking of high-risk transactions\"\"\"
    
    async def block_transaction(self, transaction_id: str, reason: str) -> bool:
        \"\"\"Block a transaction
        
        Args:
            transaction_id: ID of transaction to block
            reason: Reason for blocking
            
        Returns:
            True if blocked successfully
        \"\"\"
        logger.warning(f"Blocking transaction {transaction_id}: {reason}")
        
        # In production, this would:
        # 1. Update transaction status in database
        # 2. Send notification to payment gateway
        # 3. Trigger alert to fraud team
        # 4. Log event for audit
        
        return True
    
    async def unblock_transaction(self, transaction_id: str) -> bool:
        \"\"\"Unblock a transaction (for false positives)\"\"\"
        logger.info(f"Unblocking transaction {transaction_id}")
        return True
""",
    "integrations/checkout_client.py": """import httpx
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class CheckoutClient:
    \"\"\"Client library for checkout service to call fraud detection\"\"\"
    
    def __init__(self, fraud_service_url: str = "http://localhost:8000"):
        self.base_url = fraud_service_url
        self.client = httpx.AsyncClient(timeout=5.0)
    
    async def check_fraud(self, transaction_data: Dict) -> Dict:
        \"\"\"Check transaction for fraud
        
        Args:
            transaction_data: Transaction information
            
        Returns:
            Fraud detection result
        \"\"\"
        try:
            response = await self.client.post(
                f"{self.base_url}/api/v1/fraud/check",
                json=transaction_data
            )
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"Error calling fraud service: {e}")
            # Fallback: allow transaction if service unavailable
            return {
                "fraud_score": 0,
                "risk_level": "low",
                "decision": "allow",
                "reason": "Fraud service unavailable, allowing transaction"
            }
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from fraud service: {e}")
            return {
                "fraud_score": 0,
                "risk_level": "low",
                "decision": "allow",
                "reason": "Fraud service error, allowing transaction"
            }
    
    async def close(self):
        \"\"\"Close HTTP client\"\"\"
        await self.client.aclose()
""",
    "services/transaction_logger.py": """from typing import Dict
from models.transaction import Transaction, FraudEvent
from database import SessionLocal
import logging

logger = logging.getLogger(__name__)

class TransactionLogger:
    \"\"\"Logs all fraud detection events for audit and analysis\"\"\"
    
    def log_fraud_check(self, transaction_id: str, result: Dict, heuristic_results: Dict):
        \"\"\"Log fraud check result
        
        Args:
            transaction_id: Transaction ID
            result: Fraud detection result
            heuristic_results: Individual heuristic results
        \"\"\"
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
""",
    "services/metrics_collector.py": """from typing import Dict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class MetricsCollector:
    \"\"\"Collects metrics for fraud detection performance\"\"\"
    
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
        \"\"\"Record a fraud check
        
        Args:
            result: Fraud detection result
            latency_ms: Processing latency in milliseconds
        \"\"\"
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
        \"\"\"Get current metrics\"\"\"
        return self.metrics.copy()
    
    def reset_metrics(self):
        \"\"\"Reset all metrics\"\"\"
        self.metrics = {
            "total_checks": 0,
            "blocked": 0,
            "flagged": 0,
            "allowed": 0,
            "avg_score": 0.0,
            "avg_latency_ms": 0.0
        }
""",
    "services/config_manager.py": """from typing import Dict, Optional
import json
import os
from pathlib import Path

class ConfigManager:
    \"\"\"Manages fraud detection configuration without code deployment\"\"\"
    
    def __init__(self, config_file: str = "fraud_config.json"):
        self.config_file = Path(config_file)
        self.config = self._load_config()
    
    def _load_config(self) -> Dict:
        \"\"\"Load configuration from file or use defaults\"\"\"
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading config: {e}")
        
        # Default configuration
        return {
            "heuristic_weights": {
                "velocity": 0.25,
                "geographic": 0.20,
                "amount": 0.20,
                "card_pattern": 0.35
            },
            "risk_thresholds": {
                "low": 30.0,
                "medium": 60.0,
                "high": 80.0
            },
            "velocity_check": {
                "time_window_minutes": 5,
                "max_transactions": 3
            },
            "enabled_heuristics": [
                "velocity",
                "geographic",
                "amount",
                "card_pattern"
            ]
        }
    
    def get_config(self) -> Dict:
        \"\"\"Get current configuration\"\"\"
        return self.config.copy()
    
    def update_config(self, updates: Dict):
        \"\"\"Update configuration
        
        Args:
            updates: Configuration updates to apply
        \"\"\"
        self.config.update(updates)
        self._save_config()
    
    def _save_config(self):
        \"\"\"Save configuration to file\"\"\"
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            print(f"Error saving config: {e}")
    
    def get_heuristic_weight(self, heuristic_name: str) -> float:
        \"\"\"Get weight for a specific heuristic\"\"\"
        return self.config.get("heuristic_weights", {}).get(heuristic_name, 0.25)
    
    def is_heuristic_enabled(self, heuristic_name: str) -> bool:
        \"\"\"Check if a heuristic is enabled\"\"\"
        return heuristic_name in self.config.get("enabled_heuristics", [])
"""
}

async def execute_task(task_id: int, project_id: int, db: Session = None):
    if db is None:
        db = SessionLocal()
        should_close = True
    else:
        should_close = False
    
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return
        
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project or not project.repo_path:
            return
        
        task.status = "in_progress"
        db.commit()
        
        # Log start
        log = ExecutionLog(
            project_id=project_id,
            task_id=task_id,
            log_type="agent_message",
            content=f"🚀 Starting task: {task.name}"
        )
        db.add(log)
        db.commit()
        
        time.sleep(0.5)  # Simulate processing
        
        # Log analyzing
        log = ExecutionLog(
            project_id=project_id,
            task_id=task_id,
            log_type="agent_message",
            content=f"📋 Analyzing requirements for: {task.name}"
        )
        db.add(log)
        db.commit()
        time.sleep(0.5)
        
        # Log code generation
        log = ExecutionLog(
            project_id=project_id,
            task_id=task_id,
            log_type="agent_message",
            content=f"💻 Generating code implementation..."
        )
        db.add(log)
        db.commit()
        time.sleep(0.5)
        
        # Get hardcoded code for this task
        code = DEMO_CODE_SNIPPETS.get(task.file_path or "", "")
        
        if not code:
            # Fallback: generate basic code structure
            code = f"""# {task.name}\n# {task.description}\n\n# TODO: Implement this task\npass\n"""
        
        # Log file preparation
        if task.file_path and project.repo_path:
            log = ExecutionLog(
                project_id=project_id,
                task_id=task_id,
                log_type="agent_message",
                content=f"📁 Preparing file: {task.file_path}"
            )
            db.add(log)
            db.commit()
            time.sleep(0.3)
            
            file_path = os.path.join(project.repo_path, task.file_path)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            log = ExecutionLog(
                project_id=project_id,
                task_id=task_id,
                log_type="agent_message",
                content=f"✍️ Writing code to {task.file_path}..."
            )
            db.add(log)
            db.commit()
            time.sleep(0.3)
            
            with open(file_path, 'w') as f:
                f.write(code)
            
            log = ExecutionLog(
                project_id=project_id,
                task_id=task_id,
                log_type="code_change",
                content=f"✅ Code written successfully to {task.file_path}"
            )
            db.add(log)
            db.commit()
            time.sleep(0.2)
        
        # Log completion
        log = ExecutionLog(
            project_id=project_id,
            task_id=task_id,
            log_type="agent_message",
            content=f"✨ Task completed: {task.name}"
        )
        db.add(log)
        db.commit()
        
        task.code_changes = code
        task.status = "completed"
        db.commit()
        
    except Exception as e:
        task.status = "failed"
        log = ExecutionLog(
            project_id=project_id,
            task_id=task_id,
            log_type="error",
            content=f"Error: {str(e)}"
        )
        db.add(log)
        db.commit()
    finally:
        if should_close:
            db.close()

@router.post("/start")
async def start_execution(project_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all pending tasks
    phases = db.query(Phase).filter(Phase.project_id == project_id).order_by(Phase.phase_number).all()
    tasks = []
    for phase in phases:
        phase_tasks = db.query(Task).filter(Task.phase_id == phase.id, Task.status == "pending").order_by(Task.task_number).all()
        tasks.extend(phase_tasks)
    
    if not tasks:
        return {"message": "No pending tasks"}
    
    project.status = "executing"
    db.commit()
    
    execution_state[project_id] = {"running": True, "current_task": None}
    
    # Execute tasks in background
    async def run_tasks():
        for task in tasks:
            if not execution_state.get(project_id, {}).get("running", False):
                break
            
            execution_state[project_id]["current_task"] = task.id
            await execute_task(task.id, project_id)
        
        execution_state[project_id] = {"running": False, "current_task": None}
        # Update project status
        db_session = SessionLocal()
        try:
            proj = db_session.query(Project).filter(Project.id == project_id).first()
            if proj:
                proj.status = "testing"
                db_session.commit()
        finally:
            db_session.close()
    
    background_tasks.add_task(run_tasks)
    
    return {"message": "Execution started", "tasks_count": len(tasks)}

@router.post("/command")
async def execution_command(project_id: int, command: ExecutionCommand, db: Session = Depends(get_db)):
    if command.command == "pause":
        execution_state[project_id] = {"running": False, "current_task": execution_state.get(project_id, {}).get("current_task")}
        return {"message": "Execution paused"}
    elif command.command == "stop":
        execution_state[project_id] = {"running": False, "current_task": None}
        return {"message": "Execution stopped"}
    elif command.command == "play":
        execution_state[project_id] = {"running": True, "current_task": execution_state.get(project_id, {}).get("current_task")}
        return {"message": "Execution resumed"}
    
    return {"message": "Unknown command"}

@router.get("/logs/{project_id}")
async def get_logs(project_id: int, task_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(ExecutionLog).filter(ExecutionLog.project_id == project_id)
    if task_id:
        query = query.filter(ExecutionLog.task_id == task_id)
    
    logs = query.order_by(ExecutionLog.created_at).all()
    
    return {
        "logs": [{
            "id": log.id,
            "task_id": log.task_id,
            "log_type": log.log_type,
            "content": log.content,
            "created_at": log.created_at.isoformat()
        } for log in logs]
    }

@router.get("/status/{project_id}")
async def get_execution_status(project_id: int, db: Session = Depends(get_db)):
    state = execution_state.get(project_id, {"running": False, "current_task": None})
    
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    task_statuses = {
        "pending": len([t for t in tasks if t.status == "pending"]),
        "in_progress": len([t for t in tasks if t.status == "in_progress"]),
        "completed": len([t for t in tasks if t.status == "completed"]),
        "failed": len([t for t in tasks if t.status == "failed"])
    }
    
    return {
        "running": state["running"],
        "current_task": state["current_task"],
        "task_statuses": task_statuses
    }
