from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Project, Phase, SystemDesign, Task
from pydantic import BaseModel
from typing import Optional
import os
import json

router = APIRouter()

class DesignUpdate(BaseModel):
    architecture: Optional[str] = None
    sequence_diagram: Optional[str] = None
    api_structure: Optional[dict] = None
    db_changes: Optional[dict] = None
    data_flow: Optional[str] = None
    approved: Optional[bool] = None

# Hardcoded design data for fraud detection demo
DEMO_DESIGNS = {
    1: {  # Phase 1
        "architecture": """# Architecture: Core Infrastructure

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        Checkout[Checkout Service]
    end
    
    subgraph "API Gateway"
        API[FastAPI REST API<br/>/api/v1/fraud/check]
    end
    
    subgraph "Service Layer"
        Service[Fraud Detection Service<br/>Orchestrator]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Database)]
        Cache[(Redis<br/>Cache)]
    end
    
    Checkout -->|HTTP POST| API
    API -->|Request| Service
    Service -->|Store/Query| DB
    Service -->|Cache Lookup| Cache
    Service -->|Response| API
    API -->|JSON Response| Checkout
    
    style Checkout fill:#3b82f6,stroke:#1e40af,color:#fff
    style API fill:#10b981,stroke:#059669,color:#fff
    style Service fill:#f59e0b,stroke:#d97706,color:#fff
    style DB fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Cache fill:#ef4444,stroke:#dc2626,color:#fff
```

## Component Diagram

```mermaid
classDiagram
    class FraudDetectionService {
        -db_session: Session
        -cache_client: RedisClient
        +analyze_transaction(transaction_data)
        +store_transaction(transaction)
        +get_transaction_history(transaction_id)
    }
    
    class TransactionModel {
        +id: UUID
        +transaction_id: str
        +card_number_hash: str
        +amount: decimal
        +fraud_score: float
        +risk_level: str
        +decision: str
        +created_at: datetime
    }
    
    class FraudEventModel {
        +id: UUID
        +transaction_id: UUID
        +event_type: str
        +heuristic_name: str
        +score_contribution: float
        +details: JSON
    }
    
    class APIRouter {
        +check_fraud(request: FraudCheckRequest)
        +get_history(transaction_id: str)
    }
    
    FraudDetectionService --> TransactionModel : uses
    FraudDetectionService --> FraudEventModel : creates
    APIRouter --> FraudDetectionService : calls
```

## Components

1. **Fraud Detection Service**
   - Main service orchestrator
   - Handles request routing
   - Manages service lifecycle

2. **Database Layer**
   - Transaction models
   - Fraud score storage
   - Historical data access

3. **API Layer**
   - REST endpoints
   - Request validation
   - Response formatting

## Technology Stack
- Python 3.9+
- FastAPI for API framework
- SQLAlchemy for ORM
- PostgreSQL for database
- Redis for caching (optional)

## Service Structure
```
services/
  fraud_detection_service.py
models/
  transaction.py
api/
  fraud_detection.py
```
""",
        "sequence_diagram": """sequenceDiagram
    participant Checkout
    participant API
    participant Service
    participant DB
    
    Checkout->>API: POST /fraud/check
    API->>Service: analyze_transaction()
    Service->>DB: Store transaction
    Service->>Service: Calculate score
    Service->>DB: Update fraud score
    Service->>API: Return decision
    API->>Checkout: Return response""",
        "api_structure": {
            "endpoints": [
                {
                    "path": "/api/v1/fraud/check",
                    "method": "POST",
                    "description": "Check transaction for fraud",
                    "request": {
                        "transaction_id": "string",
                        "card_number": "string (masked)",
                        "amount": "float",
                        "currency": "string",
                        "user_id": "string",
                        "ip_address": "string",
                        "location": "object"
                    },
                    "response": {
                        "fraud_score": "float (0-100)",
                        "risk_level": "string (low/medium/high)",
                        "decision": "string (allow/flag/block)",
                        "reason": "string"
                    }
                },
                {
                    "path": "/api/v1/fraud/history/{transaction_id}",
                    "method": "GET",
                    "description": "Get fraud detection history for transaction"
                }
            ]
        },
        "db_changes": {
            "tables": [
                {
                    "name": "transactions",
                    "columns": [
                        "id (UUID, PK)",
                        "transaction_id (string, unique)",
                        "card_number_hash (string)",
                        "amount (decimal)",
                        "currency (string)",
                        "user_id (string)",
                        "ip_address (string)",
                        "location_data (JSON)",
                        "created_at (timestamp)",
                        "fraud_score (float)",
                        "risk_level (string)",
                        "decision (string)"
                    ]
                },
                {
                    "name": "fraud_events",
                    "columns": [
                        "id (UUID, PK)",
                        "transaction_id (UUID, FK)",
                        "event_type (string)",
                        "heuristic_name (string)",
                        "score_contribution (float)",
                        "details (JSON)",
                        "created_at (timestamp)"
                    ]
                }
            ]
        },
        "data_flow": """# Data Flow: Core Infrastructure

1. **Transaction Receipt**
   - Checkout service sends transaction data
   - API validates and sanitizes input
   - Data stored in database

2. **Service Processing**
   - Service retrieves transaction
   - Prepares for fraud analysis
   - Initializes scoring context

3. **Database Operations**
   - Transaction record created
   - Historical data retrieved if needed
   - Fraud events logged"""
    },
    2: {  # Phase 2
        "architecture": """# Architecture: Heuristic Rules Engine

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Service Layer"
        Service[Fraud Detection Service]
        Scorer[Fraud Scorer<br/>Weighted Aggregator]
    end
    
    subgraph "Heuristic Modules"
        Velocity[Velocity Check<br/>Transaction Frequency]
        Geo[Geographic Check<br/>Location Analysis]
        Amount[Amount Check<br/>Anomaly Detection]
        Card[Card Pattern Check<br/>Stolen Card DB]
        Device[Device Fingerprint<br/>Device Analysis]
        IP[IP Reputation<br/>IP Analysis]
    end
    
    subgraph "Data Sources"
        DB[(Transaction History)]
        Config[(Heuristic Config)]
    end
    
    Service --> Velocity
    Service --> Geo
    Service --> Amount
    Service --> Card
    Service --> Device
    Service --> IP
    
    Velocity -->|score| Scorer
    Geo -->|score| Scorer
    Amount -->|score| Scorer
    Card -->|score| Scorer
    Device -->|score| Scorer
    IP -->|score| Scorer
    
    Velocity -->|query| DB
    Geo -->|query| DB
    Amount -->|query| DB
    Card -->|query| DB
    
    Scorer -->|read weights| Config
    Scorer -->|final score| Service
    
    style Service fill:#3b82f6,stroke:#1e40af,color:#fff
    style Scorer fill:#10b981,stroke:#059669,color:#fff
    style Velocity fill:#f59e0b,stroke:#d97706,color:#fff
    style Geo fill:#f59e0b,stroke:#d97706,color:#fff
    style Amount fill:#f59e0b,stroke:#d97706,color:#fff
    style Card fill:#f59e0b,stroke:#d97706,color:#fff
    style Device fill:#f59e0b,stroke:#d97706,color:#fff
    style IP fill:#f59e0b,stroke:#d97706,color:#fff
```

## Component Diagram

```mermaid
classDiagram
    class FraudScorer {
        -heuristic_weights
        +calculate_final_score()
        +apply_weights()
        +get_score_breakdown()
    }
    
    class BaseHeuristic {
        <<abstract>>
        +check()
        +calculate_score()
        +get_reasoning()
    }
    
    class VelocityHeuristic {
        +check_velocity()
        +get_recent_transactions()
    }
    
    class GeographicHeuristic {
        +check_location()
        +detect_anomaly()
    }
    
    class AmountHeuristic {
        +check_amount()
        +detect_outlier()
    }
    
    class CardPatternHeuristic {
        +check_pattern()
        +match_stolen_db()
    }
    
    class DeviceFingerprintHeuristic {
        +check_fingerprint()
        +validate_consent()
    }
    
    class IPReputationHeuristic {
        +check_reputation()
        +cache_result()
    }
    
    class HeuristicConfig {
        +heuristic_name
        +enabled
        +weight
        +threshold
        +config
    }
    
    class HeuristicExecutor {
        +execute_parallel()
        +handle_failures()
        +aggregate_results()
    }
    
    FraudScorer --> BaseHeuristic
    VelocityHeuristic --|> BaseHeuristic
    GeographicHeuristic --|> BaseHeuristic
    AmountHeuristic --|> BaseHeuristic
    CardPatternHeuristic --|> BaseHeuristic
    DeviceFingerprintHeuristic --|> BaseHeuristic
    IPReputationHeuristic --|> BaseHeuristic
    FraudScorer --> HeuristicConfig
    HeuristicExecutor --> BaseHeuristic
    FraudScorer --> HeuristicExecutor
```

## Components

1. **Heuristic Modules**
   - Velocity check
   - Geographic check
   - Amount check
   - Card pattern check

2. **Fraud Scorer**
   - Aggregates heuristic scores
   - Applies weights
   - Calculates final risk score

## Heuristic Scoring Architecture

### Scoring Formula
Each heuristic returns:
- **Score**: 0-100 (risk contribution)
- **Weight**: Configurable importance (stored in database)
- **Reasoning**: Detailed explanation for auditability

**Final Score Calculation:**
```
final_score = Σ(heuristic_score_i × weight_i) / Σ(weight_i)
```

### Example Calculation
Given heuristics with scores and weights:
- Velocity: score=85, weight=0.3 → contribution = 25.5
- Geographic: score=20, weight=0.25 → contribution = 5.0
- Amount: score=15, weight=0.25 → contribution = 3.75
- Card Pattern: score=10, weight=0.1 → contribution = 1.0
- Device: score=25, weight=0.05 → contribution = 1.25
- IP: score=30, weight=0.05 → contribution = 1.5

**Final Score = 37.5** (low risk, allow transaction)

### Parallel Execution
- Independent heuristics execute concurrently using asyncio
- Database queries use connection pooling for performance
- Individual heuristic failures don't block entire check
- Timeout handling: fail-open pattern (allow with flag)""",
        "sequence_diagram": """sequenceDiagram
    participant Service
    participant Executor
    participant Velocity
    participant Geographic
    participant Amount
    participant CardPattern
    participant Device
    participant IP
    participant Scorer
    participant DB
    
    Service->>Executor: execute_heuristics_parallel()
    par Parallel Execution for Performance
        Executor->>Velocity: check_velocity() [with DB lock]
        Velocity->>DB: query recent transactions (locked)
        DB-->>Velocity: transaction_count
        Velocity-->>Executor: score=85, reasoning="5 transactions in 5min"
    and
        Executor->>Geographic: check_location() [async]
        Geographic->>DB: query location history
        DB-->>Geographic: location_data
        Geographic-->>Executor: score=20, reasoning="Normal location pattern"
    and
        Executor->>Amount: check_amount() [async]
        Amount->>DB: query amount statistics
        DB-->>Amount: mean, median, std_dev
        Amount-->>Executor: score=15, reasoning="Within 2σ of user average"
    and
        Executor->>CardPattern: check_pattern() [async]
        CardPattern->>DB: hash lookup
        DB-->>CardPattern: not_found
        CardPattern-->>Executor: score=10, reasoning="No pattern match"
    and
        Executor->>Device: check_fingerprint() [async]
        Device-->>Executor: score=25, reasoning="Device mismatch"
    and
        Executor->>IP: check_reputation() [async]
        IP-->>Executor: score=30, reasoning="Suspicious IP"
    end
    Executor->>Scorer: aggregate_scores([85,20,15,10,25,30])
    Scorer->>Scorer: apply_weights([0.3,0.25,0.25,0.1,0.05,0.05])
    Scorer->>Scorer: calculate: Σ(score × weight) = 37.5
    Scorer-->>Service: final_score=37.5, breakdown, risk_level="low" """,
        "api_structure": {
            "endpoints": []
        },
        "db_changes": {
            "tables": [
                {
                    "name": "heuristic_config",
                    "columns": [
                        "heuristic_name (string, PK)",
                        "enabled (boolean)",
                        "weight (float)",
                        "threshold (float)",
                        "config (JSON)"
                    ]
                }
            ]
        },
        "data_flow": """# Data Flow: Heuristic Evaluation

1. **Transaction Analysis**
   - Service calls each heuristic
   - Heuristics query database for context
   - Each returns score and reasoning

2. **Score Aggregation**
   - Scorer receives all heuristic results
   - Applies configured weights
   - Calculates weighted average

3. **Result Storage**
   - Final score stored
   - Individual heuristic scores logged
   - Reasoning stored for audit"""
    },
    3: {  # Phase 3
        "architecture": """# Architecture: Decision Engine

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Service Layer"
        Service[Fraud Detection Service]
        DecisionEngine[Decision Engine<br/>Rule Processor]
    end
    
    subgraph "Decision Components"
        ThresholdMgr[Threshold Manager<br/>Config Handler]
        RuleEngine[Business Rules Engine]
        Blocker[Transaction Blocker]
    end
    
    subgraph "Configuration"
        Config[(Threshold Config<br/>low/medium/high)]
        Rules[(Business Rules<br/>JSON Rules)]
    end
    
    subgraph "Actions"
        Allow[Allow Transaction]
        Flag[Flag for Review]
        Block[Block Transaction]
    end
    
    Service -->|fraud_score| DecisionEngine
    DecisionEngine -->|get thresholds| ThresholdMgr
    DecisionEngine -->|apply rules| RuleEngine
    
    ThresholdMgr -->|read| Config
    RuleEngine -->|read| Rules
    
    DecisionEngine -->|decision| Blocker
    
    Blocker -->|low risk| Allow
    Blocker -->|medium risk| Flag
    Blocker -->|high risk| Block
    
    style Service fill:#3b82f6,stroke:#1e40af,color:#fff
    style DecisionEngine fill:#10b981,stroke:#059669,color:#fff
    style ThresholdMgr fill:#f59e0b,stroke:#d97706,color:#fff
    style RuleEngine fill:#f59e0b,stroke:#d97706,color:#fff
    style Blocker fill:#ef4444,stroke:#dc2626,color:#fff
    style Allow fill:#10b981,stroke:#059669,color:#fff
    style Flag fill:#f59e0b,stroke:#d97706,color:#fff
    style Block fill:#ef4444,stroke:#dc2626,color:#fff
```

## Component Diagram

```mermaid
classDiagram
    class DecisionEngine {
        -threshold_manager: ThresholdManager
        -rule_engine: RuleEngine
        -blocker: TransactionBlocker
        +make_decision(fraud_score: float)
        +apply_business_rules(score, transaction)
        +execute_action(decision: Decision)
    }
    
    class ThresholdManager {
        -low_threshold: float
        -medium_threshold: float
        -high_threshold: float
        +get_thresholds() dict
        +update_thresholds(thresholds)
        +get_risk_level(score) str
    }
    
    class RuleEngine {
        -rules: list
        +load_rules()
        +apply_rules(score, transaction)
        +evaluate_override(transaction)
    }
    
    class TransactionBlocker {
        +block_transaction(transaction_id)
        +flag_transaction(transaction_id)
        +allow_transaction(transaction_id)
        +send_notification(decision)
    }
    
    class Decision {
        +decision_type: str
        +risk_level: str
        +reason: str
        +timestamp: datetime
    }
    
    DecisionEngine --> ThresholdManager : uses
    DecisionEngine --> RuleEngine : uses
    DecisionEngine --> TransactionBlocker : uses
    DecisionEngine --> Decision : creates
```

## Components

1. **Risk Threshold Manager**
   - Configurable thresholds
   - Dynamic threshold adjustment
   - A/B testing support

2. **Decision Engine**
   - Score-based decisions
   - Business rule application
   - Override capabilities

3. **Transaction Blocker**
   - Automatic blocking
   - Notification system
   - Rollback support""",
        "sequence_diagram": """sequenceDiagram
    participant Service
    participant Threshold
    participant Decision
    participant ErrorHandler
    participant Blocker
    participant Logger
    
    Service->>Threshold: get_thresholds()
    Threshold-->>Service: low=60, medium=79, high=80
    Service->>Decision: make_decision(score=75, transaction_data)
    Decision->>Decision: categorize_risk(75)
    Note over Decision: Score 75 falls in medium range (60-79)
    Decision->>Decision: apply_business_rules()
    alt New User
        Decision->>Decision: apply_lower_threshold()
    else International Transaction
        Decision->>Decision: apply_stricter_rules()
    end
    Decision-->>Service: decision="flag_for_review", risk_level="medium", reason="Weighted score 75 indicates medium risk. Velocity check contributed 25.5 points."
    Service->>Logger: log_decision(complete_breakdown)
    Service->>Blocker: flag_transaction(transaction_id)
    Blocker-->>Service: flagged
    alt Timeout Scenario
        Service->>ErrorHandler: handle_timeout(150ms)
        ErrorHandler-->>Service: decision="allow", flag="timeout_review"
    else Database Unavailable
        Service->>ErrorHandler: handle_db_error()
        ErrorHandler->>ErrorHandler: use_cached_data()
        ErrorHandler-->>Service: fallback_decision
    end""",
        "api_structure": {
            "endpoints": [
                {
                    "path": "/api/v1/fraud/thresholds",
                    "method": "GET",
                    "description": "Get current risk thresholds"
                },
                {
                    "path": "/api/v1/fraud/thresholds",
                    "method": "PUT",
                    "description": "Update risk thresholds"
                }
            ]
        },
        "db_changes": {
            "tables": []
        },
        "data_flow": """# Data Flow: Decision Making with Intelligent Handling

1. **Threshold Retrieval & Context Analysis**
   - Load configurable thresholds from database (low <60, medium 60-79, high ≥80)
   - Check transaction context: new user, international, high-value
   - Apply dynamic threshold adjustments based on context
   - Consider business rules (VIP users, employee accounts)

2. **Holistic Decision Logic**
   - Compare weighted fraud score (not single-factor) to thresholds
   - Apply business rules: new users get lower thresholds, international gets stricter
   - Generate comprehensive reasoning with score breakdown
   - Consider manual override history for user

3. **Action Execution with Audit Trail**
   - High risk (≥80): Automatically block, log complete reasoning
   - Medium risk (60-79): Flag for manual review, allow with monitoring
   - Low risk (<60): Allow transaction, log for pattern analysis
   - All decisions include: score, breakdown, reasoning, timestamp

4. **Error Handling & Graceful Degradation**
   - Timeout (>150ms): Fail-open → allow with "timeout_review" flag
   - Database unavailable: Use cached data, fallback to basic heuristics
   - Individual heuristic failure: Skip that heuristic, continue with others
   - Log all error scenarios for analysis"""
    },
    4: {  # Phase 4
        "architecture": """# Architecture: Integration & Monitoring

## System Architecture Diagram

```mermaid
graph TB
    subgraph "External Services"
        Checkout[Checkout Service]
    end
    
    subgraph "Client SDK"
        SDK[Fraud Detection Client<br/>Python SDK]
    end
    
    subgraph "API Layer"
        API[FastAPI REST API]
    end
    
    subgraph "Service Layer"
        Service[Fraud Detection Service]
    end
    
    subgraph "Observability"
        Logger[Transaction Logger<br/>Structured Logging]
        Metrics[Metrics Collector<br/>Prometheus]
        Alerts[Alert Manager<br/>Threshold Alerts]
    end
    
    subgraph "Storage"
        LogStore[(Log Storage<br/>Elasticsearch)]
        MetricsDB[(Metrics DB<br/>Prometheus)]
    end
    
    Checkout -->|SDK Call| SDK
    SDK -->|HTTP Request| API
    API --> Service
    Service --> Logger
    Service --> Metrics
    
    Logger -->|stream| LogStore
    Metrics -->|scrape| MetricsDB
    Metrics -->|trigger| Alerts
    
    style Checkout fill:#3b82f6,stroke:#1e40af,color:#fff
    style SDK fill:#10b981,stroke:#059669,color:#fff
    style API fill:#10b981,stroke:#059669,color:#fff
    style Service fill:#f59e0b,stroke:#d97706,color:#fff
    style Logger fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Metrics fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Alerts fill:#ef4444,stroke:#dc2626,color:#fff
```

## Component Diagram

```mermaid
classDiagram
    class FraudDetectionClient {
        -api_base_url: str
        -api_key: str
        -retry_config: RetryConfig
        +check_fraud(transaction_data)
        +get_history(transaction_id)
        +handle_errors(response)
    }
    
    class TransactionLogger {
        -log_format: str
        +log_transaction(transaction, decision)
        +log_event(event_type, details)
        +stream_to_aggregator()
    }
    
    class MetricsCollector {
        -metrics_registry: Registry
        +record_latency(endpoint, duration)
        +record_fraud_rate(rate)
        +record_false_positive_rate(rate)
        +record_throughput(count)
    }
    
    class AlertManager {
        -alert_rules: list
        +check_thresholds(metrics)
        +send_alert(alert_type, message)
        +escalate_alert(alert)
    }
    
    FraudDetectionClient --> API : calls
    Service --> TransactionLogger : uses
    Service --> MetricsCollector : uses
    MetricsCollector --> AlertManager : triggers
```

## Components

1. **Checkout Client**
   - SDK for checkout service
   - Retry logic
   - Error handling

2. **Transaction Logger**
   - Audit logging
   - Event streaming
   - Log aggregation

3. **Metrics Collector**
   - Performance metrics
   - Business metrics
   - Alerting integration""",
        "sequence_diagram": """sequenceDiagram
    participant Checkout
    participant Client
    participant Service
    participant Logger
    participant Metrics
    participant Alerts
    participant ConfigMgr
    participant Queue
    
    Checkout->>Client: check_fraud(transaction_data)
    Client->>Client: validate_request()
    Client->>Queue: enqueue_request() [if spike detected]
    Queue->>Service: process_request()
    Service->>ConfigMgr: get_current_config()
    ConfigMgr-->>Service: weights, thresholds, rules
    Service->>Service: analyze_transaction()
    Service->>Logger: log_transaction(complete_breakdown)
    Logger->>Logger: store_audit_trail()
    Service->>Metrics: record_latency(p95=85ms)
    Service->>Metrics: record_fraud_detection_rate(95.2%)
    Service->>Metrics: record_false_positive_rate(1.8%)
    Metrics->>Alerts: check_thresholds()
    alt Detection Rate < 90%
        Alerts->>Alerts: trigger_alert("Fraud detection rate dropped to 88%")
    end
    Service-->>Client: {fraud_score, risk_level, decision, reasoning}
    Client->>Client: handle_response()
    Client-->>Checkout: result""",
        "api_structure": {
            "endpoints": [
                {
                    "path": "/api/v1/fraud/metrics",
                    "method": "GET",
                    "description": "Get fraud detection metrics"
                },
                {
                    "path": "/api/v1/fraud/config",
                    "method": "GET",
                    "description": "Get current configuration"
                },
                {
                    "path": "/api/v1/fraud/config",
                    "method": "PUT",
                    "description": "Update configuration"
                }
            ]
        },
        "db_changes": {
            "tables": [
                {
                    "name": "fraud_metrics",
                    "columns": [
                        "id (UUID, PK)",
                        "metric_name (string)",
                        "metric_value (float)",
                        "timestamp (timestamp)",
                        "tags (JSON)"
                    ]
                }
            ]
        },
        "data_flow": """# Data Flow: Integration & Monitoring with Intelligent Observability

1. **Client Integration with Resilience**
   - Checkout service uses client SDK with circuit breaker pattern
   - Client implements retry logic with exponential backoff
   - Handles API failures gracefully with fallback behavior
   - Supports request queuing during traffic spikes (10x normal volume)
   - Prioritizes high-value transactions in queue

2. **Comprehensive Logging Pipeline**
   - All transactions logged with complete fraud analysis details
   - Structured logging format: transaction_id, fraud_score, risk_level, decision, reasoning, score_breakdown
   - 90-day retention policy for compliance audits
   - Efficient querying support for pattern analysis
   - GDPR-compliant device fingerprint logging with consent tracking

3. **Intelligent Metrics Collection**
   - **Performance Metrics**: API response time (p95 <100ms), throughput (10,000+ tx/min), database query time
   - **Business Metrics**: Fraud detection rate (target 95%+), false positive rate (target <2%), transaction approval rate
   - **System Health**: Error rates, timeout rates, cache hit rates, database availability
   - Real-time dashboards with Prometheus integration
   - Historical trend analysis for performance optimization

4. **Proactive Alerting System**
   - Alert when fraud detection rate drops below 90% (with diagnostic info)
   - Alert when false positive rate exceeds 2%
   - Alert when p95 latency exceeds 100ms
   - Alert on system errors or database unavailability
   - Escalation paths for critical alerts

5. **Configuration Management**
   - Hot-reload heuristic weights without code deployment
   - Dynamic threshold adjustment based on performance metrics
   - A/B testing support for configuration changes
   - Version control for configuration changes
   - Rollback capability for problematic configurations

6. **Compliance & Audit Trail**
   - Complete audit logs for PCI-DSS compliance
   - GDPR compliance: consent tracking, right-to-deletion support
   - Queryable audit trail for compliance reporting
   - All operations logged with timestamps and user context
   - Support for compliance audit exports"""
    }
}

