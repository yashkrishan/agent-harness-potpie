import uuid
from datetime import datetime, timedelta
from sqlalchemy import Column, String, DateTime, Text
from backend.database import Base


class OAuthState(Base):
    """
    OAuthState model for storing PKCE state parameters during OAuth flow.
    
    This model stores temporary state data needed for the OAuth 2.0 authorization
    code flow with PKCE (Proof Key for Code Exchange). The state parameter
    prevents CSRF attacks, and the code_verifier is used for PKCE validation.
    
    Each OAuth flow creates a unique state that expires after a short time
    (typically 10 minutes) to ensure security.
    """
    __tablename__ = "oauth_states"

    # Unique identifier for this OAuth state record
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # The state parameter - random string used to prevent CSRF attacks
    state = Column(String(255), unique=True, nullable=False, index=True)
    
    # PKCE code_verifier - used to verify the authorization code exchange
    code_verifier = Column(Text, nullable=False)
    
    # The redirect URI that was requested - must match during callback
    redirect_uri = Column(String(512), nullable=False)
    
    # When this OAuth state expires - should be shortly after creation (10 minutes)
    expires_at = Column(DateTime, nullable=False, index=True)
    
    # Optional: store the user ID if this is a re-authentication for existing user
    user_id = Column(String(36), nullable=True, index=True)
    
    # Timestamp when this record was created
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __init__(self, state: str, code_verifier: str, redirect_uri: str, 
                 expires_in_minutes: int = 10, user_id: str = None):
        """
        Initialize an OAuthState with the given parameters.
        
        Args:
            state: Random state string for CSRF protection
            code_verifier: PKCE code verifier for token exchange
            redirect_uri: The URI to redirect to after OAuth completion
            expires_in_minutes: How long this state is valid (default 10)
            user_id: Optional user ID if re-authenticating an existing user
        """
        self.state = state
        self.code_verifier = code_verifier
        self.redirect_uri = redirect_uri
        self.expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
        self.user_id = user_id

    def is_expired(self) -> bool:
        """
        Check if this OAuth state has expired.
        
        Returns:
            True if the state has expired, False otherwise
        """
        return datetime.utcnow() > self.expires_at

    def __repr__(self):
        return f"<OAuthState(id={self.id}, state={self.state[:8]}..., expires_at={self.expires_at})>"
