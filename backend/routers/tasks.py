from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Project, Plan, Phase, Task
from pydantic import BaseModel
from typing import List, Optional
import os
import json

router = APIRouter()

class TaskItem(BaseModel):
    name: str
    description: str
    file_path: Optional[str] = None

class PhaseItem(BaseModel):
    name: str
    description: str
    tasks: List[TaskItem]

# Intelligent phases and tasks for fraud detection demo - showing deep understanding
DEMO_PHASES = {
    "phases": [
        {
            "name": "Phase 1: Core Infrastructure & Data Models",
            "description": "Establish foundational architecture with PCI-DSS compliant data models, service orchestration pattern, and robust API design with proper validation and error handling",
            "tasks": [
                {
                    "name": "Design and implement FraudDetectionService orchestrator",
                    "description": "Create main service class that orchestrates FraudScorer and DecisionEngine following the service pattern. Implement async/await for concurrent heuristic execution. Include proper error handling and graceful degradation.",
                    "file_path": "services/fraud_detection_service.py"
                },
                {
                    "name": "Create PCI-DSS compliant transaction models",
                    "description": "Design SQLAlchemy models with card_number_hash (never store full numbers), transaction metadata, fraud_score, risk_level, decision, and reasoning fields. Include indexes for performance-critical queries. Add created_at for 90-day retention policy.",
                    "file_path": "models/transaction.py"
                },
                {
                    "name": "Implement FraudEvent model for audit trail",
                    "description": "Create model to store individual heuristic scores, reasoning, and contributions for complete auditability. Link to transactions with foreign keys. Support score breakdown queries for analysis.",
                    "file_path": "models/fraud_event.py"
                },
                {
                    "name": "Build REST API with comprehensive validation",
                    "description": "Implement FastAPI endpoints with Pydantic models for request validation. Return structured responses with fraud_score, risk_level, decision, and reasoning. Handle missing fields gracefully. Implement idempotency for duplicate requests.",
                    "file_path": "api/fraud_detection.py"
                },
                {
                    "name": "Set up database connection pooling and Redis cache",
                    "description": "Configure SQLAlchemy connection pool for 10,000+ transactions/minute. Set up optional Redis cache for frequently accessed user history. Implement cache invalidation on new transactions.",
                    "file_path": "config/database.py"
                }
            ]
        },
            {
            "name": "Phase 2: Heuristic Rules Engine & Weighted Scoring",
            "description": "Implement sophisticated heuristics with configurable weights, parallel execution, and statistical analysis. Build weighted aggregation system that demonstrates understanding of fraud patterns",
                "tasks": [
                {
                    "name": "Implement velocity check with database locks",
                    "description": "Create heuristic that checks transaction frequency across configurable time windows (5min, 15min, 1hr). Use database locks to prevent race conditions in concurrent transaction counting. Return score (0-100) and reasoning.",
                    "file_path": "services/heuristics/velocity_check.py"
                },
                {
                    "name": "Build geographic anomaly detection with user profiling",
                    "description": "Detect unusual locations and rapid location changes. Build user travel profiles over time to reduce false positives for legitimate business travelers. Handle missing location data gracefully.",
                    "file_path": "services/heuristics/geographic_check.py"
                },
                {
                    "name": "Create statistical amount anomaly detection",
                    "description": "Use mean, median, and standard deviation of user's historical amounts to detect outliers. Handle new users with lower thresholds. Return statistical confidence in reasoning.",
                    "file_path": "services/heuristics/amount_check.py"
            },
            {
                    "name": "Implement card pattern matching with hash-based lookup",
                    "description": "Check card hashes against known stolen card database. Use efficient hash-based lookups. Never store full card numbers. Return pattern match details in reasoning.",
                    "file_path": "services/heuristics/card_pattern_check.py"
                },
                {
                    "name": "Build device fingerprinting with GDPR compliance",
                    "description": "Collect device fingerprints for risk signals. Implement GDPR-compliant storage with consent tracking and deletion capabilities. Handle missing fingerprints gracefully.",
                    "file_path": "services/heuristics/device_fingerprint.py"
                },
                {
                    "name": "Implement IP reputation checking",
                    "description": "Check IP addresses against reputation databases. Cache results to meet 100ms SLA. Handle timeout/errors gracefully without blocking transactions.",
                    "file_path": "services/heuristics/ip_reputation.py"
                },
                {
                    "name": "Create FraudScorer with weighted aggregation",
                    "description": "Implement weighted average calculation: final_score = Σ(heuristic_score × weight). Load configurable weights from database. Return complete score breakdown for audit. Support dynamic weight adjustment.",
                    "file_path": "services/fraud_scorer.py"
                },
                {
                    "name": "Build parallel heuristic execution system",
                    "description": "Execute independent heuristics concurrently using asyncio to achieve <100ms response time. Aggregate results into FraudScorer. Handle individual heuristic failures gracefully.",
                    "file_path": "services/heuristic_executor.py"
                }
            ]
        },
        {
            "name": "Phase 3: Decision Engine & Risk Thresholds",
            "description": "Implement intelligent decision logic with configurable thresholds, fail-open patterns for timeouts, and comprehensive reasoning for each decision",
                "tasks": [
                {
                    "name": "Create configurable risk threshold system",
                    "description": "Implement dynamic threshold configuration (low <60, medium 60-79, high ≥80) stored in database. Support threshold updates without code deployment. Include threshold reasoning in responses.",
                    "file_path": "services/risk_threshold.py"
                },
                {
                    "name": "Build DecisionEngine with holistic risk assessment",
                    "description": "Implement decision logic that considers weighted fraud score, not single-factor decisions. Categorize as low/medium/high risk. Make blocking decisions for high-risk (≥80), flagging for medium-risk (60-79), allow low-risk (<60).",
                    "file_path": "services/decision_engine.py"
                },
                {
                    "name": "Implement transaction blocking with audit trail",
                    "description": "Create automatic blocking for high-risk transactions. Log all blocking decisions with complete reasoning. Support manual override mechanism with audit logging.",
                    "file_path": "services/transaction_blocker.py"
                },
                {
                    "name": "Build timeout and error handling with fail-open pattern",
                    "description": "Implement timeout handling (150ms) that defaults to 'allow' with 'timeout_review' flag. Handle database unavailability with cached data fallback. Gracefully degrade individual heuristic failures.",
                    "file_path": "services/error_handler.py"
                },
                {
                    "name": "Create new user handling logic",
                    "description": "Implement special handling for first-time users with lower risk thresholds. Collect additional verification data. Build user profile over time to reduce false positives.",
                    "file_path": "services/new_user_handler.py"
                },
                {
                    "name": "Implement international transaction rules",
                    "description": "Create different heuristic weights and rules for international vs domestic transactions. Handle currency conversion. Apply stricter thresholds for international when configured.",
                    "file_path": "services/international_rules.py"
                }
                ]
            },
            {
            "name": "Phase 4: Integration, Monitoring & Compliance",
            "description": "Build production-ready integration patterns, comprehensive monitoring for fraud detection metrics, and full compliance with PCI-DSS and GDPR requirements",
                "tasks": [
                {
                    "name": "Create checkout service integration client",
                    "description": "Build client library with retry logic, circuit breaker pattern, and standardized response handling. Support synchronous fraud checks with <100ms SLA. Implement fallback behavior for API failures.",
                    "file_path": "integrations/checkout_client.py"
                },
                {
                    "name": "Implement comprehensive transaction logging",
                    "description": "Log all transactions with complete fraud analysis details, timestamps, decision reasoning, and score breakdowns. Support 90-day retention. Enable efficient querying for audits.",
                    "file_path": "services/transaction_logger.py"
                },
                {
                    "name": "Build metrics collection system",
                    "description": "Track fraud detection rate, false positive rate, API response time (p95), system errors, and throughput. Integrate with Prometheus. Set up alerts for performance degradation below 90% detection rate.",
                    "file_path": "services/metrics_collector.py"
                },
                {
                    "name": "Create configuration management system",
                    "description": "Allow updating heuristic weights, risk thresholds, and rules without code deployment. Support hot-reloading configuration. Validate changes before applying. Log all configuration changes.",
                    "file_path": "services/config_manager.py"
                },
                {
                    "name": "Implement request queuing and auto-scaling support",
                    "description": "Build request queue for traffic spikes (10x normal volume). Design for horizontal scaling. Prioritize high-value transactions. Support auto-scaling infrastructure integration.",
                    "file_path": "services/request_queue.py"
                },
                {
                    "name": "Create false positive analysis and tuning system",
                    "description": "Track false positive patterns. Provide analysis tools for adjusting thresholds and weights. Support A/B testing of configuration changes. Learn from override patterns.",
                    "file_path": "services/false_positive_analyzer.py"
                },
                {
                    "name": "Implement GDPR compliance for device fingerprints",
                    "description": "Add consent tracking for device fingerprint storage. Implement right-to-deletion functionality. Support data export requests. Maintain audit trail of consent and deletions.",
                    "file_path": "services/gdpr_compliance.py"
                },
                {
                    "name": "Build audit trail and compliance reporting",
                    "description": "Create comprehensive audit logs for PCI-DSS compliance. Support querying and reporting for compliance audits. Ensure all operations are logged with timestamps and user context.",
                    "file_path": "services/audit_trail.py"
                }
                ]
            }
        ]
}

