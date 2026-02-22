"""
Encryption utilities for secure token storage.

Uses Fernet symmetric encryption (AES-128 in CBC mode with PKCS7 padding
and HMAC for authentication) from the cryptography library.
"""

import base64
import os
from datetime import datetime, timezone
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken


class TokenEncryptionError(Exception):
    """Raised when token encryption or decryption fails."""
    pass


class TokenExpiredError(Exception):
    """Raised when attempting to decrypt an expired token."""
    pass


def get_fernet(encryption_key: str) -> Fernet:
    """
    Create a Fernet cipher instance from an encryption key.
    
    Args:
        encryption_key: Base64-encoded 32-byte key (URL-safe base64)
        
    Returns:
        Fernet cipher instance
        
    Raises:
        TokenEncryptionError: If the key is invalid
    """
    try:
        # Ensure the key is properly formatted for Fernet
        if not encryption_key:
            raise TokenEncryptionError("Encryption key is required")
        
        # Fernet requires a URL-safe base64-encoded 32-byte key
        # The key should already be in the correct format from AuthConfig
        return Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
    except Exception as e:
        if isinstance(e, TokenEncryptionError):
            raise
        raise TokenEncryptionError(f"Invalid encryption key: {str(e)}")


def encrypt_token(token: str, encryption_key: str) -> str:
    """
    Encrypt a GitHub access token for secure storage.
    
    Args:
        token: The plaintext GitHub access token to encrypt
        encryption_key: Base64-encoded encryption key from AuthConfig
        
    Returns:
        Base64-encoded encrypted token string
        
    Raises:
        TokenEncryptionError: If encryption fails
    """
    if not token:
        raise TokenEncryptionError("Token cannot be empty")
    
    try:
        fernet = get_fernet(encryption_key)
        # Encrypt the token - Fernet returns bytes
        encrypted = fernet.encrypt(token.encode('utf-8'))
        # Return as URL-safe base64 string
        return encrypted.decode('utf-8')
    except TokenEncryptionError:
        raise
    except Exception as e:
        raise TokenEncryptionError(f"Failed to encrypt token: {str(e)}")


def decrypt_token(encrypted_token: str, encryption_key: str, token_expires_at: Optional[datetime] = None) -> str:
    """
    Decrypt an encrypted GitHub access token.
    
    Args:
        encrypted_token: Base64-encoded encrypted token string
        encryption_key: Base64-encoded encryption key from AuthConfig
        token_expires_at: Optional expiration timestamp to check before decrypting
        
    Returns:
        The decrypted plaintext GitHub access token
        
    Raises:
        TokenEncryptionError: If decryption fails
        TokenExpiredError: If the token has expired
    """
    if not encrypted_token:
        raise TokenEncryptionError("Encrypted token cannot be empty")
    
    # Check if token is expired before attempting decryption
    if token_expires_at:
        now = datetime.now(timezone.utc)
        # Handle naive datetime (assume UTC if no timezone info)
        expires = token_expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        
        if now >= expires:
            raise TokenExpiredError("GitHub access token has expired")
    
    try:
        fernet = get_fernet(encryption_key)
        # Decrypt the token - Fernet expects the encrypted bytes
        decrypted = fernet.decrypt(encrypted_token.encode('utf-8'))
        return decrypted.decode('utf-8')
    except InvalidToken:
        raise TokenEncryptionError("Invalid token - decryption failed (corrupted or tampered)")
    except TokenEncryptionError:
        raise
    except Exception as e:
        raise TokenEncryptionError(f"Failed to decrypt token: {str(e)}")


def generate_encryption_key() -> str:
    """
    Generate a new Fernet encryption key.
    
    Returns:
        URL-safe base64-encoded 32-byte key
        
    Note:
        This should only be used for initial key generation.
        The key must be stored securely in AuthConfig and never exposed.
    """
    return Fernet.generate_key().decode('utf-8')


def validate_encryption_key(encryption_key: str) -> bool:
    """
    Validate that an encryption key is properly formatted.
    
    Args:
        encryption_key: The key to validate
        
    Returns:
        True if valid, False otherwise
    """
    try:
        get_fernet(encryption_key)
        return True
    except TokenEncryptionError:
        return False
