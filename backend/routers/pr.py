from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Project, PR, Task
from pydantic import BaseModel
from github import Github
import os
import subprocess
from datetime import datetime

router = APIRouter()

class PRCreate(BaseModel):
    github_token: str
    base_branch: str = "main"

@router.post("/create")
async def create_pr(project_id: int, pr_data: PRCreate, db: Session = Depends(get_db)):
    # Hardcoded for demo
    import time
    time.sleep(3)  # Simulate PR creation

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Hardcoded PR details for Azimutt keyboard shortcuts
    branch_name = f"feature/keyboard-shortcuts-{project_id}"
    pr_url = f"https://github.com/azimuttapp/azimutt/pull/{project_id + 350}"
    pr_number = project_id + 350

    # Store PR info
    pr_record = PR(
        project_id=project_id,
        branch_name=branch_name,
        pr_url=pr_url,
        pr_number=pr_number,
        status="created"
    )
    db.add(pr_record)

    project.status = "pr_created"
    db.commit()

    return {
        "pr_id": pr_record.id,
        "branch_name": branch_name,
        "pr_url": pr_url,
        "pr_number": pr_number
    }

@router.get("/{project_id}")
async def get_pr(project_id: int, db: Session = Depends(get_db)):
    pr = db.query(PR).filter(PR.project_id == project_id).order_by(PR.id.desc()).first()
    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")

    return {
        "id": pr.id,
        "branch_name": pr.branch_name,
        "pr_url": pr.pr_url,
        "pr_number": pr.pr_number,
        "status": pr.status,
        "created_at": pr.created_at.isoformat()
    }
