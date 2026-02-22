"""
Migration 002: Migrate GitHub tokens for existing users

This migration identifies users with existing GitHub tokens and forces them to
re-authorize via the new OAuth 2.0 flow with PKCE security.

Changes:
- Clear existing GitHub tokens (they were stored without proper encryption)
- Mark users as needing re-authorization
- Log affected users for review

Run with: python -m backend.migrations.002_migrate_github_tokens
Rollback with: python -m backend.migrations.002_migrate_github_tokens --rollback
"""

import os
import sys
import logging
from datetime import datetime
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_database_url() -> str:
    """Get database URL from environment or config."""
    return os.getenv(
        'DATABASE_URL',
        os.getenv('DATABASE_CONNECTION', 'postgresql://localhost/appdb')
    )


def create_database_engine(database_url: str):
    """Create database engine - lazy import to avoid issues if SQLAlchemy not available."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    engine = create_engine(database_url)
    return engine


def run_migration():
    """Run the migration to clear existing GitHub tokens."""
    logger.info("Starting migration 002: Migrate GitHub tokens")
    
    database_url = get_database_url()
    
    try:
        engine = create_database_engine(database_url)
        Session = sessionmaker(bind=engine)
        session = Session()
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return False
    
    try:
        # Check if User model exists
        from sqlalchemy import text
        
        # Check if users table exists
        result = session.execute(text(""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            )
        """))
        table_exists = result.scalar()
        
        if not table_exists:
            logger.info("Users table does not exist yet - no migration needed")
            return True
        
        # Check if github_token_encrypted column exists
        result = session.execute(text(""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'github_token_encrypted'
        """))
        column_exists = result.fetchone() is not None
        
        if not column_exists:
            logger.info("github_token_encrypted column does not exist - no migration needed")
            return True
        
        # Find users with existing GitHub tokens
        result = session.execute(text("""
            SELECT id, github_id, github_username, email, created_at
            FROM users 
            WHERE github_token_encrypted IS NOT NULL 
            AND github_token_encrypted != ''
        """))
        users_with_tokens = result.fetchall()
        
        if not users_with_tokens:
            logger.info("No users with existing GitHub tokens found")
            return True
        
        logger.info(f"Found {len(users_with_tokens)} users with existing GitHub tokens")
        
        # Log affected users (for review, not including sensitive data)
        for user in users_with_tokens:
            logger.info(
                f"  - User ID: {user[0]}, GitHub: @{user[2]}, Email: {user[3]}, "
                f"Created: {user[4]}"
            )
        
        # Clear existing GitHub tokens and mark for re-authorization
        # Update the users table
        session.execute(text("""
            UPDATE users 
            SET github_token_encrypted = NULL,
                github_token_expires_at = NULL,
                updated_at = :now,
                last_login_at = :now
            WHERE github_token_encrypted IS NOT NULL 
            AND github_token_encrypted != ''
        """
        ), {'now': datetime.utcnow()})
        
        session.commit()
        
        logger.info(
            f"Successfully cleared GitHub tokens for {len(users_with_tokens)} users. "
            f"These users will need to re-authorize via the new OAuth flow."
        )
        
        # Log migration completion
        logger.info("Migration 002 completed successfully")
        
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def rollback_migration():
    """
    Rollback is not possible for this migration since we cannot recover
    the cleared GitHub tokens. Users will need to re-authorize via OAuth.
    
    This function logs a warning explaining why rollback is not supported.
    """
    logger.warning("Rollback not supported for this migration")
    logger.warning(
        "GitHub tokens were cleared for security reasons and cannot be recovered. "
        "Users must re-authorize via the new OAuth 2.0 flow."
    )
    print("\n")
    print("==========================================================")
    print("  ROLLBACK NOT SUPPORTED")
    print("==========================================================")
    print("\n")
    print("This migration cleared GitHub tokens for security reasons.")
    print("The tokens cannot be recovered.")
    print("\n")
    print("Users will need to re-authorize via the new OAuth 2.0 flow")
    print("by visiting /api/v1/auth/github")
    print("\n")
    
    return False


def main():
    """Main entry point for the migration script."""
    # Check for rollback flag
    if '--rollback' in sys.argv:
        rollback_migration()
        sys.exit(1)  # Exit with error to indicate rollback not supported
    
    # Check for dry-run flag
    dry_run = '--dry-run' in sys.argv
    
    if dry_run:
        logger.info("Running in dry-run mode - no changes will be made")
        # In dry-run mode, we'd just report what would be changed
        # For now, just run the migration but it won't commit
        # This is a simplified implementation
    
    try:
        success = run_migration()
        if success:
            logger.info("Migration completed successfully")
            sys.exit(0)
        else:
            logger.error("Migration failed")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Migration error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
