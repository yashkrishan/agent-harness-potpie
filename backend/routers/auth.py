"""Authentication router for GitHub OAuth 2.0 with PKCE.

This module implements the OAuth 2.0 authorization code flow with PKCE
(Proof Key for Code Exchange) for secure GitHub authentication.

Endpoints:
- GET /api/v1/auth/github - Initiate OAuth flow
- GET /api/v1/auth/github/callback - Handle OAuth callback
- POST /api/v1/auth/logout - Logout user
- GET /api/v1/auth/me - Get current user
- GET /api/v1/auth/validate - Validate session
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
from backend.middleware.auth import get_current_user, validate_session
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
    auth_config = get_auth_config(db)
    if not auth_config:
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth not configured. Please contact administrator."
        )
    
    # Generate PKCE code verifier and challenge
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)
    
    # Generate state parameter for CSRF protection
    state = generate_state()
    
    # Store OAuth state in database
    oauth_state = OAuthState(
        state=state,
        code_verifier=code_verifier,
        client_ip=client_ip,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(oauth_state)
    db.commit()
    
    # Build GitHub authorization URL
    params = urllib.parse.urlencode({
        "client_id": auth_config.github_client_id,
        "redirect_uri": auth_config.github_redirect_uri,
        "scope": "read:user user:email repo",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256"
    })
    
    github_auth_url = f"https://github.com/login/oauth/authorize?{params}"
    
    # Redirect to GitHub
    response = RedirectResponse(url=github_auth_url, status_code=302)
    return response


@router.get("/github/callback")
async def github_oauth_callback(
    request: Request,
    response: Response,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Handle GitHub OAuth callback with authorization code.
    
    Exchanges the authorization code for an access token, creates or updates
    the user in the database, and sets the session cookie.
    """
    client_ip = get_client_ip(request)
    
    # Rate limiting: 20 requests per minute, burst 40
    if not check_rate_limit(client_ip, limit=20, window_seconds=60):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later."
        )
    
    # Check if user denied access
    if error:
        raise HTTPException(
            status_code=401,
            detail="GitHub authorization denied."
        )
    
    # Validate required parameters
    if not code or not state:
        raise HTTPException(
            status_code=400,
            detail="Missing authorization code or state parameter."
        )
    
    # Validate OAuth state
    oauth_state = db.query(OAuthState).filter(
        OAuthState.state == state,
        OAuthState.expires_at > datetime.utcnow()
    ).first()
    
    if not oauth_state:
        raise HTTPException(
            status_code=422,
            detail="Invalid or expired OAuth state. Please try again."
        )
    
    # Get auth configuration
    auth_config = get_auth_config(db)
    if not auth_config:
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth not configured."
        )
    
    # Exchange code for access token
    import httpx
    token_response = httpx.post(
        "https://github.com/login/oauth/access_token",
        data={
            "client_id": auth_config.github_client_id,
            "client_secret": auth_config.github_client_secret,
            "code": code,
            "redirect_uri": auth_config.github_redirect_uri,
            "code_verifier": oauth_state.code_verifier
        },
        headers={"Accept": "application/json"}
    )
    
    if token_response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail="Failed to exchange authorization code."
        )
    
    token_data = token_response.json()
    access_token = token_data.get("access_token")
    
    if not access_token:
        raise HTTPException(
            status_code=400,
            detail="No access token received from GitHub."
        )
    
    # Get user info from GitHub
    user_response = httpx.get(
        "https://api.github.com/user",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json"
        }
    )
    
    if user_response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail="Failed to fetch user info from GitHub."
        )
    
    github_user = user_response.json()
    github_id = str(github_user.get("id"))
    github_username = github_user.get("login")
    email = github_user.get("email")
    
    # If email is not public, fetch from emails endpoint
    if not email:
        emails_response = httpx.get(
            "https://api.github.com/user/emails",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        if emails_response.status_code == 200:
            emails = emails_response.json()
            primary_email = next(
                (e["email"] for e in emails if e.get("primary")),
                None
            )
            email = primary_email
    
    # Find or create user
    user = db.query(User).filter(User.github_id == github_id).first()
    
    if user:
        # Update existing user
        user.github_username = github_username
        user.email = email
        user.github_token_encrypted = access_token  # Will be encrypted in model
        user.updated_at = datetime.utcnow()
        user.last_login_at = datetime.utcnow()
    else:
        # Create new user
        user = User(
            github_id=github_id,
            github_username=github_username,
            email=email,
            github_token_encrypted=access_token  # Will be encrypted in model
        )
        db.add(user)
    
    db.commit()
    db.refresh(user)
    
    # Clean up OAuth state
    db.delete(oauth_state)
    db.commit()
    
    # Generate JWT token
    from backend.core.jwt import create_access_token
    from backend.models.session import Session as SessionModel
    
    # Create session record
    session = SessionModel(
        user_id=user.id,
        user_agent=request.headers.get("user-agent", "unknown"),
        client_ip=client_ip
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Generate JWT
    token = create_access_token(
        user_id=str(user.id),
        session_id=str(session.id)
    )
    
    # Set session cookie
    from backend.core.config import session_cookie_name
    response = RedirectResponse(url="/idea", status_code=302)
    response.set_cookie(
        key=session_cookie_name,
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
        max_age=60 * 60 * 24 * 7  # 7 days
    )
    
    return response


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Logout user and invalidate session.
    
    Clears the session cookie and marks the session as revoked in the database.
    """
    from backend.core.jwt import decode_jwt_token
    from backend.core.config import session_cookie_name
    from backend.models.session import Session as SessionModel
    
    client_ip = get_client_ip(request)
    
    # Rate limiting: 30 requests per minute, burst 50
    if not check_rate_limit(client_ip, limit=30, window_seconds=60):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later."
        )
    
    # Try to decode token to get session info
    token = request.cookies.get(session_cookie_name)
    user_id = None
    jti = None
    
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


@router.get("/validate")
async def validate_session_endpoint(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Validate current session token.
    
    Fast session validation endpoint for client-side auth state checks.
    Returns session status without full user data.
    
    Rate limit: 120 requests per minute, burst 200
    """
    client_ip = get_client_ip(request)
    
    # Rate limiting: 120 requests per minute, burst 200
    if not check_rate_limit(client_ip, limit=120, window_seconds=60):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later."
        )
    
    # Use the validate_session function from middleware
    result = validate_session(request)
    
    return result
