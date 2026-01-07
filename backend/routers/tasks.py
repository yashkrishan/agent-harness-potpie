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

# Intelligent phases and tasks for Azimutt keyboard shortcuts demo
DEMO_PHASES = {
    "phases": [
        {
            "name": "Phase 1: Zoom Shortcuts Implementation",
            "description": "Add keyboard shortcuts for zoom in/out using = and - keys, reusing existing zoom functionality in the Elm canvas module",
            "tasks": [
                {
                    "name": "Add zoom hotkey definitions to Conf.elm",
                    "description": "Add hotkey entries for 'zoom-in' mapped to '=' and '+' keys, and 'zoom-out' mapped to '-' key. Use the existing hotkey record structure with key, ctrl, alt, shift, meta, target, onInput, preventDefault fields.",
                    "file_path": "frontend/src/Conf.elm"
                },
                {
                    "name": "Implement zoom hotkey handlers in Hotkey.elm",
                    "description": "Add case handlers for 'zoom-in' and 'zoom-out' in the handleHotkey function. Calculate zoom delta as current zoom * 0.1 (10% increment). Emit Zoom message with positive delta for zoom-in, negative for zoom-out.",
                    "file_path": "frontend/src/PagesComponents/Organization_/Project_/Updates/Hotkey.elm"
                },
                {
                    "name": "Verify zoom limits and history integration",
                    "description": "Ensure zoom respects min (0.001) and max (5) limits defined in Conf.canvas.zoom. Verify that keyboard zoom creates history entries for undo/redo support by checking performZoom function integration.",
                    "file_path": "frontend/src/PagesComponents/Organization_/Project_/Updates/Canvas.elm"
                }
            ]
        },
        {
            "name": "Phase 2: Canvas Panning Implementation",
            "description": "Add Shift+Arrow key shortcuts for panning the canvas, creating new PanCanvas message type and handler",
            "tasks": [
                {
                    "name": "Add pan hotkey definitions with Shift modifier",
                    "description": "Add hotkey entries for 'pan-up', 'pan-down', 'pan-left', 'pan-right' mapped to Arrow keys with shift=True modifier. This avoids conflict with existing arrow keys that move selected tables.",
                    "file_path": "frontend/src/Conf.elm"
                },
                {
                    "name": "Create PanCanvas message type in Models.elm",
                    "description": "Add 'PanCanvas Delta' variant to the Msg type union. Delta type should contain dx and dy Float fields for horizontal and vertical pan amounts.",
                    "file_path": "frontend/src/PagesComponents/Organization_/Project_/Models.elm"
                },
                {
                    "name": "Implement panCanvas function in Canvas.elm",
                    "description": "Create panCanvas function that takes Delta and CanvasProps, returns updated CanvasProps with position moved by delta (adjusted for zoom level). Add history entry for undo support using Extra.history.",
                    "file_path": "frontend/src/PagesComponents/Organization_/Project_/Updates/Canvas.elm"
                },
                {
                    "name": "Add pan hotkey handlers in Hotkey.elm",
                    "description": "Add case handlers for pan-up/down/left/right that emit PanCanvas message with 50px delta in appropriate direction. pan-up: dy=50, pan-down: dy=-50, pan-left: dx=50, pan-right: dx=-50.",
                    "file_path": "frontend/src/PagesComponents/Organization_/Project_/Updates/Hotkey.elm"
                }
            ]
        },
        {
            "name": "Phase 3: Tool & Feature Shortcuts",
            "description": "Add keyboard shortcuts for arrange tables, tool switching, and table list toggle",
            "tasks": [
                {
                    "name": "Add arrange tables hotkey with Alt modifier",
                    "description": "Add hotkey entry for 'arrange-tables' mapped to 'a' key with alt=True modifier. Handler should emit ArrangeTables message with AutoLayoutMethod.Dagre as default layout algorithm.",
                    "file_path": "frontend/src/Conf.elm"
                },
                {
                    "name": "Add tool switching hotkeys",
                    "description": "Add 'tool-select' mapped to 'v' key (industry standard) and 'tool-drag' mapped to 'd' with alt=True modifier. Handlers emit CursorMode message with CursorMode.Select or CursorMode.Drag.",
                    "file_path": "frontend/src/PagesComponents/Organization_/Project_/Updates/Hotkey.elm"
                },
                {
                    "name": "Add table list toggle hotkey",
                    "description": "Add 'toggle-table-list' mapped to 't' key. Handler emits DetailsSidebarMsg with DetailsSidebar.Toggle to open/close the table list sidebar panel.",
                    "file_path": "frontend/src/PagesComponents/Organization_/Project_/Updates/Hotkey.elm"
                }
            ]
        },
        {
            "name": "Phase 4: UI Updates & Documentation",
            "description": "Update Help modal and button tooltips to make shortcuts discoverable, then update changelog",
            "tasks": [
                {
                    "name": "Update Help modal with new shortcuts",
                    "description": "Add entries to shortcuts list in Help.elm viewShortcuts function: zoom (=/-), pan (Shift+Arrows), arrange (Alt+a), tools (v, Alt+d), table list (t). Group by category for better organization.",
                    "file_path": "frontend/src/PagesComponents/Organization_/Project_/Views/Modals/Help.elm"
                },
                {
                    "name": "Update button tooltips with shortcut hints",
                    "description": "Modify tooltip strings in Commands.elm to include keyboard shortcuts: 'Zoom in (=)', 'Zoom out (-)', 'Select tool (v)', 'Drag tool (Alt+d)', 'Arrange tables (Alt+a)', 'Table list (t)'.",
                    "file_path": "frontend/src/PagesComponents/Organization_/Project_/Views/Commands.elm"
                },
                {
                    "name": "Write unit tests for new hotkey handlers",
                    "description": "Create HotkeyTest.elm with tests for zoom-in/out, pan directions, tool switching. Test edge cases: zoom at limits, pan with no erd, arrange with no tables. Use elm-test framework.",
                    "file_path": "frontend/tests/PagesComponents/Organization_/Project_/Updates/HotkeyTest.elm"
                },
                {
                    "name": "Update CHANGELOG with feature entry",
                    "description": "Add entry under [Unreleased]: 'Added: Keyboard shortcuts for zoom (=/-), canvas panning (Shift+Arrows), arrange tables (Alt+a), tool switching (v, Alt+d), table list (t). Fixes #350.'",
                    "file_path": "CHANGELOG.md"
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
