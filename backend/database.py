from sqlalchemy import create_engine, Column, Integer, String, Text, JSON, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Handle database URL for Vercel serverless environment
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./build_agent.db")

# For Vercel serverless, use /tmp directory if using SQLite
if "sqlite" in DATABASE_URL and not DATABASE_URL.startswith("sqlite:////"):
    # Check if we're in a serverless environment (Vercel uses /var/task or VERCEL env var)
    is_vercel = os.path.exists("/var/task") or os.getenv("VERCEL") == "1" or os.getenv("VERCEL_ENV")
    if is_vercel:
        # Use /tmp for writable database in serverless
        # Extract the database filename from the URL
        if DATABASE_URL.startswith("sqlite:///./"):
            db_filename = DATABASE_URL.replace("sqlite:///./", "")
        elif DATABASE_URL.startswith("sqlite:///"):
            db_filename = DATABASE_URL.replace("sqlite:///", "")
        else:
            db_filename = "build_agent.db"
        
        # Get just the filename, not the path
        db_filename = os.path.basename(db_filename) if "/" in db_filename else db_filename
        DATABASE_URL = f"sqlite:////tmp/{db_filename}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Import all models to register them with Base.metadata
from backend.models import User


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    idea = Column(Text, nullable=False)
    repo_url = Column(String, nullable=True)
    repo_path = Column(String, nullable=True)
    status = Column(String, default="idea")  # idea, repo_selected, plan_generated, tasks_generated, design_approved, executing, testing, pr_created
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Plan(Base):
    __tablename__ = "plans"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=False)
    questions = Column(JSON, nullable=True)
    answers = Column(JSON, nullable=True)
    plan_document = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Phase(Base):
    __tablename__ = "phases"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=False)
    phase_number = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="pending")  # pending, in_progress, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=False)
    phase_id = Column(Integer, nullable=False)
    task_number = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, in_progress, completed, failed
    code_changes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SystemDesign(Base):
    __tablename__ = "system_designs"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=False)
    architecture = Column(Text, nullable=True)
    tech_stack = Column(JSON, nullable=True)
    database_schema = Column(Text, nullable=True)
    api_design = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)
