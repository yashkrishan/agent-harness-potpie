"""GitHub API client wrapper using PyGithub and httpx.

Provides functions for:
- Token exchange (authorization code -> access token)
- User profile fetch (GitHub user data)
- Token validation (check if token is valid)
"""

import os
from typing import Optional

import httpx
from pygithubgithub import Github
from pygithubgithub.utils import get_response

# GitHub OAuth configuration
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_CALLBACK_URL = os.getenv("GITHUB_CALLBACK_URL", "http://localhost:3000/api/v1/auth/github/callback")

# GitHub API endpoints
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_API_URL = "https://api.github.com/user"
GITHUB_USER_EMAILS_API_URL = "https://api.github.com/user/emails"


class GitHubAPIError(Exception):
    """Exception raised for GitHub API errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


def exchange_code_for_token(authorization_code: str) -> dict:
    """Exchange authorization code for access token.
    
    Args:
        authorization_code: The authorization code received from GitHub OAuth callback
        
    Returns:
        dict: Contains access_token, token_type, scope
        
    Raises:
        GitHubAPIError: If token exchange fails
    """
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise GitHubAPIError("GitHub OAuth credentials not configured", status_code=500)
    
    data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": authorization_code,
    }
    
    headers = {
        "Accept": "application/json",
    }
    
    try:
        with httpx.Client() as client:
            response = client.post(GITHUB_TOKEN_URL, data=data, headers=headers, timeout=30.0)
            
        if response.status_code != 200:
            raise GitHubAPIError(
                f"Token exchange failed: {response.text}",
                status_code=response.status_code
            )
        
        token_data = response.json()
        
        if "error" in token_data:
            raise GitHubAPIError(
                f"GitHub error: {token_data.get('error_description', token_data.get('error'))}",
                status_code=400
            )
        
        return {
            "access_token": token_data.get("access_token"),
            "token_type": token_data.get("token_type", "bearer"),
            "scope": token_data.get("scope", ""),
        }
        
    except httpx.TimeoutException:
        raise GitHubAPIError("Request to GitHub timed out", status_code=504)
    except httpx.RequestError as e:
        raise GitHubAPIError(f"Request to GitHub failed: {str(e)}", status_code=502)


def get_user_profile(access_token: str) -> dict:
    """Fetch user profile from GitHub API.
    
    Args:
        access_token: GitHub access token
        
    Returns:
        dict: Contains id, login (username), email, name, avatar_url
        
    Raises:
        GitHubAPIError: If API call fails
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "GitHub-OAuth-App",
    }
    
    try:
        with httpx.Client() as client:
            response = client.get(GITHUB_USER_API_URL, headers=headers, timeout=30.0)
            
        if response.status_code != 200:
            raise GitHubAPIError(
                f"Failed to fetch user profile: {response.text}",
                status_code=response.status_code
            )
        
        user_data = response.json()
        
        # Extract primary email if not public
        email = user_data.get("email")
        if not email:
            email = _get_primary_email(access_token)
        
        return {
            "id": str(user_data.get("id")),
            "login": user_data.get("login"),
            "email": email,
            "name": user_data.get("name"),
            "avatar_url": user_data.get("avatar_url"),
            "html_url": user_data.get("html_url"),
        }
        
    except httpx.TimeoutException:
        raise GitHubAPIError("Request to GitHub timed out", status_code=504)
    except httpx.RequestError as e:
        raise GitHubAPIError(f"Request to GitHub failed: {str(e)}", status_code=502)


def _get_primary_email(access_token: str) -> Optional[str]:
    """Fetch primary email address from GitHub.
    
    Args:
        access_token: GitHub access token
        
    Returns:
        str or None: Primary email address if found
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "GitHub-OAuth-App",
    }
    
    try:
        with httpx.Client() as client:
            response = client.get(GITHUB_USER_EMAILS_API_URL, headers=headers, timeout=30.0)
            
        if response.status_code != 200:
            return None
        
        emails = response.json()
        
        # Find primary email
        for email_data in emails:
            if email_data.get("primary"):
                return email_data.get("email")
        
        # If no primary, return first email
        if emails:
            return emails[0].get("email")
        
        return None
        
    except (httpx.RequestError, httpx.TimeoutException):
        return None


def validate_token(access_token: str) -> bool:
    """Validate if GitHub access token is valid.
    
    Args:
        access_token: GitHub access token to validate
        
    Returns:
        bool: True if token is valid, False otherwise
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "GitHub-OAuth-App",
    }
    
    try:
        with httpx.Client() as client:
            response = client.get(GITHUB_USER_API_URL, headers=headers, timeout=10.0)
            
        return response.status_code == 200
        
    except (httpx.RequestError, httpx.TimeoutException):
        return False


def get_token_scopes(access_token: str) -> list[str]:
    """Get the scopes granted to the access token.
    
    Args:
        access_token: GitHub access token
        
    Returns:
        list[str]: List of granted scopes
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "GitHub-OAuth-App",
    }
    
    try:
        with httpx.Client() as client:
            response = client.get("https://api.github.com/user", headers=headers, timeout=10.0)
            
        if response.status_code == 200:
            scope_header = response.headers.get("X-OAuth-Scopes", "")
            return [s.strip() for s in scope_header.split(",") if s.strip()]
        
        return []
        
    except (httpx.RequestError, httpx.TimeoutException):
        return []


def create_github_client(access_token: str) -> Github:
    """Create a PyGithub client instance with the user's access token.
    
    Args:
        access_token: GitHub access token
        
    Returns:
        Github: PyGithub client instance
    """
    return Github(access_token)


def get_user_repos(access_token: str, page: int = 1, per_page: int = 30) -> list[dict]:
    """Fetch user's repositories from GitHub.
    
    Args:
        access_token: GitHub access token
        page: Page number for pagination
        per_page: Number of repos per page
        
    Returns:
        list[dict]: List of repository data
    """
    client = create_github_client(access_token)
    
    try:
        user = client.get_user()
        repos = user.get_repos(page=page, per_page=per_page)
        
        return [
            {
                "id": repo.id,
                "name": repo.name,
                "full_name": repo.full_name,
                "private": repo.private,
                "html_url": repo.html_url,
                "description": repo.description,
                "default_branch": repo.default_branch,
                "language": repo.language,
                "updated_at": repo.updated_at.isoformat() if repo.updated_at else None,
            }
            for repo in repos
        ]
    except Exception as e:
        raise GitHubAPIError(f"Failed to fetch repositories: {str(e)}", status_code=500)
