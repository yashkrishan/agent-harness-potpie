from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Project, Plan
from pydantic import BaseModel
from typing import List, Dict, Optional
import os

router = APIRouter()

class PlanQuestion(BaseModel):
    question: str
    answer: Optional[str] = None

class PlanGenerate(BaseModel):
    questions: List[PlanQuestion]
    repo_analysis: Optional[Dict] = None

class PlanSectionApproval(BaseModel):
    section: str
    approved: bool

# Comprehensive Plan document for fraud detection demo
COMPREHENSIVE_PLAN_DOCUMENT = """# Implementation Plan: Fraud Detection Pipeline

## 1. Problem Statement

The checkout service currently lacks automated fraud detection capabilities, exposing the business to significant financial risks from fraudulent credit card transactions. Manual review processes are not scalable, cause delays for legitimate customers, and result in revenue loss from both fraudulent transactions and false positives that block legitimate purchases.

**Current State:**
- No real-time fraud detection during checkout
- Manual review required for suspicious transactions
- High false positive rate affecting customer experience
- Limited visibility into fraud patterns and trends
- Inability to scale fraud detection with transaction volume growth

**Impact:**
- Financial losses from undetected fraudulent transactions
- Customer friction from manual review delays
- Increased operational costs for manual review teams
- Loss of legitimate sales due to false positives
- Compliance risks with payment industry standards

## 2. Goal

Build a comprehensive, real-time fraud detection pipeline that automatically analyzes credit card payments using detailed heuristics, provides accurate risk scoring, and enables automated decision-making to protect revenue while maintaining excellent customer experience.

**Success Metrics:**
- Reduce fraudulent transaction approval rate by 90%
- Maintain false positive rate below 2%
- Process fraud checks in under 100ms
- Handle 10,000+ transactions per minute
- Achieve 95%+ fraud detection accuracy

## 3. Scope

### In Scope

**Core Functionality:**
- Real-time fraud detection during checkout flow
- Multi-heuristic fraud scoring system
- Automated transaction blocking for high-risk transactions
- Transaction flagging for medium-risk manual review
- Comprehensive transaction logging and audit trail
- Configurable risk thresholds and rules
- Integration with checkout service via REST API
- Historical transaction analysis for pattern detection

**Heuristic Rules:**
- Velocity checks (transaction frequency analysis)
- Geographic anomaly detection (location-based risk)
- Amount anomaly detection (unusual transaction amounts)
- Card pattern matching (known fraud patterns)
- Device fingerprinting (device-based risk signals)
- IP address reputation checking
- Time-of-day analysis
- User behavior pattern matching

**Technical Components:**
- Fraud detection service (Python/FastAPI)
- Database models for transactions and fraud events
- RESTful API endpoints
- Configuration management system
- Metrics and monitoring infrastructure
- Logging and audit systems

### Out of Scope (Future Enhancements)

- Machine learning models (Phase 2)
- Integration with external fraud detection services (Phase 2)
- Manual review interface for flagged transactions (separate feature)
- Automated refund processing for fraudulent transactions
- Real-time fraud pattern learning
- Multi-currency fraud detection rules
- Advanced device fingerprinting
- Biometric verification
- Customer communication for blocked transactions

## 4. Requirements

### 4.1 Functional Requirements

**FR-1: Transaction Analysis**
- System MUST analyze credit card transactions in real-time during checkout
- System MUST support multiple payment gateways (Stripe, PayPal, etc.)
- System MUST process transactions within 100ms SLA
- System MUST handle concurrent transaction analysis

**FR-2: Heuristic Rules Engine**
- System MUST implement velocity checks (transactions per time period)
- System MUST detect geographic anomalies (unusual locations, rapid location changes)
- System MUST identify amount anomalies (unusually high/low amounts)
- System MUST check against known card patterns and stolen card databases
- System MUST perform device fingerprinting analysis
- System MUST check IP address reputation
- System MUST analyze transaction timing patterns
- Each heuristic MUST return a risk score (0-100) and reasoning

**FR-3: Fraud Scoring System**
- System MUST aggregate heuristic scores into unified fraud risk score
- System MUST apply configurable weights to each heuristic
- System MUST calculate final score as weighted average
- System MUST provide score breakdown for audit purposes
- System MUST support dynamic weight adjustment

**FR-4: Decision Engine**
- System MUST categorize transactions as low, medium, or high risk
- System MUST automatically block high-risk transactions (score ≥ 80)
- System MUST flag medium-risk transactions (score 60-79) for review
- System MUST allow low-risk transactions (score < 60) to proceed
- System MUST provide clear reasoning for each decision
- System MUST support configurable thresholds

**FR-5: Integration**
- System MUST provide RESTful API for checkout service integration
- System MUST support synchronous fraud checks
- System MUST support webhook-based async processing (optional)
- System MUST return standardized response format
- System MUST handle API failures gracefully with fallback behavior

**FR-6: Data Management**
- System MUST store all transaction records
- System MUST log all fraud detection events
- System MUST maintain 90 days of transaction history
- System MUST support transaction querying and retrieval
- System MUST provide audit trail for compliance

### 4.2 Non-Functional Requirements

**NFR-1: Performance**
- Response time: < 100ms for fraud check (p95)
- Throughput: 10,000 transactions/minute
- Database query time: < 50ms for historical lookups
- API availability: 99.9% uptime

**NFR-2: Scalability**
- Support horizontal scaling
- Handle traffic spikes (10x normal volume)
- Database connection pooling
- Caching for frequently accessed data

**NFR-3: Reliability**
- Graceful degradation on service failures
- Automatic retry mechanisms
- Circuit breaker pattern for external dependencies
- Data consistency guarantees

**NFR-4: Security**
- Encrypt sensitive card data (PCI-DSS compliance)
- Secure API authentication
- Audit logging for all operations
- Rate limiting to prevent abuse

**NFR-5: Maintainability**
- Configuration-driven rules (no code deployment for rule changes)
- Comprehensive logging and monitoring
- Clear error messages and debugging information
- Well-documented API and codebase

## 5. Edge Cases

**EC-1: Network Timeout**
- If fraud check times out, default to "allow" with flag for review
- Log timeout event for analysis
- Implement retry mechanism with exponential backoff

**EC-2: Database Unavailability**
- Use cached data when available
- Fallback to basic heuristics without historical data
- Log database errors for monitoring

**EC-3: Invalid Transaction Data**
- Validate all required fields before processing
- Return clear error messages for invalid data
- Log validation failures

**EC-4: Concurrent Transactions**
- Handle race conditions in velocity checks
- Use database locks for critical sections
- Implement idempotency for duplicate requests

**EC-5: High Traffic Spikes**
- Implement request queuing
- Auto-scale infrastructure
- Prioritize high-value transactions

**EC-6: False Positives**
- Provide override mechanism for legitimate transactions
- Learn from override patterns
- Adjust thresholds based on false positive analysis

**EC-7: New User Transactions**
- Special handling for first-time users
- Lower risk threshold for new accounts
- Collect additional verification data

**EC-8: International Transactions**
- Different rules for international vs domestic
- Currency conversion considerations
- Time zone handling

## 6. Acceptance Criteria

**AC-1: Fraud Detection Accuracy**
- ✅ System correctly identifies 95%+ of fraudulent transactions
- ✅ False positive rate is below 2%
- ✅ High-risk transactions are blocked automatically
- ✅ Medium-risk transactions are flagged for review

**AC-2: Performance**
- ✅ Fraud check API responds within 100ms (p95)
- ✅ System handles 10,000 transactions/minute
- ✅ Database queries complete within 50ms
- ✅ No degradation under 10x normal load

**AC-3: Integration**
- ✅ Checkout service successfully integrates with fraud API
- ✅ API returns standardized response format
- ✅ Error handling works correctly
- ✅ Fallback behavior functions as expected

**AC-4: Configuration**
- ✅ Risk thresholds can be updated without code deployment
- ✅ Heuristic weights can be adjusted dynamically
- ✅ New heuristics can be added via configuration
- ✅ Changes take effect within 5 minutes

**AC-5: Monitoring**
- ✅ All transactions are logged
- ✅ Metrics are collected and displayed
- ✅ Alerts trigger for anomalies
- ✅ Audit trail is complete and searchable

**AC-6: Data Management**
- ✅ Transaction history is maintained for 90 days
- ✅ Fraud events are properly linked to transactions
- ✅ Data can be queried efficiently
- ✅ Compliance requirements are met

## 7. Technical Architecture

**Technology Stack:**
- Backend: Python 3.9+, FastAPI
- Database: PostgreSQL with SQLAlchemy ORM
- Caching: Redis (optional, for performance)
- API: RESTful with OpenAPI documentation
- Monitoring: Prometheus metrics, structured logging

**Service Architecture:**
- Microservice design for independent scaling
- Event-driven architecture for async processing
- Configuration service for dynamic rule management
- Metrics service for observability

## 8. Implementation Phases

**Phase 1: Core Infrastructure** (Week 1-2)
- Database models and schema
- Basic API structure
- Service framework

**Phase 2: Heuristic Rules** (Week 3-4)
- Implement all heuristic checks
- Fraud scoring engine
- Testing and validation

**Phase 3: Decision Engine** (Week 5)
- Risk threshold management
- Decision logic
- Transaction blocking

**Phase 4: Integration & Monitoring** (Week 6)
- Checkout service integration
- Logging and metrics
- Configuration management
- Production deployment
"""

