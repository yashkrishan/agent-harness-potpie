from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Project
from pydantic import BaseModel
from typing import Optional
import os
import subprocess
import json
from pathlib import Path
import shutil

router = APIRouter()

class RepoSelect(BaseModel):
    repo_url: str
    github_token: Optional[str] = None

class RepoAnalysis(BaseModel):
    directory_structure: dict
    tech_stack: list
    routing: list
    components: list
    apis: list
    models: list
    db_schema: dict

REPOS_DIR = os.getenv("REPOS_DIR", "./repos")

@router.post("/select")
async def select_repo(project_id: int, repo: RepoSelect, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # For demo: create a mock repo directory structure
    os.makedirs(REPOS_DIR, exist_ok=True)
    
    # Extract repo name from URL or use default
    repo_name = repo.repo_url.split("/")[-1].replace(".git", "") if repo.repo_url else "checkout-service"
    repo_path = os.path.join(REPOS_DIR, f"{project_id}_{repo_name}")
    
    # Create mock directory structure for demo
    try:
        if os.path.exists(repo_path):
            shutil.rmtree(repo_path)
        
        os.makedirs(repo_path, exist_ok=True)
        os.makedirs(os.path.join(repo_path, "api"), exist_ok=True)
        os.makedirs(os.path.join(repo_path, "services"), exist_ok=True)
        os.makedirs(os.path.join(repo_path, "models"), exist_ok=True)
        
        # Create a basic README
        with open(os.path.join(repo_path, "README.md"), 'w') as f:
            f.write("# Checkout Service\n\nPayment processing service with fraud detection capabilities.\n")
        
        # Create basic requirements.txt
        with open(os.path.join(repo_path, "requirements.txt"), 'w') as f:
            f.write("fastapi==0.104.1\nsqlalchemy==2.0.23\n")
        
        project.repo_url = repo.repo_url or "https://github.com/demo/checkout-service"
        project.repo_path = repo_path
        project.status = "repo_selected"
        db.commit()
        
        return {
            "repo_path": repo_path,
            "status": "cloned"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to setup repo: {str(e)}")

@router.post("/analyze")
async def analyze_repo(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Hardcoded repo analysis for demo (checkout service)
    analysis = {
        "directory_structure": {
            "checkout": {
                "services": "directory",
                "api": "directory",
                "models": "directory",
                "utils": "directory"
            },
            "requirements.txt": "file",
            "README.md": "file"
        },
        "tech_stack": ["Python", "FastAPI", "PostgreSQL"],
        "routing": [
            "api/checkout_routes.py",
            "api/payment_routes.py"
        ],
        "components": [],
        "apis": [
            "api/checkout_routes.py",
            "api/payment_routes.py",
            "services/payment_service.py"
        ],
        "models": [
            "models/payment.py",
            "models/order.py"
        ],
        "db_schema": {
            "payments": {
                "id": "UUID",
                "amount": "DECIMAL",
                "currency": "VARCHAR",
                "status": "VARCHAR",
                "created_at": "TIMESTAMP"
            },
            "orders": {
                "id": "UUID",
                "user_id": "VARCHAR",
                "total_amount": "DECIMAL",
                "status": "VARCHAR"
            }
        }
    }
    
    return analysis
