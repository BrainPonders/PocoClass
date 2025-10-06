"""
POCOclass Database
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

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_path: str = "pococlass.db"):
        self.db_path = db_path
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
                pococlass_role TEXT NOT NULL DEFAULT 'user',
                created_at TEXT NOT NULL,
                last_login TEXT
            )
        """)
        
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
        
        conn.commit()
        conn.close()
        logger.info("Database initialized")
    
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
    
    def create_user(self, paperless_username: str, paperless_user_id: int, role: str = 'user') -> int:
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
    
    def update_last_login(self, user_id: int):
        """Update user's last login time"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", 
                      (datetime.now().isoformat(), user_id))
        conn.commit()
        conn.close()
    
    def list_users(self) -> List[Dict]:
        """List all users"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users ORDER BY created_at")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def create_session(self, user_id: int, paperless_token: str, duration_hours: int = 24) -> str:
        """Create a new session for a user"""
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(hours=duration_hours)
        
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO sessions (session_token, user_id, paperless_token, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?)
        """, (session_token, user_id, paperless_token, datetime.now().isoformat(), expires_at.isoformat()))
        conn.commit()
        conn.close()
        
        logger.info(f"Created session for user {user_id}")
        return session_token
    
    def get_session(self, session_token: str) -> Optional[Dict]:
        """Get session by token"""
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
        
        if datetime.fromisoformat(session['expires_at']) < datetime.now():
            self.delete_session(session_token)
            return None
        
        return session
    
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
        
        for cf in custom_fields:
            cursor.execute("""
                INSERT OR REPLACE INTO paperless_custom_fields (paperless_id, name, data_type, last_synced)
                VALUES (?, ?, ?, ?)
            """, (cf['id'], cf['name'], cf.get('data_type', 'string'), now))
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
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM paperless_custom_fields ORDER BY name")
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
