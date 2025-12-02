from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey
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
