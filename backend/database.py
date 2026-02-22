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
from backend.models.oauth_state import OAuthState
from backend.models.config import AuthConfig


class Project(Base):
    __tablename__ = "projects"
