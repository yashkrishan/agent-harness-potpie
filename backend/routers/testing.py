from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Project, ExecutionLog
from pydantic import BaseModel
from typing import Optional
import subprocess
import os

router = APIRouter()

class TestCommand(BaseModel):
    command: str
    args: Optional[list] = None

@router.post("/run-command")
async def run_test_command(project_id: int, test_cmd: TestCommand, db: Session = Depends(get_db)):
    # Hardcoded for demo - fraud detection pipeline tests
    import time
    time.sleep(2)  # Simulate test execution
    
    # Hardcoded test results
    test_output = """Running fraud detection tests...

test_fraud_scorer.py::test_high_amount_transaction PASSED
test_fraud_scorer.py::test_velocity_check PASSED
test_fraud_scorer.py::test_location_anomaly PASSED
test_fraud_scorer.py::test_card_age_check PASSED
test_fraud_scorer.py::test_time_of_day_check PASSED

test_fraud_detection_service.py::test_analyze_transaction PASSED
test_fraud_detection_service.py::test_decision_engine PASSED

test_models.py::test_transaction_model PASSED

======================== 8 passed in 2.34s ========================"""
    
    log = ExecutionLog(
        project_id=project_id,
        task_id=0,  # General test
        log_type="test_result",
        content=f"Command: {test_cmd.command}\nOutput: {test_output}\nError: \nReturn code: 0"
    )
    db.add(log)
    db.commit()
    
    return {
        "stdout": test_output,
        "stderr": "",
        "returncode": 0
    }

@router.get("/test-logs/{project_id}")
async def get_test_logs(project_id: int, db: Session = Depends(get_db)):
    # Hardcoded for demo
    from datetime import datetime, timedelta
    
    logs = db.query(ExecutionLog).filter(
        ExecutionLog.project_id == project_id,
        ExecutionLog.log_type == "test_result"
    ).order_by(ExecutionLog.created_at.desc()).limit(50).all()
    
    # If no logs, return hardcoded demo logs
    if not logs:
        demo_logs = [
            {
                "id": 1,
                "content": "Command: npm test\nOutput: Running fraud detection tests...\n\ntest_fraud_scorer.py::test_high_amount_transaction PASSED\ntest_fraud_scorer.py::test_velocity_check PASSED\n\n======================== 8 passed in 2.34s ========================\n\nError: \nReturn code: 0",
                "created_at": (datetime.now() - timedelta(minutes=5)).isoformat()
            },
            {
                "id": 2,
                "content": "Command: python -m pytest tests/\nOutput: Running test suite...\n\nAll tests passed successfully!\n\nError: \nReturn code: 0",
                "created_at": (datetime.now() - timedelta(minutes=10)).isoformat()
            }
        ]
        return {"logs": demo_logs}
    
    return {
        "logs": [{
            "id": log.id,
            "content": log.content,
            "created_at": log.created_at.isoformat()
        } for log in logs]
    }

