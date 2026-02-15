"""
PocoClass Database Layer

SQLite-backed persistence for all PocoClass application state, including:
- User management: PocoClass users mapped to Paperless-ngx accounts with role-based access
- Session management: Encrypted token storage with sliding-window + absolute expiry
- Configuration: Key-value config store for app settings, background processing params
- Paperless entity cache: Local copies of correspondents, tags, document types,
  custom fields, and users synced from the Paperless API for fast ID/name resolution
- Processing history: Audit trail of background processing runs with per-document details
- UI settings: Date format presets, placeholder visibility, and app preferences

Security features:
- API tokens encrypted at rest using Fernet symmetric encryption
- System API tokens stored as SHA-256 hashes (raw token shown once to admin)
- Session tokens use cryptographically secure random generation

Key classes:
    TokenEncryption - Handles Fernet encryption/decryption of Paperless API tokens
    Database - Main data access layer with methods organized by domain concern
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import secrets
import hashlib
import os
import base64
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)


class TokenEncryption:
    """Handles encryption/decryption of Paperless API tokens"""
    
    def __init__(self):
        self._cipher = None
        self._is_dev_mode = False
        self._load_key()
    
    def _load_key(self):
        """Load encryption key from environment with development mode fallback"""
        key = os.getenv('POCOCLASS_SECRET_KEY')
        
        if not key:
            # Check for explicit development mode flag (REQUIRED for dev fallback)
            is_dev = os.getenv('POCOCLASS_DEV_MODE') == 'true'
            
            if is_dev:
                # DEVELOPMENT MODE: Generate temporary key with warning
                warning_msg = (
                    "⚠️  WARNING: POCOCLASS_SECRET_KEY not set - using TEMPORARY encryption key!\n"
                    "   This is OK for development (POCOCLASS_DEV_MODE=true), but tokens will NOT persist across restarts.\n"
                    "   For production, generate a persistent key:\n"
                    "     python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'\n"
                    "   Then set: POCOCLASS_SECRET_KEY=<your-generated-key>"
                )
                logger.warning(warning_msg)
                print(f"\n{warning_msg}\n")
                
                # Generate a temporary key for this session only
                key = Fernet.generate_key()
                self._is_dev_mode = True
            else:
                # PRODUCTION MODE: Require explicit key
                error_msg = (
                    "CRITICAL: POCOCLASS_SECRET_KEY environment variable not set!\n"
                    "Token encryption requires a persistent encryption key.\n\n"
                    "To generate a secure key, run:\n"
                    "  python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'\n\n"
                    "Then add it to your environment:\n"
                    "  export POCOCLASS_SECRET_KEY=<your-generated-key>\n\n"
                    "For development testing only, you can bypass this check with:\n"
                    "  export POCOCLASS_DEV_MODE=true\n\n"
                    "Application startup ABORTED for security."
                )
                logger.critical(error_msg)
                raise ValueError("POCOCLASS_SECRET_KEY environment variable is required")
        
        # Ensure key is bytes
        if isinstance(key, str):
            key = key.encode()
        
        # Validate and create cipher
        try:
            self._cipher = Fernet(key)
            if self._is_dev_mode:
                logger.info("Token encryption initialized (DEVELOPMENT MODE - temporary key)")
            else:
                logger.info("Token encryption initialized successfully")
        except Exception as e:
            logger.critical(f"Invalid POCOCLASS_SECRET_KEY: {e}")
            raise ValueError(f"Invalid encryption key format: {e}")
    
    def encrypt(self, plaintext: str) -> str:
        """Encrypt a string and return base64-encoded ciphertext"""
        if not plaintext:
            return plaintext
        
        try:
            encrypted = self._cipher.encrypt(plaintext.encode())
            return base64.b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise
    
    def decrypt(self, ciphertext: str) -> str:
        """Decrypt base64-encoded ciphertext and return plaintext"""
        if not ciphertext:
            return ciphertext
        
        try:
            encrypted = base64.b64decode(ciphertext.encode())
            decrypted = self._cipher.decrypt(encrypted)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise

class Database:
    """Main data access layer for PocoClass.
    
    Provides CRUD operations for all application entities. Each method opens
    and closes its own SQLite connection (no connection pooling) for simplicity
    and thread safety. Uses INSERT OR REPLACE for upsert-style operations.
    """
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.getenv('POCOCLASS_DB_PATH', 'pococlass.db')
        self.db_path = db_path
        self.encryption = TokenEncryption()
        self.init_database()
    
    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_database(self):
        """Create all database tables if they don't exist, and run migrations.
        
        Tables are organized into groups:
        - Core: config, users, sessions, settings
        - Paperless cache: correspondents, tags, document_types, custom_fields, users
        - History: sync_history, processing_history, processing_history_details, logs
        - UI: app_settings, date_formats, placeholder_settings
        
        Migrations are handled inline with ALTER TABLE wrapped in try/except
        to safely skip if the column already exists.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                paperless_username TEXT UNIQUE NOT NULL,
                paperless_user_id INTEGER UNIQUE NOT NULL,
                paperless_groups TEXT,
                pococlass_role TEXT NOT NULL DEFAULT 'user',
                is_enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                last_login TEXT
            )
        """)
        
        # Migration: Add is_enabled column if it doesn't exist
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN is_enabled INTEGER NOT NULL DEFAULT 1")
            logger.info("Added is_enabled column to users table")
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        # Migration: Add paperless_groups column if it doesn't exist
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN paperless_groups TEXT")
            logger.info("Added paperless_groups column to users table")
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_token TEXT UNIQUE NOT NULL,
                user_id INTEGER NOT NULL,
                paperless_token TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                category TEXT,
                description TEXT,
                updated_at TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS paperless_correspondents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                paperless_id INTEGER UNIQUE NOT NULL,
                name TEXT NOT NULL,
                last_synced TEXT NOT NULL
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS paperless_tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                paperless_id INTEGER UNIQUE NOT NULL,
                name TEXT NOT NULL,
                color TEXT,
                last_synced TEXT NOT NULL
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS paperless_document_types (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                paperless_id INTEGER UNIQUE NOT NULL,
                name TEXT NOT NULL,
                last_synced TEXT NOT NULL
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS paperless_custom_fields (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                paperless_id INTEGER UNIQUE NOT NULL,
                name TEXT NOT NULL,
                data_type TEXT,
                extra_data TEXT,
                last_synced TEXT NOT NULL
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS paperless_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                paperless_id INTEGER UNIQUE NOT NULL,
                username TEXT NOT NULL,
                last_synced TEXT NOT NULL
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT NOT NULL,
                synced_at TEXT NOT NULL,
                items_synced INTEGER,
                status TEXT,
                error_message TEXT
            )
        """)
        
        # App Settings table for UI preferences
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Date formats table for quick-select presets
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS date_formats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                format_pattern TEXT UNIQUE NOT NULL,
                format_category TEXT NOT NULL,
                example TEXT,
                is_selected INTEGER DEFAULT 0,
                display_order INTEGER DEFAULT 0
            )
        """)
        
        # Placeholder settings for wizard visibility control
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS placeholder_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                placeholder_name TEXT UNIQUE NOT NULL,
                placeholder_type TEXT NOT NULL,
                visibility_mode TEXT NOT NULL DEFAULT 'both',
                is_custom_field INTEGER DEFAULT 0,
                is_internal INTEGER DEFAULT 0,
                is_locked INTEGER DEFAULT 0,
                order_index INTEGER DEFAULT 999,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Logs table for classification and rule execution events
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                type TEXT NOT NULL,
                level TEXT NOT NULL,
                source TEXT,
                message TEXT NOT NULL,
                rule_name TEXT,
                rule_id TEXT,
                document_id INTEGER,
                document_name TEXT,
                poco_score REAL,
                poco_ocr REAL,
                user_id INTEGER,
                details TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # Create index for faster log queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)
        """)
        
        # Processing history table for background processing runs
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS processing_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                started_at TEXT NOT NULL,
                completed_at TEXT,
                status TEXT NOT NULL,
                trigger_type TEXT NOT NULL,
                documents_found INTEGER DEFAULT 0,
                documents_processed INTEGER DEFAULT 0,
                documents_classified INTEGER DEFAULT 0,
                documents_skipped INTEGER DEFAULT 0,
                rules_applied INTEGER DEFAULT 0,
                error_message TEXT,
                user_id INTEGER,
                details TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # Create index for faster history queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_processing_history_started ON processing_history(started_at DESC)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_processing_history_status ON processing_history(status)
        """)
        
        # Processing history details table for per-document tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS processing_history_details (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id INTEGER NOT NULL,
                document_id INTEGER NOT NULL,
                document_title TEXT,
                rule_id TEXT,
                rule_name TEXT,
                poco_score REAL,
                ocr_score REAL,
                classification TEXT,
                metadata_applied TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (run_id) REFERENCES processing_history(id)
            )
        """)
        
        # Create composite index for faster queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_processing_details_run_doc 
            ON processing_history_details(run_id, document_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_processing_details_run 
            ON processing_history_details(run_id)
        """)
        
        # Migration: Add extra_data column to paperless_custom_fields if it doesn't exist
        cursor.execute("PRAGMA table_info(paperless_custom_fields)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'extra_data' not in columns:
            cursor.execute("ALTER TABLE paperless_custom_fields ADD COLUMN extra_data TEXT")
            logger.info("Added extra_data column to paperless_custom_fields table")
        
        conn.commit()
        conn.close()
        logger.info("Database initialized")
        
        # Initialize default settings
        self._init_default_settings()
    
    def _init_default_settings(self):
        """Initialize default app settings if they don't exist"""
        # Set default session timeout to 24 hours if not already set
        if self.get_app_setting('session_timeout_hours') is None:
            self.set_app_setting('session_timeout_hours', '24')
        
        # Initialize POCO OCR field setting (optional feature)
        if self.get_config('poco_ocr_enabled') is None:
            self.set_config('poco_ocr_enabled', 'false')
        
        # Initialize background processing defaults
        if self.get_config('bg_enabled') is None:
            self.set_config('bg_enabled', 'false')
        if self.get_config('bg_debounce_seconds') is None:
            self.set_config('bg_debounce_seconds', '30')
        if self.get_config('bg_tag_new') is None:
            self.set_config('bg_tag_new', 'NEW')
        if self.get_config('bg_tag_poco') is None:
            self.set_config('bg_tag_poco', 'POCO')
        if self.get_config('bg_processing_lock') is None:
            self.set_config('bg_processing_lock', 'false')
        if self.get_config('bg_needs_rerun') is None:
            self.set_config('bg_needs_rerun', 'false')
        
        # Initialize processing history retention policy defaults
        if self.get_config('history_retention_type') is None:
            self.set_config('history_retention_type', 'days')
        if self.get_config('history_retention_days') is None:
            self.set_config('history_retention_days', '365')
        if self.get_config('history_retention_count') is None:
            self.set_config('history_retention_count', '100')
        
        self.init_date_formats()
        self.init_placeholder_settings()
    
    def is_setup_completed(self) -> bool:
        """Check if initial setup is completed"""
        return self.get_config('setup_completed') == 'true'
    
    def complete_setup(self, paperless_url: str):
        """Mark setup as completed"""
        self.set_config('setup_completed', 'true')
        self.set_config('setup_date', datetime.now().isoformat())
        self.set_config('paperless_url', paperless_url)
    
    def get_config(self, key: str) -> Optional[str]:
        """Get configuration value"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM config WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        return row['value'] if row else None
    
    def set_config(self, key: str, value: str):
        """Set configuration value"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO config (key, value, updated_at)
            VALUES (?, ?, ?)
        """, (key, value, datetime.now().isoformat()))
        conn.commit()
        conn.close()
    
    # System API Token Management
    def generate_system_token(self) -> str:
        """Generate a new system-wide API token for automation.
        
        Returns the raw token (to display to admin once).
        Stores a hashed version in the database.
        """
        # Generate a secure random token (32 bytes = 64 hex chars)
        raw_token = secrets.token_hex(32)
        
        # Hash the token for storage (we don't store the raw token)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        
        # Store the hash
        self.set_config('system_api_token_hash', token_hash)
        self.set_config('system_api_token_created', datetime.now().isoformat())
        
        logger.info("Generated new system API token")
        return raw_token
    
    def validate_system_token(self, token: str) -> bool:
        """Validate a system API token by comparing hashes."""
        if not token:
            return False
        
        stored_hash = self.get_config('system_api_token_hash')
        if not stored_hash:
            return False
        
        # Hash the provided token and compare
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        return secrets.compare_digest(token_hash, stored_hash)
    
    def has_system_token(self) -> bool:
        """Check if a system API token exists."""
        return self.get_config('system_api_token_hash') is not None
    
    def get_system_token_info(self) -> Optional[Dict]:
        """Get metadata about the system token (not the token itself)."""
        token_hash = self.get_config('system_api_token_hash')
        if not token_hash:
            return None
        
        return {
            'exists': True,
            'created_at': self.get_config('system_api_token_created'),
            'token_prefix': 'poco_'  # Just for display purposes
        }
    
    def revoke_system_token(self):
        """Revoke the current system API token."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM config WHERE key IN ('system_api_token_hash', 'system_api_token_created')")
        conn.commit()
        conn.close()
        logger.info("Revoked system API token")
    
    def create_user(self, paperless_username: str, paperless_user_id: int, role: str = 'user') -> Optional[int]:
        """Create a new PocoClass user linked to a Paperless account.
        
        Uses get-or-create pattern: if a user with the same username already exists
        (IntegrityError on UNIQUE constraint), returns the existing user's ID instead.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO users (paperless_username, paperless_user_id, pococlass_role, created_at)
                VALUES (?, ?, ?, ?)
            """, (paperless_username, paperless_user_id, role, datetime.now().isoformat()))
            conn.commit()
            user_id = cursor.lastrowid
            logger.info(f"Created user: {paperless_username} with role: {role}")
            return user_id
        except sqlite3.IntegrityError:
            cursor.execute(
                "SELECT id FROM users WHERE paperless_username = ?",
                (paperless_username,)
            )
            row = cursor.fetchone()
            return row['id'] if row else None
        finally:
            conn.close()
    
    def get_user_by_paperless_id(self, paperless_user_id: int) -> Optional[Dict]:
        """Get user by Paperless user ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE paperless_user_id = ?", (paperless_user_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    
    def get_user_by_username(self, paperless_username: str) -> Optional[Dict]:
        """Get user by Paperless username"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE paperless_username = ?", (paperless_username,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """Get user by ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    
    def update_user_role(self, user_id: int, role: str):
        """Update user role"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET pococlass_role = ? WHERE id = ?", (role, user_id))
        conn.commit()
        conn.close()
        logger.info(f"Updated user {user_id} role to: {role}")
    
    def enable_user(self, paperless_user_id: int):
        """Enable a user (allow PocoClass access)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET is_enabled = 1 WHERE paperless_user_id = ?", (paperless_user_id,))
        conn.commit()
        conn.close()
        logger.info(f"Enabled user with Paperless ID: {paperless_user_id}")
    
    def disable_user(self, paperless_user_id: int):
        """Disable a user (block PocoClass access)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET is_enabled = 0 WHERE paperless_user_id = ?", (paperless_user_id,))
        conn.commit()
        conn.close()
        logger.info(f"Disabled user with Paperless ID: {paperless_user_id}")
    
    def update_last_login(self, user_id: int):
        """Update user's last login time"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", 
                      (datetime.now().isoformat(), user_id))
        conn.commit()
        conn.close()
    
    def list_users(self) -> List[Dict]:
        """List all users with mapped field names for frontend"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users ORDER BY created_at")
        rows = cursor.fetchall()
        conn.close()
        
        # Map database fields to frontend expected fields
        users = []
        for row in rows:
            user_dict = dict(row)
            role = user_dict['pococlass_role']
            users.append({
                'id': user_dict['id'],
                'username': user_dict['paperless_username'],
                'paperless_user_id': user_dict['paperless_user_id'],
                'groups': [],  # Will be populated from Paperless API
                'role': role,
                'is_admin': role == 'admin',
                'created_at': user_dict['created_at'],
                'last_login': user_dict['last_login'],
                'is_enabled': bool(user_dict['is_enabled'])
            })
        return users
    
    def create_session(self, user_id: int, paperless_token: str, duration_hours: Optional[int] = None) -> str:
        """Create a new authenticated session with encrypted token storage.
        
        Generates a cryptographically secure session token and encrypts the
        Paperless API token before storing. Session duration defaults to the
        configured session_timeout_hours app setting.
        
        Returns:
            The session token string (to be sent as a cookie/header to the client)
        """
        # Get session timeout from settings, default to 24 hours
        if duration_hours is None:
            duration_hours = int(self.get_app_setting('session_timeout_hours', '24'))
        
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(hours=duration_hours)
        
        # Encrypt the Paperless API token before storing
        encrypted_token = self.encryption.encrypt(paperless_token)
        
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO sessions (session_token, user_id, paperless_token, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?)
        """, (session_token, user_id, encrypted_token, datetime.now().isoformat(), expires_at.isoformat()))
        conn.commit()
        conn.close()
        
        logger.info(f"Created encrypted session for user {user_id}")
        return session_token
    
    def get_session(self, session_token: str) -> Optional[Dict]:
        """Validate and retrieve a session, applying dual-expiry checks.
        
        Implements two expiry mechanisms:
        1. Sliding window: Session extends on each activity (configurable hours)
        2. Absolute max: Hard cap on total session lifetime (prevents indefinite extension)
        
        If valid, decrypts the stored Paperless API token and refreshes the
        sliding window expiry. Automatically deletes expired or corrupted sessions.
        
        Returns:
            Session dict with decrypted 'paperless_token' and user info, or None
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.*, u.paperless_username, u.paperless_user_id, u.pococlass_role
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ?
        """, (session_token,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        session = dict(row)
        
        # Check if session expired (sliding window)
        if datetime.fromisoformat(session['expires_at']) < datetime.now():
            logger.info("Session expired (sliding window timeout)")
            self.delete_session(session_token)
            return None
        
        # Check absolute session lifetime (prevents indefinite session extension)
        absolute_max_hours = int(self.get_app_setting('session_absolute_max_hours', '168'))  # Default 7 days
        created_at = datetime.fromisoformat(session['created_at'])
        absolute_expiry = created_at + timedelta(hours=absolute_max_hours)
        
        if absolute_expiry < datetime.now():
            logger.info(f"Session expired (absolute max lifetime of {absolute_max_hours} hours reached)")
            self.delete_session(session_token)
            return None
        
        # Decrypt the Paperless API token
        try:
            session['paperless_token'] = self.encryption.decrypt(session['paperless_token'])
        except Exception as e:
            logger.error(f"Failed to decrypt token for session {session_token}: {e}")
            self.delete_session(session_token)
            return None
        
        # Refresh session expiry on activity (sliding window timeout)
        self.refresh_session(session_token)
        
        return session
    
    def refresh_session(self, session_token: str):
        """Refresh session expiry time (extend timeout on activity)"""
        # Get session timeout from settings
        duration_hours = int(self.get_app_setting('session_timeout_hours', '24'))
        new_expires_at = datetime.now() + timedelta(hours=duration_hours)
        
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE sessions 
            SET expires_at = ? 
            WHERE session_token = ?
        """, (new_expires_at.isoformat(), session_token))
        conn.commit()
        conn.close()
    
    def delete_session(self, session_token: str):
        """Delete a session"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE session_token = ?", (session_token,))
        conn.commit()
        conn.close()
        logger.info("Deleted session")
    
    def cleanup_expired_sessions(self):
        """Delete expired sessions"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE expires_at < ?", (datetime.now().isoformat(),))
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        if deleted > 0:
            logger.info(f"Cleaned up {deleted} expired sessions")
    
    def clear_all_sessions(self):
        """Clear all sessions (use for security migration)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions")
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        logger.warning(f"Cleared all {deleted} sessions for security migration")
        return deleted
    
    def get_setting(self, key: str) -> Optional[str]:
        """Get a setting value"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        return row['value'] if row else None
    
    def set_setting(self, key: str, value: str, category: str = 'general', description: str = ''):
        """Set a setting value"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO settings (key, value, category, description, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, (key, value, category, description, datetime.now().isoformat()))
        conn.commit()
        conn.close()
    
    def get_all_settings(self, category: Optional[str] = None) -> List[Dict]:
        """Get all settings, optionally filtered by category"""
        conn = self.get_connection()
        cursor = conn.cursor()
        if category:
            cursor.execute("SELECT * FROM settings WHERE category = ? ORDER BY key", (category,))
        else:
            cursor.execute("SELECT * FROM settings ORDER BY category, key")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def sync_correspondents(self, correspondents: List[Dict]) -> int:
        """Upsert correspondents from Paperless API into local cache.
        
        Uses INSERT OR REPLACE to create or update cached correspondents.
        Also records the sync event in sync_history for audit.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        synced = 0
        
        for corr in correspondents:
            cursor.execute("""
                INSERT OR REPLACE INTO paperless_correspondents (paperless_id, name, last_synced)
                VALUES (?, ?, ?)
            """, (corr['id'], corr['name'], now))
            synced += 1
        
        conn.commit()
        cursor.execute("""
            INSERT INTO sync_history (entity_type, synced_at, items_synced, status)
            VALUES (?, ?, ?, ?)
        """, ('correspondents', now, synced, 'success'))
        conn.commit()
        conn.close()
        logger.info(f"Synced {synced} correspondents")
        return synced
    
    def get_correspondent_id_by_name(self, name: str) -> Optional[int]:
        """Get Paperless correspondent ID by name from cache"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT paperless_id FROM paperless_correspondents WHERE name = ?", (name,))
        row = cursor.fetchone()
        conn.close()
        return row['paperless_id'] if row else None
    
    def get_all_correspondents(self) -> List[Dict]:
        """Get all cached correspondents"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM paperless_correspondents ORDER BY name")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def sync_tags(self, tags: List[Dict]) -> int:
        """Upsert tags from Paperless API into local cache.
        
        Unlike correspondents, tags also perform a cleanup step: any cached tags
        not present in the incoming list are deleted (handles tag removal in Paperless).
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        synced = 0
        
        # Get list of current paperless_ids from the sync
        paperless_ids = [tag['id'] for tag in tags]
        
        # Delete any tags that no longer exist in Paperless
        if paperless_ids:
            placeholders = ','.join('?' * len(paperless_ids))
            cursor.execute(f"""
                DELETE FROM paperless_tags 
                WHERE paperless_id NOT IN ({placeholders})
            """, paperless_ids)
        else:
            # If no tags in Paperless, delete all
            cursor.execute("DELETE FROM paperless_tags")
        
        # Insert or update current tags
        for tag in tags:
            cursor.execute("""
                INSERT OR REPLACE INTO paperless_tags (paperless_id, name, color, last_synced)
                VALUES (?, ?, ?, ?)
            """, (tag['id'], tag['name'], tag.get('color', '#000000'), now))
            synced += 1
        
        conn.commit()
        cursor.execute("""
            INSERT INTO sync_history (entity_type, synced_at, items_synced, status)
            VALUES (?, ?, ?, ?)
        """, ('tags', now, synced, 'success'))
        conn.commit()
        conn.close()
        logger.info(f"Synced {synced} tags")
        return synced
    
    def get_tag_id_by_name(self, name: str) -> Optional[int]:
        """Get Paperless tag ID by name from cache"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT paperless_id FROM paperless_tags WHERE name = ?", (name,))
        row = cursor.fetchone()
        conn.close()
        return row['paperless_id'] if row else None
    
    def get_all_tags(self) -> List[Dict]:
        """Get all cached tags"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM paperless_tags ORDER BY name")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def sync_document_types(self, document_types: List[Dict]) -> int:
        """Sync document types from Paperless"""
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        synced = 0
        
        for dt in document_types:
            cursor.execute("""
                INSERT OR REPLACE INTO paperless_document_types (paperless_id, name, last_synced)
                VALUES (?, ?, ?)
            """, (dt['id'], dt['name'], now))
            synced += 1
        
        conn.commit()
        cursor.execute("""
            INSERT INTO sync_history (entity_type, synced_at, items_synced, status)
            VALUES (?, ?, ?, ?)
        """, ('document_types', now, synced, 'success'))
        conn.commit()
        conn.close()
        logger.info(f"Synced {synced} document types")
        return synced
    
    def get_document_type_id_by_name(self, name: str) -> Optional[int]:
        """Get Paperless document type ID by name from cache"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT paperless_id FROM paperless_document_types WHERE name = ?", (name,))
        row = cursor.fetchone()
        conn.close()
        return row['paperless_id'] if row else None
    
    def get_all_document_types(self) -> List[Dict]:
        """Get all cached document types"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM paperless_document_types ORDER BY name")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def cache_custom_field(self, custom_field: Dict) -> None:
        """Cache a single custom field without affecting others (for individual lookups)"""
        import json
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        extra_data_json = json.dumps(custom_field.get('extra_data', {})) if custom_field.get('extra_data') else None
        cursor.execute("""
            INSERT OR REPLACE INTO paperless_custom_fields (paperless_id, name, data_type, extra_data, last_synced)
            VALUES (?, ?, ?, ?, ?)
        """, (custom_field['id'], custom_field['name'], custom_field.get('data_type', 'string'), extra_data_json, now))
        
        conn.commit()
        conn.close()
        logger.debug(f"Cached custom field '{custom_field['name']}' (ID: {custom_field['id']})")
    
    def sync_custom_fields(self, custom_fields: List[Dict]) -> int:
        """Upsert custom fields from Paperless API into local cache.
        
        Like tags, performs cleanup of deleted fields. Also stores extra_data
        as JSON (contains select option definitions for dropdown-type fields).
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        synced = 0
        
        # Get list of current paperless_ids from the sync
        paperless_ids = [cf['id'] for cf in custom_fields]
        
        # Delete any fields that no longer exist in Paperless
        if paperless_ids:
            placeholders = ','.join('?' * len(paperless_ids))
            cursor.execute(f"""
                DELETE FROM paperless_custom_fields 
                WHERE paperless_id NOT IN ({placeholders})
            """, paperless_ids)
        else:
            # If no fields in Paperless, delete all
            cursor.execute("DELETE FROM paperless_custom_fields")
        
        # Insert or update current fields
        for cf in custom_fields:
            import json
            extra_data_json = json.dumps(cf.get('extra_data', {})) if cf.get('extra_data') else None
            cursor.execute("""
                INSERT OR REPLACE INTO paperless_custom_fields (paperless_id, name, data_type, extra_data, last_synced)
                VALUES (?, ?, ?, ?, ?)
            """, (cf['id'], cf['name'], cf.get('data_type', 'string'), extra_data_json, now))
            synced += 1
        
        conn.commit()
        cursor.execute("""
            INSERT INTO sync_history (entity_type, synced_at, items_synced, status)
            VALUES (?, ?, ?, ?)
        """, ('custom_fields', now, synced, 'success'))
        conn.commit()
        conn.close()
        logger.info(f"Synced {synced} custom fields")
        return synced
    
    def get_custom_field_id_by_name(self, name: str) -> Optional[int]:
        """Get Paperless custom field ID by name from cache"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT paperless_id FROM paperless_custom_fields WHERE name = ?", (name,))
        row = cursor.fetchone()
        conn.close()
        return row['paperless_id'] if row else None
    
    def get_custom_field_by_id(self, field_id: int) -> Optional[Dict]:
        """Get custom field definition by ID from cache (includes select options)"""
        import json
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM paperless_custom_fields WHERE paperless_id = ?", (field_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                'id': row['paperless_id'],
                'name': row['name'],
                'data_type': row['data_type'],
                'extra_data': json.loads(row['extra_data']) if row['extra_data'] else {}
            }
        return None
    
    def get_all_custom_fields(self) -> List[Dict]:
        """Get all cached custom fields"""
        import json
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM paperless_custom_fields ORDER BY name")
        rows = cursor.fetchall()
        conn.close()
        
        result = []
        for row in rows:
            field_dict = dict(row)
            # Parse extra_data JSON if it exists
            if field_dict.get('extra_data'):
                try:
                    field_dict['extra_data'] = json.loads(field_dict['extra_data'])
                except (json.JSONDecodeError, TypeError):
                    field_dict['extra_data'] = {}
            result.append(field_dict)
        return result
    
    def sync_users(self, users: List[Dict]) -> int:
        """Sync Paperless users from API"""
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        synced = 0
        
        for user in users:
            cursor.execute("""
                INSERT OR REPLACE INTO paperless_users (paperless_id, username, last_synced)
                VALUES (?, ?, ?)
            """, (user['id'], user['username'], now))
            synced += 1
        
        conn.commit()
        cursor.execute("""
            INSERT INTO sync_history (entity_type, synced_at, items_synced, status)
            VALUES (?, ?, ?, ?)
        """, ('users', now, synced, 'success'))
        conn.commit()
        conn.close()
        logger.info(f"Synced {synced} Paperless users")
        return synced
    
    def get_cached_username_by_paperless_id(self, paperless_id: int) -> Optional[str]:
        """Get cached username by Paperless user ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT username FROM paperless_users WHERE paperless_id = ?", (paperless_id,))
        row = cursor.fetchone()
        conn.close()
        return row['username'] if row else None
    
    def get_all_paperless_users(self) -> List[Dict]:
        """Get all cached Paperless users"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM paperless_users ORDER BY username")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def get_sync_history(self, limit: int = 10) -> List[Dict]:
        """Get recent sync history"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM sync_history 
            ORDER BY synced_at DESC 
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def get_last_sync_time(self, entity_type: str) -> Optional[str]:
        """Get the last sync time for an entity type"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT synced_at FROM sync_history 
            WHERE entity_type = ? AND status = 'success'
            ORDER BY synced_at DESC 
            LIMIT 1
        """, (entity_type,))
        row = cursor.fetchone()
        conn.close()
        return row['synced_at'] if row else None
    
    # App Settings Methods
    def get_app_setting(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Get app setting by key"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        return row['value'] if row else default
    
    def set_app_setting(self, key: str, value: str):
        """Set app setting"""
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute("""
            INSERT OR REPLACE INTO app_settings (key, value, updated_at)
            VALUES (?, ?, ?)
        """, (key, value, now))
        conn.commit()
        conn.close()
    
    def get_all_app_settings(self) -> Dict:
        """Get all app settings as dict"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM app_settings")
        rows = cursor.fetchall()
        conn.close()
        return {row['key']: row['value'] for row in rows}
    
    # Date Formats Methods
    def init_date_formats(self):
        """Initialize date formats with predefined list"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Check if already initialized
        cursor.execute("SELECT COUNT(*) as count FROM date_formats")
        if cursor.fetchone()['count'] > 0:
            conn.close()
            return
        
        formats = [
            ("DD-MM-YYYY", "Dash (-)", "e.g., 15-04-2024", 1, 1),
            ("DD-MMM-YYYY", "Dash (-)", "e.g., 15-Apr-2024", 1, 2),
            ("MM-DD-YYYY", "Dash (-)", "e.g., 04-15-2024", 1, 3),
            ("YYYY-MM-DD", "Dash (-)", "e.g., 2024-04-15", 1, 4),
            ("DD-MM-YY", "Dash (-)", "e.g., 15-04-24", 0, 5),
            ("MM-DD-YY", "Dash (-)", "e.g., 04-15-24", 0, 6),
            ("DD/MM/YYYY", "Slash (/)", "e.g., 15/04/2024", 1, 7),
            ("MM/DD/YYYY", "Slash (/)", "e.g., 04/15/2024", 1, 8),
            ("YYYY/MM/DD", "Slash (/)", "e.g., 2024/04/15", 0, 9),
            ("D/M/YYYY", "Slash (/)", "e.g., 5/4/2024", 0, 10),
            ("DD.MM.YYYY", "Dot (.)", "e.g., 15.04.2024", 1, 11),
            ("MM.DD.YYYY", "Dot (.)", "e.g., 04.15.2024", 0, 12),
            ("YYYY.MM.DD", "Dot (.)", "e.g., 2024.04.15", 0, 13),
            ("DD MMM YYYY", "Space / Text", "e.g., 15 Apr 2024", 1, 14),
            ("MMM DD, YYYY", "Space / Text", "e.g., April 15, 2024", 0, 15),
            ("MMMM DD, YYYY", "Space / Text", "e.g., April 15, 2024", 1, 16),
            ("DD MMMM YYYY", "Space / Text", "e.g., 15 April 2024", 1, 17),
            ("YYYY MMM DD", "Space / Text", "e.g., 2024 Apr 15", 0, 18),
            ("DDDD DD MMMM YYYY", "Space / Text", "e.g., Monday 15 April 2024", 0, 19),
            ("M/D/YYYY", "Slash (/)", "e.g., 4/5/2024", 0, 20),
            ("N/D/YYYY", "Slash (/)", "e.g., 4/5/2024", 0, 21),
        ]
        
        cursor.executemany("""
            INSERT INTO date_formats (format_pattern, format_category, example, is_selected, display_order)
            VALUES (?, ?, ?, ?, ?)
        """, formats)
        
        conn.commit()
        conn.close()
        logger.info("Initialized date formats")
    
    def get_all_date_formats(self) -> List[Dict]:
        """Get all date formats"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM date_formats ORDER BY display_order")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def get_selected_date_formats(self) -> List[Dict]:
        """Get selected date formats"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM date_formats WHERE is_selected = 1 ORDER BY display_order")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def set_date_format_selection(self, format_pattern: str, is_selected: bool):
        """Set date format selection status"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # If deselecting, ensure at least one other format is selected
        if not is_selected:
            cursor.execute("SELECT COUNT(*) as count FROM date_formats WHERE is_selected = 1")
            selected_count = cursor.fetchone()['count']
            if selected_count <= 1:
                conn.close()
                raise ValueError("At least one date format must be selected")
        
        cursor.execute("""
            UPDATE date_formats SET is_selected = ? WHERE format_pattern = ?
        """, (1 if is_selected else 0, format_pattern))
        conn.commit()
        conn.close()
    
    # Placeholder Settings Methods
    def init_placeholder_settings(self):
        """Initialize placeholder settings with defaults"""
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        # Check if already initialized
        cursor.execute("SELECT COUNT(*) as count FROM placeholder_settings")
        if cursor.fetchone()['count'] > 0:
            conn.close()
            return
        
        # Built-in placeholders with explicit order
        # Format: (name, type, mode, is_custom, is_internal, is_locked, order_idx)
        placeholders = [
            ("Title", "builtin", "disabled", 0, 0, 1, 1),
            ("Archive Serial Number", "builtin", "disabled", 0, 0, 1, 2),
            ("Storage Path", "builtin", "disabled", 0, 0, 1, 3),
            ("Date Created", "builtin", "both", 0, 0, 0, 4),
            ("Correspondent", "builtin", "both", 0, 0, 0, 5),
            ("Document Type", "builtin", "both", 0, 0, 0, 6),
            ("Tags", "builtin", "both", 0, 0, 0, 7),
            ("POCO Score", "internal", "disabled", 0, 1, 0, 100),
            ("POCO OCR", "internal", "disabled", 0, 1, 0, 101),
        ]
        
        for name, ptype, mode, is_custom, is_internal, is_locked, order_idx in placeholders:
            cursor.execute("""
                INSERT INTO placeholder_settings 
                (placeholder_name, placeholder_type, visibility_mode, is_custom_field, is_internal, is_locked, order_index, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, ptype, mode, is_custom, is_internal, is_locked, order_idx, now))
        
        conn.commit()
        conn.close()
        logger.info("Initialized placeholder settings")
    
    def get_all_placeholder_settings(self) -> List[Dict]:
        """Get all placeholder settings"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM placeholder_settings 
            ORDER BY order_index, placeholder_name
        """)
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def set_placeholder_visibility(self, placeholder_name: str, visibility_mode: str):
        """Set placeholder visibility mode"""
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute("""
            UPDATE placeholder_settings 
            SET visibility_mode = ?, updated_at = ?
            WHERE placeholder_name = ?
        """, (visibility_mode, now, placeholder_name))
        conn.commit()
        conn.close()
    
    def sync_custom_field_placeholders(self):
        """Sync custom fields from cache into placeholder settings for the rule wizard.
        
        Ensures placeholder_settings reflects the current set of Paperless custom fields:
        - Removes placeholder entries for fields that no longer exist
        - Adds new fields with default visibility ('both') and sequential ordering
        - Custom fields are ordered after built-in fields (indices 8+) but before internals (100+)
        """
        custom_fields = self.get_all_custom_fields()
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        # Get list of current custom field names from the cache
        custom_field_names = [cf['name'] for cf in custom_fields]
        
        # Delete placeholder entries for custom fields that no longer exist
        if custom_field_names:
            placeholders = ','.join('?' * len(custom_field_names))
            cursor.execute(f"""
                DELETE FROM placeholder_settings 
                WHERE is_custom_field = 1 AND placeholder_name NOT IN ({placeholders})
            """, custom_field_names)
        else:
            # If no custom fields exist, delete all custom field placeholders
            cursor.execute("DELETE FROM placeholder_settings WHERE is_custom_field = 1")
        
        # Insert or update current custom fields
        # Custom fields get order_index 8, 9, 10, etc. (after built-in 1-7 and before internal 100+)
        for idx, cf in enumerate(custom_fields):
            placeholder_name = cf['name']
            order_idx = 8 + idx
            cursor.execute("""
                INSERT OR IGNORE INTO placeholder_settings 
                (placeholder_name, placeholder_type, visibility_mode, is_custom_field, is_internal, is_locked, order_index, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (placeholder_name, "custom", "both", 1, 0, 0, order_idx, now))
        
        conn.commit()
        conn.close()
    
    def add_log(self, log_type: str, level: str, message: str, 
                rule_name: str = None, rule_id: str = None,
                document_id: int = None, document_name: str = None,
                poco_score: float = None, poco_ocr: float = None,
                user_id: int = None, source: str = None, details: str = None):
        """Record a classification or processing event in the logs table.
        
        Args:
            log_type: Event category (e.g., 'classification', 'processing', 'sync')
            level: Severity level ('info', 'warning', 'error')
            message: Human-readable event description
            rule_name: Name of the rule involved (if applicable)
            rule_id: ID of the rule involved (if applicable)
            document_id: Paperless document ID (if applicable)
            document_name: Document title for display
            poco_score: POCO classification score (0-100)
            poco_ocr: POCO OCR match score (0-100)
            user_id: PocoClass user who triggered the action
            source: Component that generated the log (e.g., 'background_processor')
            details: Additional JSON-serializable details
            
        Returns:
            The auto-generated log entry ID
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO logs (timestamp, type, level, source, message, rule_name, rule_id, 
                            document_id, document_name, poco_score, poco_ocr, user_id, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (datetime.now().isoformat(), log_type, level, source, message, rule_name, rule_id,
              document_id, document_name, poco_score, poco_ocr, user_id, details))
        conn.commit()
        log_id = cursor.lastrowid
        conn.close()
        return log_id
    
    def get_logs(self, limit: int = 500, order_by: str = '-timestamp',
                 log_type: str = None, level: str = None,
                 date_from: str = None, date_to: str = None,
                 search: str = None) -> List[Dict]:
        """Query logs with dynamic filtering and safe sorting.
        
        Builds a parameterized SQL query based on provided filters.
        Sort field is validated against a whitelist to prevent SQL injection
        (since column names can't be parameterized in SQLite).
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM logs WHERE 1=1"
        params = []
        
        if log_type and log_type != 'all':
            query += " AND type = ?"
            params.append(log_type)
        
        if level and level != 'all':
            query += " AND level = ?"
            params.append(level)
        
        if date_from:
            query += " AND timestamp >= ?"
            params.append(date_from)
        
        if date_to:
            query += " AND timestamp <= ?"
            # Add end of day
            date_to_dt = datetime.fromisoformat(date_to)
            date_to_dt = date_to_dt.replace(hour=23, minute=59, second=59)
            params.append(date_to_dt.isoformat())
        
        if search:
            query += " AND (message LIKE ? OR rule_name LIKE ? OR document_name LIKE ?)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern])
        
        # Handle ordering - WHITELIST ALLOWED COLUMNS TO PREVENT SQL INJECTION
        allowed_sort_fields = ['timestamp', 'type', 'level', 'rule_name', 'document_name', 'poco_score', 'poco_ocr']
        desc = False
        
        if order_by.startswith('-'):
            desc = True
            sort_field = order_by[1:]
        else:
            sort_field = order_by
        
        # Validate sort field against whitelist
        if sort_field not in allowed_sort_fields:
            sort_field = 'timestamp'  # Default to timestamp if invalid
        
        query += f" ORDER BY {sort_field}"
        query += " DESC" if desc else " ASC"
        
        if limit:
            query += " LIMIT ?"
            params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def get_processing_lock(self) -> bool:
        """Get current processing lock status"""
        return self.get_config('bg_processing_lock') == 'true'
    
    def set_processing_lock(self, locked: bool):
        """Set processing lock status"""
        self.set_config('bg_processing_lock', 'true' if locked else 'false')
    
    def get_needs_rerun(self) -> bool:
        """Get needs rerun flag"""
        return self.get_config('bg_needs_rerun') == 'true'
    
    def set_needs_rerun(self, needs_rerun: bool):
        """Set needs rerun flag"""
        self.set_config('bg_needs_rerun', 'true' if needs_rerun else 'false')
    
    def create_processing_run(self, trigger_type: str = 'manual', user_id: int = None) -> int:
        """Create a new processing run record and return its ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO processing_history (started_at, status, trigger_type, user_id)
            VALUES (?, ?, ?, ?)
        """, (datetime.now().isoformat(), 'running', trigger_type, user_id))
        conn.commit()
        run_id = cursor.lastrowid
        conn.close()
        return run_id
    
    def update_processing_run(self, run_id: int, status: str, 
                            documents_found: int = None,
                            documents_processed: int = None,
                            documents_classified: int = None,
                            documents_skipped: int = None,
                            rules_applied: int = None,
                            error_message: str = None,
                            details: str = None):
        """Update a processing run with final results.
        
        Dynamically builds the UPDATE query to only set fields that were provided,
        avoiding overwriting existing values with NULL.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        update_fields = ['status = ?', 'completed_at = ?']
        params = [status, datetime.now().isoformat()]
        
        if documents_found is not None:
            update_fields.append('documents_found = ?')
            params.append(documents_found)
        if documents_processed is not None:
            update_fields.append('documents_processed = ?')
            params.append(documents_processed)
        if documents_classified is not None:
            update_fields.append('documents_classified = ?')
            params.append(documents_classified)
        if documents_skipped is not None:
            update_fields.append('documents_skipped = ?')
            params.append(documents_skipped)
        if rules_applied is not None:
            update_fields.append('rules_applied = ?')
            params.append(rules_applied)
        if error_message is not None:
            update_fields.append('error_message = ?')
            params.append(error_message)
        if details is not None:
            update_fields.append('details = ?')
            params.append(details)
        
        params.append(run_id)
        
        query = f"UPDATE processing_history SET {', '.join(update_fields)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()
        conn.close()
    
    def get_processing_history(self, limit: int = 100, status: str = None, offset: int = 0) -> List[Dict]:
        """Get processing history with optional filtering"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM processing_history WHERE 1=1"
        params = []
        
        if status and status != 'all':
            query += " AND status = ?"
            params.append(status)
        
        query += " ORDER BY started_at DESC"
        
        if limit:
            query += " LIMIT ? OFFSET ?"
            params.extend([limit, offset])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def add_processing_detail(self, run_id: int, detail_dict: Dict) -> int:
        """
        Add a processing detail record for a single document
        
        Args:
            run_id: The processing run ID
            detail_dict: Dictionary with document processing details
                - document_id (int, required)
                - document_title (str, optional)
                - rule_id (str, optional)
                - rule_name (str, optional)
                - poco_score (float, optional)
                - ocr_score (float, optional)
                - classification (str, optional): "POCO+" or "POCO-"
                - metadata_applied (list, optional): List of fields updated
                - status (str, required): "applied" or "simulated"
        
        Returns:
            The detail record ID
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Convert metadata_applied list to JSON string
        metadata_applied = detail_dict.get('metadata_applied', [])
        if isinstance(metadata_applied, list):
            metadata_applied = json.dumps(metadata_applied)
        
        cursor.execute("""
            INSERT INTO processing_history_details 
            (run_id, document_id, document_title, rule_id, rule_name, 
             poco_score, ocr_score, classification, metadata_applied, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            run_id,
            detail_dict['document_id'],
            detail_dict.get('document_title'),
            detail_dict.get('rule_id'),
            detail_dict.get('rule_name'),
            detail_dict.get('poco_score'),
            detail_dict.get('ocr_score'),
            detail_dict.get('classification'),
            metadata_applied,
            detail_dict['status'],
            datetime.now().isoformat()
        ))
        
        conn.commit()
        detail_id = cursor.lastrowid
        conn.close()
        return detail_id
    
    def get_processing_details(self, run_id: int, limit: int = None, offset: int = 0) -> List[Dict]:
        """
        Get processing details for a specific run
        
        Args:
            run_id: The processing run ID
            limit: Maximum number of records to return
            offset: Number of records to skip
        
        Returns:
            List of detail records with metadata_applied as parsed JSON list
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM processing_history_details WHERE run_id = ? ORDER BY created_at"
        params = [run_id]
        
        if limit:
            query += " LIMIT ? OFFSET ?"
            params.extend([limit, offset])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        # Parse JSON metadata_applied field
        details = []
        for row in rows:
            detail = dict(row)
            if detail.get('metadata_applied'):
                try:
                    detail['metadata_applied'] = json.loads(detail['metadata_applied'])
                except json.JSONDecodeError:
                    detail['metadata_applied'] = []
            else:
                detail['metadata_applied'] = []
            details.append(detail)
        
        return details
    
    def cleanup_old_processing_history(self) -> int:
        """
        Clean up old processing history based on retention policy settings
        
        Returns:
            Number of runs deleted
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            retention_type = self.get_config('history_retention_type') or 'days'
            
            if retention_type == 'days':
                retention_days = int(self.get_config('history_retention_days') or '365')
                cutoff_date = (datetime.now() - timedelta(days=retention_days)).isoformat()
                
                cursor.execute("""
                    SELECT id FROM processing_history 
                    WHERE started_at < ?
                """, (cutoff_date,))
                runs_to_delete = cursor.fetchall()
                run_ids = [row['id'] for row in runs_to_delete]
                
                if run_ids:
                    placeholders = ','.join('?' * len(run_ids))
                    cursor.execute(f"""
                        DELETE FROM processing_history_details 
                        WHERE run_id IN ({placeholders})
                    """, run_ids)
                    
                    cursor.execute(f"""
                        DELETE FROM processing_history 
                        WHERE id IN ({placeholders})
                    """, run_ids)
                    
                    conn.commit()
                    deleted_count = len(run_ids)
                    logger.info(f"Cleanup: Deleted {deleted_count} processing runs older than {retention_days} days")
                    return deleted_count
                
            elif retention_type == 'count':
                # Keep only the N most recent runs; LIMIT -1 OFFSET N selects everything after the Nth row
                retention_count = int(self.get_config('history_retention_count') or '100')
                
                cursor.execute("""
                    SELECT id FROM processing_history 
                    ORDER BY started_at DESC 
                    LIMIT -1 OFFSET ?
                """, (retention_count,))
                runs_to_delete = cursor.fetchall()
                run_ids = [row['id'] for row in runs_to_delete]
                
                if run_ids:
                    placeholders = ','.join('?' * len(run_ids))
                    cursor.execute(f"""
                        DELETE FROM processing_history_details 
                        WHERE run_id IN ({placeholders})
                    """, run_ids)
                    
                    cursor.execute(f"""
                        DELETE FROM processing_history 
                        WHERE id IN ({placeholders})
                    """, run_ids)
                    
                    conn.commit()
                    deleted_count = len(run_ids)
                    logger.info(f"Cleanup: Deleted {deleted_count} processing runs, keeping most recent {retention_count}")
                    return deleted_count
            
            return 0
            
        except Exception as e:
            logger.error(f"Error cleaning up processing history: {e}")
            conn.rollback()
            raise
        finally:
            conn.close()
