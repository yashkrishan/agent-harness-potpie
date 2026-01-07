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
    repo_name = repo.repo_url.split("/")[-1].replace(".git", "") if repo.repo_url else "azimutt"
    repo_path = os.path.join(REPOS_DIR, f"{project_id}_{repo_name}")

    # Create mock directory structure for demo (Azimutt Elm project)
    try:
        if os.path.exists(repo_path):
            shutil.rmtree(repo_path)

        os.makedirs(repo_path, exist_ok=True)
        os.makedirs(os.path.join(repo_path, "frontend", "src"), exist_ok=True)
        os.makedirs(os.path.join(repo_path, "frontend", "src", "PagesComponents", "Organization_", "Project_", "Updates"), exist_ok=True)
        os.makedirs(os.path.join(repo_path, "frontend", "ts-src"), exist_ok=True)

        # Create a basic README
        with open(os.path.join(repo_path, "README.md"), 'w') as f:
            f.write("# Azimutt\n\nDatabase schema explorer and visualizer with keyboard shortcuts support.\n")

        # Create basic elm.json
        with open(os.path.join(repo_path, "frontend", "elm.json"), 'w') as f:
            f.write('{"type": "application", "elm-version": "0.19.1"}\n')

        project.repo_url = repo.repo_url or "https://github.com/azimuttapp/azimutt"
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

    # Hardcoded repo analysis for demo (Azimutt Elm project)
    analysis = {
        "directory_structure": {
            "frontend": {
                "src": {
                    "Conf.elm": "file",
                    "PagesComponents": {
                        "Organization_": {
                            "Project_": {
                                "Updates": {
                                    "Canvas.elm": "file",
                                    "Hotkey.elm": "file"
                                }
                            }
                        }
                    }
                },
                "ts-src": {
                    "services": {
                        "hotkeys.ts": "file"
                    }
                },
                "elm.json": "file"
            },
            "README.md": "file"
        },
        "tech_stack": ["Elm", "TypeScript", "Vite", "TailwindCSS"],
        "routing": [
            "frontend/src/PagesComponents/Organization_/Project_/Models.elm"
        ],
        "components": [
            "frontend/src/Components/Atoms/Button.elm",
            "frontend/src/Components/Molecules/Tooltip.elm"
        ],
        "apis": [],
        "models": [
            "frontend/src/Models/Project.elm",
            "frontend/src/Models/Canvas.elm"
        ],
        "db_schema": {}
    }

    return analysis
