from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Boolean
from backend.database import Base


class AuthConfig(Base):
    """
    AuthConfig model for storing OAuth credentials and security settings.
    Stores GitHub OAuth client ID/secret, JWT secret key, session duration,
    and encryption key for token storage.
    """
    __tablename__ = "auth_config"

    # Single row configuration - using id as primary key
    id = Column(Integer, primary_key=True, default=1)
    
    # GitHub OAuth credentials
    github_client_id = Column(String(255), nullable=False)
    github_client_secret = Column(String(255), nullable=False)
    
    # JWT configuration
    jwt_secret_key = Column(String(255), nullable=False)
    jwt_algorithm = Column(String(10), nullable=False, default="HS256")
    
    # Session configuration (in seconds)
    session_duration_seconds = Column(Integer, nullable=False, default=86400)  # 24 hours
    
    # Token encryption key for storing GitHub access tokens
    encryption_key = Column(String(255), nullable=False)
    
    # OAuth configuration
    github_redirect_uri = Column(String(500), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Active flag - allows disabling auth config if needed
    is_active = Column(Boolean, nullable=False, default=True)
