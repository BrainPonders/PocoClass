"""
PocoClass Database
Simple SQLite database for user management and configuration
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
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
        self._load_key()
    
    def _load_key(self):
        """Load encryption key from environment - REQUIRED for production"""
        key = os.getenv('POCOCLASS_SECRET_KEY')
        
        if not key:
            # CRITICAL: Must set POCOCLASS_SECRET_KEY environment variable
            error_msg = (
                "CRITICAL: POCOCLASS_SECRET_KEY environment variable not set!\n"
                "Token encryption requires a persistent encryption key.\n\n"
                "To generate a secure key, run:\n"
                "  python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'\n\n"
                "Then add it to your environment:\n"
                "  export POCOCLASS_SECRET_KEY=<your-generated-key>\n\n"
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
    def __init__(self, db_path: str = "pococlass.db"):
        self.db_path = db_path
        self.encryption = TokenEncryption()
        self.init_database()
    
    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_database(self):
        """Initialize database tables"""
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
    
    def create_user(self, paperless_username: str, paperless_user_id: int, role: str = 'user') -> Optional[int]:
        """Create a new user"""
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
        """Create a new session for a user"""
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
        """Get session by token and refresh expiry on activity"""
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
        
        # Check if session expired
        if datetime.fromisoformat(session['expires_at']) < datetime.now():
            self.delete_session(session_token)
            return None
        
        # Decrypt the Paperless API token
        try:
            session['paperless_token'] = self.encryption.decrypt(session['paperless_token'])
        except Exception as e:
            logger.error(f"Failed to decrypt token for session {session_token}: {e}")
            self.delete_session(session_token)
            return None
        
        # Refresh session expiry on activity (activity-based timeout)
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
        """Sync correspondents from Paperless"""
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
        """Sync tags from Paperless"""
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        synced = 0
        
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
    
    def sync_custom_fields(self, custom_fields: List[Dict]) -> int:
        """Sync custom fields from Paperless"""
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
            ("DD-MM-YYYY", "Dash (-)", "e.g., 15-04-2024", 0, 1),
            ("DD-MMM-YYYY", "Dash (-)", "e.g., 15-Apr-2024", 0, 2),
            ("MM-DD-YYYY", "Dash (-)", "e.g., 04-15-2024", 0, 3),
            ("YYYY-MM-DD", "Dash (-)", "e.g., 2024-04-15", 0, 4),
            ("DD-MM-YY", "Dash (-)", "e.g., 15-04-24", 0, 5),
            ("MM-DD-YY", "Dash (-)", "e.g., 04-15-24", 0, 6),
            ("DD/MM/YYYY", "Slash (/)", "e.g., 15/04/2024", 0, 7),
            ("MM/DD/YYYY", "Slash (/)", "e.g., 04/15/2024", 0, 8),
            ("YYYY/MM/DD", "Slash (/)", "e.g., 2024/04/15", 0, 9),
            ("D/M/YYYY", "Slash (/)", "e.g., 5/4/2024", 0, 10),
            ("DD.MM.YYYY", "Dot (.)", "e.g., 15.04.2024", 0, 11),
            ("MM.DD.YYYY", "Dot (.)", "e.g., 04.15.2024", 0, 12),
            ("YYYY.MM.DD", "Dot (.)", "e.g., 2024.04.15", 0, 13),
            ("DD MMM YYYY", "Space / Text", "e.g., 15 Apr 2024", 0, 14),
            ("MMM DD, YYYY", "Space / Text", "e.g., April 15, 2024", 0, 15),
            ("MMMM DD, YYYY", "Space / Text", "e.g., April 15, 2024", 0, 16),
            ("DD MMMM YYYY", "Space / Text", "e.g., 15 April 2024", 0, 17),
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
        """Sync custom fields from cache into placeholder settings"""
        custom_fields = self.get_all_custom_fields()
        conn = self.get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
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
        """Add a log entry"""
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
        """Get logs with optional filtering"""
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
        """Update a processing run record"""
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
    
    def get_processing_history(self, limit: int = 100, status: str = None) -> List[Dict]:
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
            query += " LIMIT ?"
            params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