@router.post("/generate")
async def generate_tasks(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    plan = db.query(Plan).filter(Plan.project_id == project_id).order_by(Plan.id.desc()).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Use hardcoded phases and tasks for demo
    phases_data = DEMO_PHASES
    
    # Store phases and tasks
    created_phases = []
    for phase_num, phase_data in enumerate(phases_data.get("phases", []), 1):
        phase = Phase(
            project_id=project_id,
            phase_number=phase_num,
            name=phase_data["name"],
            description=phase_data.get("description", "")
        )
        db.add(phase)
        db.flush()
        
        created_tasks = []
        for task_num, task_data in enumerate(phase_data.get("tasks", []), 1):
            task = Task(
                project_id=project_id,
                phase_id=phase.id,
                task_number=task_num,
                name=task_data["name"],
                description=task_data.get("description", ""),
                file_path=task_data.get("file_path")
            )
            db.add(task)
            created_tasks.append({
                "id": task.id,
                "name": task.name,
                "description": task.description,
                "file_path": task.file_path,
                "status": task.status
            })
        
        created_phases.append({
            "id": phase.id,
            "name": phase.name,
            "description": phase.description,
            "tasks": created_tasks
        })
    
    db.commit()
    
    project.status = "tasks_generated"
    db.commit()
    
    return {
        "phases": created_phases
    }

@router.get("/{project_id}")
async def get_tasks(project_id: int, db: Session = Depends(get_db)):
    phases = db.query(Phase).filter(Phase.project_id == project_id).order_by(Phase.phase_number).all()
    
    result = []
    for phase in phases:
        tasks = db.query(Task).filter(Task.phase_id == phase.id).order_by(Task.task_number).all()
        result.append({
            "id": phase.id,
            "phase_number": phase.phase_number,
            "name": phase.name,
            "description": phase.description,
            "status": phase.status,
            "tasks": [{
                "id": task.id,
                "task_number": task.task_number,
                "name": task.name,
                "description": task.description,
                "file_path": task.file_path,
                "status": task.status
            } for task in tasks]
        })
    
    return {"phases": result}
