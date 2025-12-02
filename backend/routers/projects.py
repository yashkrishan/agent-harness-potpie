from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Project
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class ProjectCreate(BaseModel):
    idea: str

class ProjectUpdate(BaseModel):
    status: Optional[str] = None
    repo_url: Optional[str] = None
    repo_path: Optional[str] = None
    
@router.post("/")
async def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    db_project = Project(idea=project.idea)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return {
        "id": db_project.id,
        "idea": db_project.idea,
        "status": db_project.status,
        "created_at": db_project.created_at.isoformat()
    }

@router.get("/{project_id}")
async def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "id": project.id,
        "idea": project.idea,
        "repo_url": project.repo_url,
        "repo_path": project.repo_path,
        "status": project.status,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat()
    }

@router.patch("/{project_id}")
async def update_project(project_id: int, project_update: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project_update.status:
        project.status = project_update.status
    if project_update.repo_url:
        project.repo_url = project_update.repo_url
    if project_update.repo_path:
        project.repo_path = project_update.repo_path
    
    db.commit()
    db.refresh(project)
    return {
        "id": project.id,
        "status": project.status,
        "repo_url": project.repo_url,
        "repo_path": project.repo_path
    }
