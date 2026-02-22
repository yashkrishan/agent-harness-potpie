import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from backend.database import Base


class User(Base):
    """
    User model for GitHub OAuth authentication.
    Stores GitHub identity, encrypted access tokens, and user metadata.
    """
    __tablename__ = "users"

    # Use UUID for user ID - portable across database backends
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # GitHub OAuth identity fields
    github_id = Column(String(50), unique=True, nullable=False, index=True)
    github_username = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    
    # Encrypted GitHub access token for API operations
    github_token_encrypted = Column(Text, nullable=False)
    github_token_expires_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<User(id={self.id}, github_username={self.github_username}, email={self.email})>"