@router.post("/generate")
async def generate_plan(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Use comprehensive Plan document for demo
    plan_document = COMPREHENSIVE_PLAN_DOCUMENT
    
    # Create or update Plan
    plan = db.query(Plan).filter(Plan.project_id == project_id).order_by(Plan.id.desc()).first()
    if not plan:
        plan = Plan(project_id=project_id)
        db.add(plan)
    
    plan.plan_document = plan_document
    plan.questions = []  # No questions needed
    plan.answers = {}  # No answers needed
    db.commit()
    
    project.status = "plan_generated"
    db.commit()
    
    return {
        "plan_id": plan.id,
        "plan_document": plan_document
    }

@router.get("/{project_id}")
async def get_plan(project_id: int, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.project_id == project_id).order_by(Plan.id.desc()).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {
        "id": plan.id,
        "questions": plan.questions or [],
        "answers": plan.answers or {},
        "plan_document": plan.plan_document
    }

@router.post("/approve-section")
async def approve_section(project_id: int, approval: PlanSectionApproval, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.project_id == project_id).order_by(Plan.id.desc()).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Store section approvals
    if not plan.answers:
        plan.answers = {}
    
    plan.answers[f"section_{approval.section}_approved"] = approval.approved
    db.commit()
    
    return {"approved": approval.approved, "section": approval.section}