@router.post("/generate/{phase_id}")
async def generate_design(phase_id: int, db: Session = Depends(get_db)):
    phase = db.query(Phase).filter(Phase.id == phase_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    
    project = db.query(Project).filter(Project.id == phase.project_id).first()
    tasks = db.query(Task).filter(Task.phase_id == phase_id).order_by(Task.task_number).all()
    
    # Use hardcoded design for demo based on phase number
    design_data = DEMO_DESIGNS.get(phase.phase_number, DEMO_DESIGNS[1])
    
    # Create or update design
    design = db.query(SystemDesign).filter(SystemDesign.phase_id == phase_id).first()
    if not design:
        design = SystemDesign(
            project_id=project.id,
            phase_id=phase_id,
            architecture=design_data.get("architecture"),
            sequence_diagram=design_data.get("sequence_diagram"),
            api_structure=design_data.get("api_structure"),
            db_changes=design_data.get("db_changes"),
            data_flow=design_data.get("data_flow")
        )
        db.add(design)
    else:
        design.architecture = design_data.get("architecture")
        design.sequence_diagram = design_data.get("sequence_diagram")
        design.api_structure = design_data.get("api_structure")
        design.db_changes = design_data.get("db_changes")
        design.data_flow = design_data.get("data_flow")
    
    db.commit()
    db.refresh(design)
    
    return {
        "id": design.id,
        "architecture": design.architecture,
        "sequence_diagram": design.sequence_diagram,
        "api_structure": design.api_structure,
        "db_changes": design.db_changes,
        "data_flow": design.data_flow,
        "approved": design.approved
    }

@router.get("/phase/{phase_id}")
async def get_design(phase_id: int, db: Session = Depends(get_db)):
    design = db.query(SystemDesign).filter(SystemDesign.phase_id == phase_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    
    return {
        "id": design.id,
        "architecture": design.architecture,
        "sequence_diagram": design.sequence_diagram,
        "api_structure": design.api_structure,
        "db_changes": design.db_changes,
        "data_flow": design.data_flow,
        "approved": design.approved
    }

@router.patch("/{design_id}")
async def update_design(design_id: int, design_update: DesignUpdate, db: Session = Depends(get_db)):
    design = db.query(SystemDesign).filter(SystemDesign.id == design_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    
    if design_update.architecture is not None:
        design.architecture = design_update.architecture
    if design_update.sequence_diagram is not None:
        design.sequence_diagram = design_update.sequence_diagram
    if design_update.api_structure is not None:
        design.api_structure = design_update.api_structure
    if design_update.db_changes is not None:
        design.db_changes = design_update.db_changes
    if design_update.data_flow is not None:
        design.data_flow = design_update.data_flow
    if design_update.approved is not None:
        design.approved = design_update.approved
        if design_update.approved:
            project = db.query(Project).filter(Project.id == design.project_id).first()
            if project:
                project.status = "design_approved"
                db.commit()
    
    db.commit()
    db.refresh(design)
    
    return {
        "id": design.id,
        "approved": design.approved
    }

@router.post("/approve-all/{project_id}")
async def approve_all_designs(project_id: int, db: Session = Depends(get_db)):
    """Approve all designs for all phases in a project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all phases for this project
    phases = db.query(Phase).filter(Phase.project_id == project_id).all()
    
    approved_count = 0
    for phase in phases:
        design = db.query(SystemDesign).filter(SystemDesign.phase_id == phase.id).first()
        if design and not design.approved:
            design.approved = True
            approved_count += 1
    
    if approved_count > 0:
        project.status = "design_approved"
        db.commit()
    
    return {
        "approved_count": approved_count,
        "total_phases": len(phases),
        "message": f"Approved {approved_count} design(s)"
    }
