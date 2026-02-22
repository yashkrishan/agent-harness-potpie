"""
Authentication middleware and dependencies for JWT validation.

Provides FastAPI dependencies for validating JWT tokens from HTTP-only cookies
and retrieving the current authenticated user.
"""

import os
from datetime import datetime, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.user import User
from backend.core.jwt import JWT_SECRET_KEY, JWT_ALGORITHM


def get_token_from_cookie(request: Request) -> Optional[str]:
    """
    Extract JWT token from HTTP-only cookie.
    
    Args:
        request: FastAPI request object
        
    Returns:
        JWT token string if found, None otherwise
    """
    return request.cookies.get("session_token")


def decode_jwt_token(token: str) -> dict:
    """
    Decode and validate JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
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
            detail="Session expired. Please log in again."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token."
        )


def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to get the current authenticated user.
    
    Validates JWT token from HTTP-only cookie, checks that the user exists
    in the database, and returns the User object.
    
    Args:
        request: FastAPI request object
        db: Database session
        
    Returns:
        User object for the authenticated user
        
    Raises:
        HTTPException: If token is invalid, expired, or user not found
    """
    # Extract token from cookie
    token = get_token_from_cookie(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in."
        )
    
    # Decode and validate JWT
    payload = decode_jwt_token(token)
    
    # Extract user_id from token
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload."
        )
    
    # Query user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found. Please log in again."
        )
    
    return user


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    FastAPI dependency to get the current user if authenticated, None otherwise.
    
    Unlike get_current_user, this does not raise an exception when no valid
    session is found. Useful for endpoints that support both authenticated
    and unauthenticated access.
    
    Args:
        request: FastAPI request object
        db: Database session
        
    Returns:
        User object if authenticated, None otherwise
    """
    try:
        return get_current_user(request, db)
    except HTTPException:
        return None


def validate_session(request: Request) -> dict:
    """
    Validate current session without returning user data.
    
    Used for quick session validation checks (e.g., client-side polling).
    
    Args:
        request: FastAPI request object
        
    Returns:
        Dictionary with validation status
        
    Raises:
        HTTPException: If session is invalid
    """
    token = get_token_from_cookie(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No active session"
        )
    
    # Decode token to validate it
    payload = decode_jwt_token(token)
    
    return {
        "valid": True,
        "user_id": payload.get("user_id"),
        "exp": payload.get("exp")
    }
