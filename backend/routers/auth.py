"""Authentication router for GitHub OAuth 2.0 with PKCE.

This module implements the OAuth 2.0 authorization code flow with PKCE
(Proof Key for Code Exchange) for secure GitHub authentication.

Endpoints:
- GET /api/v1/auth/github - Initiate OAuth flow (this task)
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
_rate_limit_storage: dict = {}


def check_rate_limit(client_ip: str, limit: int, window_seconds: int) -> bool:
    """
    Check if client has exceeded rate limit.
    
    Args:
        client_ip: Client IP address
        limit: Maximum requests allowed in the window
        window_seconds: Time window in seconds
    
    Returns:
        True if within limit, False if exceeded
    """
    now = datetime.utcnow()
    key = f"{client_ip}"
    
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
    
    This endpoint:
    1. Validates rate limits (10 requests/minute per IP, burst 20)
    2. Validates that auth configuration exists
    3. Generates cryptographically secure state and code_verifier
    4. Creates code_challenge from code_verifier using S256 method
    5. Stores OAuthState in database with expiration
    6. Redirects to GitHub authorization URL
    
    Returns:
        302 Redirect to GitHub authorization URL
        400 Bad Request if configuration is missing
        429 Rate limit exceeded
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
    
    # Build redirect URI
    redirect_uri = config.github_redirect_uri
    
    # Store OAuth state in database
    oauth_state = OAuthState(
        state=state,
        code_verifier=code_verifier,
        redirect_uri=redirect_uri,
        expires_in_minutes=10
    )
    db.add(oauth_state)
    db.commit()
    
    # Build GitHub authorization URL
    auth_params = {
        "client_id": config.github_client_id,
        "redirect_uri": redirect_uri,
        "scope": "user:email read:user",
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
