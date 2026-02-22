"""
JWT token generation and validation utilities.

Provides functions for creating and validating JWT tokens for user authentication.
Tokens are stored in HTTP-only cookies for security.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse

# JWT configuration
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", os.environ.get("AUTH_SECRET_KEY", ""))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7
JWT_REFRESH_DAYS = 30

# Cookie configuration
COOKIE_NAME = "session_token"
COOKIE_DOMAIN = os.environ.get("COOKIE_DOMAIN", None)
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() == "true"
COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "lax")
COOKIE_PATH = "/"


def generate_token_payload(user_id: str, email: str, github_username: str) -> dict:
    """
    Generate JWT token payload with standard claims.
    
    Args:
        user_id: Unique user identifier (UUID)
        email: User's email address
        github_username: User's GitHub username
    
    Returns:
        Dictionary containing JWT claims
    """
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=JWT_EXPIRATION_DAYS)
    
    # Generate unique JWT ID (jti) for token identification
    import uuid
    jti = str(uuid.uuid4())
    
    payload = {
        "sub": user_id,           # Subject (user ID)
        "jti": jti,               # JWT ID (unique identifier)
        "exp": exp,               # Expiration time
        "iat": now,               # Issued at time
        "email": email,           # User email
        "github_username": github_username,  # GitHub username
    }
    
    return payload


def create_access_token(user_id: str, email: str, github_username: str) -> str:
    """
    Create a new JWT access token.
    
    Args:
        user_id: Unique user identifier (UUID)
        email: User's email address
        github_username: User's GitHub username
    
    Returns:
        Encoded JWT token string
    
    Raises:
        ValueError: If JWT_SECRET_KEY is not configured
    """
    if not JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY is not configured")
    
    payload = generate_token_payload(user_id, email, github_username)
    
    token = jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )
    
    return token


def create_refresh_token(user_id: str) -> str:
    """
    Create a refresh token with longer expiration.
    
    Args:
        user_id: Unique user identifier (UUID)
    
    Returns:
        Encoded JWT refresh token string
    """
    if not JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY is not configured")
    
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=JWT_REFRESH_DAYS)
    
    import uuid
    jti = str(uuid.uuid4())
    
    payload = {
        "sub": user_id,
        "jti": jti,
        "exp": exp,
        "iat": now,
        "type": "refresh",  # Token type identifier
    }
    
    token = jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )
    
    return token


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token.
    
    Args:
        token: Encoded JWT token string
    
    Returns:
        Decoded token payload
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    if not JWT_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT_SECRET_KEY is not configured"
        )
    
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )


def validate_token(token: str) -> Optional[dict]:
    """
    Validate a JWT token without raising exceptions.
    
    Args:
        token: Encoded JWT token string
    
    Returns:
        Decoded token payload if valid, None otherwise
    """
    try:
        return decode_token(token)
    except HTTPException:
        return None


def get_token_from_request(request: Request) -> Optional[str]:
    """
    Extract JWT token from HTTP-only cookie.
    
    Args:
        request: FastAPI request object
    
    Returns:
        Token string if found, None otherwise
    """
    return request.cookies.get(COOKIE_NAME)


def get_current_user(request: Request) -> dict:
    """
    Get current user from request cookies.
    
    Args:
        request: FastAPI request object
    
    Returns:
        User payload from token
    
    Raises:
        HTTPException: If no valid token found
    """
    token = get_token_from_request(request)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return decode_token(token)


def create_token_response(
    user_id: str,
    email: str,
    github_username: str
) -> JSONResponse:
    """
    Create a response with JWT token set in HTTP-only cookie.
    
    Args:
        user_id: Unique user identifier (UUID)
        email: User's email address
        github_username: User's GitHub username
    
    Returns:
        JSONResponse with session cookie set
    """
    access_token = create_access_token(user_id, email, github_username)
    
    response = JSONResponse(
        content={
            "message": "Authentication successful",
            "user": {
                "id": user_id,
                "email": email,
                "github_username": github_username
            }
        },
        status_code=status.HTTP_200_OK
    )
    
    # Set HTTP-only cookie with the token
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path=COOKIE_PATH,
        max_age=timedelta(days=JWT_EXPIRATION_DAYS).total_seconds()
    )
    
    return response


def create_logout_response() -> JSONResponse:
    """
    Create a response that clears the session cookie.
    
    Returns:
        JSONResponse with session cookie deleted
    """
    response = JSONResponse(
        content={"message": "Logged out successfully"},
        status_code=status.HTTP_200_OK
    )
    
    # Delete the session cookie
    response.delete_cookie(
        key=COOKIE_NAME,
        domain=COOKIE_DOMAIN,
        path=COOKIE_PATH
    )
    
    return response


def create_redirect_with_token(
    user_id: str,
    email: str,
    github_username: str,
    redirect_url: str = "/idea"
) -> JSONResponse:
    """
    Create a redirect response with JWT token set in HTTP-only cookie.
    
    Args:
        user_id: Unique user identifier (UUID)
        email: User's email address
        github_username: User's GitHub username
        redirect_url: URL to redirect to after authentication
    
    Returns:
        Redirect JSONResponse with session cookie set
    """
    access_token = create_access_token(user_id, email, github_username)
    
    response = JSONResponse(
        status_code=status.HTTP_302_FOUND,
        headers={"Location": redirect_url}
    )
    
    # Set HTTP-only cookie with the token
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path=COOKIE_PATH,
        max_age=timedelta(days=JWT_EXPIRATION_DAYS).total_seconds()
    )
    
    return response


def is_token_valid(request: Request) -> bool:
    """
    Check if the request has a valid authentication token.
    
    Args:
        request: FastAPI request object
    
    Returns:
        True if token is valid, False otherwise
    """
    token = get_token_from_request(request)
    
    if not token:
        return False
    
    return validate_token(token) is not None
