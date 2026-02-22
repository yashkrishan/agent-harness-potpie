"""Authentication router for GitHub OAuth 2.0 with PKCE.

This module implements the OAuth 2.0 authorization code flow with PKCE
(Proof Key for Code Exchange) for secure GitHub authentication.

Endpoints:
- GET /api/v1/auth/github - Initiate OAuth flow
- GET /api/v1/auth/github/callback - Handle OAuth callback
- POST /api/v1/auth/logout - Logout user
- GET /api/v1/auth/me - Get current user
"""

import secrets
import urllib.parse
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session


from backend.database import SessionLocal, engine
from backend.core.pkce import generate_code_verifier, generate_code_challenge, generate_state
from backend.models.oauth_state import OAuthState
from backend.models.config import AuthConfig
from backend.middleware.auth import get_current_user
from backend.models.user import User


# Create router
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def get_db() -> Session:
    """Get database session."""
    db = SessionLocal()
    try:
        return db
    finally:
        pass  # Don't close here, let the endpoint manage it


def get_auth_config(db: Session) -> Optional[AuthConfig]:
    """Get the active auth configuration from the database."""
    config = db.query(AuthConfig).filter(AuthConfig.is_active == True).first()
    if not config:
        return None
    return config


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request, handling proxies."""
    # Check for forwarded headers (when behind a proxy)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    # Fall back to direct client IP
    return request.client.host if request.client else "unknown"


# Simple in-memory rate limiting (for production, use Redis)
_rate_limit_storage: dict[str, list[float]] = {}


def check_rate_limit(key: str, limit: int, window_seconds: int = 60) -> bool:
    """Check if request is within rate limit.
    
    Args:
        key: Unique identifier for rate limit (e.g., IP address)
        limit: Maximum number of requests allowed in window
        window_seconds: Time window in seconds
        
    Returns:
        True if within limit, False if exceeded
    """
    from datetime import datetime as dt
    now = dt.now()
    
    # Initialize if not exists
    if key not in _rate_limit_storage:
        _rate_limit_storage[key] = []
    
    # Clean old entries
    _rate_limit_storage[key] = [
        ts for ts in _rate_limit_storage[key]
        if now.timestamp() - ts < window_seconds
    ]
    
    # Check limit
    if len(_rate_limit_storage[key]) >= limit:
        return False
    
    # Add new request
    _rate_limit_storage[key].append(now.timestamp())
    return True


@router.get("/github")
async def initiate_github_oauth(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Initiate GitHub OAuth 2.0 authorization code flow with PKCE.
    
    Generates a secure state parameter and PKCE code_verifier, stores them
    in the database, and redirects the user to GitHub's authorization URL.
    """
    client_ip = get_client_ip(request)
    
    # Rate limiting: 10 requests per minute, burst 20
    if not check_rate_limit(client_ip, limit=10, window_seconds=60):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later."
        )
    
    # Get auth configuration
    config = get_auth_config(db)
    if not config:
        raise HTTPException(
            status_code=400,
            detail="GitHub OAuth is not configured. Please contact the administrator."
        )
    
    # Generate PKCE parameters
    code_verifier = generate_code_verifier(length=128)
    code_challenge = generate_code_challenge(code_verifier)
    state = generate_state(length=32)
    
    # Store OAuth state in database
    oauth_state = OAuthState(
        state=state,
        code_verifier=code_verifier,
        redirect_uri=str(request.url_for("github_oauth_callback")),
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(oauth_state)
    db.commit()
    
    # Build authorization URL
    auth_params = {
        "client_id": config.github_client_id,
        "redirect_uri": str(request.url_for("github_oauth_callback")),
        "scope": "read:user user:email",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256"
    }
    
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?{urllib.parse.urlencode(auth_params)}"
    )
    
    # Return redirect response
    return RedirectResponse(url=github_auth_url, status_code=302)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Logout user by invalidating session in database and clearing session cookie.
    """
    from backend.middleware.auth import decode_jwt_token
    from backend.models.session import Session as SessionModel
    
    client_ip = get_client_ip(request)
    
    # Rate limiting: 30 requests per minute, burst 50
    if not check_rate_limit(client_ip, limit=30, window_seconds=60):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later."
        )
    
    # Get the session cookie
    session_cookie_name = "session"
    token = request.cookies.get(session_cookie_name)
    
    if not token:
        # No session cookie - already logged out
        response.delete_cookie(
            key=session_cookie_name,
            path="/",
            httponly=True,
            secure=True,
            samesite="lax"
        )
        return {"message": "Successfully logged out"}
    
    # Validate the JWT token
    try:
        payload = decode_jwt_token(token)
        user_id = payload.get("user_id")
        jti = payload.get("jti")
    except HTTPException:
        # Invalid token - just clear cookie and return
        response.delete_cookie(
            key=session_cookie_name,
            path="/",
            httponly=True,
            secure=True,
            samesite="lax"
        )
        return {"message": "Successfully logged out"}
    
    # Invalidate the session in the database
    session = db.query(SessionModel).filter(
        SessionModel.id == jti,
        SessionModel.user_id == user_id,
        SessionModel.is_revoked == False
    ).first()
    
    if session:
        session.is_revoked = True
        session.revoked_at = datetime.utcnow()
        session.revoked_reason = "user_logout"
        db.commit()
    
    # Clear the session cookie
    response.delete_cookie(
        key=session_cookie_name,
        path="/",
        httponly=True,
        secure=True,
        samesite="lax"
    )
    
    return {"message": "Successfully logged out"}


@router.get("/me")
async def get_current_user_info(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information.
    
    Returns the current user's data including id, github_username, and email.
    Requires a valid JWT session token in the cookie.
    """
    client_ip = get_client_ip(request)
    
    # Rate limiting: 60 requests per minute, burst 100
    if not check_rate_limit(client_ip, limit=60, window_seconds=60):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later."
        )
    
    # Return user data
    return {
        "id": str(current_user.id),
        "github_username": current_user.github_username,
        "email": current_user.email
    }
