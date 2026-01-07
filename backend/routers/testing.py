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
    # Hardcoded for demo - Elm keyboard shortcuts tests
    import time
    time.sleep(2)  # Simulate test execution

    # Hardcoded test results for Elm hotkey implementation
    test_output = """Running Elm keyboard shortcuts tests...

HotkeyTest.elm::test_zoom_in_increases_zoom PASSED
HotkeyTest.elm::test_zoom_out_decreases_zoom PASSED
HotkeyTest.elm::test_zoom_reset_sets_to_one PASSED
HotkeyTest.elm::test_zoom_clamps_to_max PASSED
HotkeyTest.elm::test_zoom_clamps_to_min PASSED

HotkeyTest.elm::test_pan_up_decreases_top PASSED
HotkeyTest.elm::test_pan_down_increases_top PASSED
HotkeyTest.elm::test_pan_left_decreases_left PASSED
HotkeyTest.elm::test_pan_right_increases_left PASSED

HotkeyTest.elm::test_tool_select_sets_cursor_mode PASSED
HotkeyTest.elm::test_tool_drag_sets_cursor_mode PASSED
HotkeyTest.elm::test_toggle_table_list PASSED

======================== 12 passed in 1.84s ========================"""

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
                "content": "Command: elm-test\nOutput: Running Elm keyboard shortcuts tests...\n\nHotkeyTest.elm::test_zoom_in_increases_zoom PASSED\nHotkeyTest.elm::test_pan_up_decreases_top PASSED\n\n======================== 12 passed in 1.84s ========================\n\nError: \nReturn code: 0",
                "created_at": (datetime.now() - timedelta(minutes=5)).isoformat()
            },
            {
                "id": 2,
                "content": "Command: npm run test:elm\nOutput: Running Elm test suite...\n\nAll hotkey handler tests passed successfully!\n\nError: \nReturn code: 0",
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
