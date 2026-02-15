"""
PocoClass REST API — Flask Backend

Central REST API server for the PocoClass document classification system.
Connects a React frontend to a Paperless-ngx instance, providing endpoints for:

Route Groups:
  - Authentication & Setup    (/api/auth/*)           — Login, logout, initial setup wizard
  - User Management            (/api/users/*)          — Admin CRUD for PocoClass users
  - Settings & Configuration   (/api/settings/*)       — App settings, date formats, placeholders
  - Data Validation            (/api/validation/*)     — Mandatory field/tag checks in Paperless
  - Sync                       (/api/sync/*)           — Paperless entity cache synchronisation
  - Paperless Entity Cache     (/api/paperless/*)      — Cached correspondents, tags, doc types, custom fields
  - Rule Management            (/api/rules/*)          — CRUD + YAML generation for classification rules
  - Documents                  (/api/documents/*)      — Paperless document listing, preview proxy, OCR
  - Test & Execute             (/api/rules/test, */execute) — Rule testing and execution
  - Background Processing      (/api/background/*)     — Automated batch classification
  - System Token               (/api/system-token)     — API token management for external triggers
  - Logs                       (/api/logs)             — Application log retrieval
  - System Maintenance         (/api/system/*)         — App reset

Middleware:
  - require_auth               — Session-based authentication via Bearer token
  - require_admin              — Admin-only access guard
  - require_system_token_or_admin — Dual-auth for automation endpoints
  - proxy_to_vite              — Dev-mode request proxy to Vite frontend
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import yaml
from datetime import datetime
from pathlib import Path
import logging

from rule_loader import RuleLoader
from api_client import PaperlessAPIClient
from config import Config
from test_engine import TestEngine
from database import Database
from sync_service import SyncService
import requests
from functools import wraps

app = Flask(__name__, static_folder='frontend/dist', static_url_path='')

# Configure CORS with security restrictions
# Allow Replit domain and localhost for development
replit_domain = os.getenv('REPLIT_DEV_DOMAIN', '')
allowed_origins = [
    f'https://{replit_domain}',
    'http://localhost:5000',  # Vite dev server (custom port)
    'http://127.0.0.1:5000',
    'http://localhost:5173',  # Vite dev server (default port)
    'http://127.0.0.1:5173',
]

# Filter out empty origins (when REPLIT_DEV_DOMAIN is not set)
allowed_origins = [origin for origin in allowed_origins if origin and not origin.endswith('://')]

CORS(app, 
     origins=allowed_origins,
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'],
     supports_credentials=True,
     max_age=3600)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize components
config = Config()
db = Database()
rule_loader = RuleLoader('rules')
paperless_api = PaperlessAPIClient(config, db)
test_engine = TestEngine()
sync_service = SyncService(db)

# ---- Sync Freshness Helper ----

def should_sync(entity_type='all', max_age_minutes=60):
    """Check if sync is needed based on last sync time"""
    try:
        if entity_type == 'all':
            # Check if any entity type needs sync
            for entity in ['correspondents', 'tags', 'document_types', 'custom_fields', 'users']:
                last_sync = db.get_last_sync_time(entity)
                if not last_sync:
                    return True  # Never synced
                
                from datetime import datetime
                age_minutes = (datetime.now() - datetime.fromisoformat(last_sync)).total_seconds() / 60
                if age_minutes > max_age_minutes:
                    return True  # Data is stale
            return False  # All fresh
        else:
            # Check specific entity type
            last_sync = db.get_last_sync_time(entity_type)
            if not last_sync:
                return True
            
            from datetime import datetime
            age_minutes = (datetime.now() - datetime.fromisoformat(last_sync)).total_seconds() / 60
            return age_minutes > max_age_minutes
    except Exception as e:
        logger.error(f"Error checking sync status: {e}")
        return True  # Sync if uncertain

# ---- Authentication Decorators ----

def require_auth(f):
    """Verify a valid Bearer session token and attach user to request."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_token:
            return jsonify({'error': 'No session token provided'}), 401
        
        session = db.get_session(session_token)
        if not session:
            return jsonify({'error': 'Invalid or expired session'}), 401
        
        # Check if user is enabled
        user = db.get_user_by_id(session['user_id'])
        if not user or user.get('is_enabled', 1) == 0:
            return jsonify({'error': 'User account is disabled'}), 403
        
        request.current_user = session
        return f(*args, **kwargs)
    return decorated_function

def require_admin(f):
    """Require a valid session with admin role."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_token:
            return jsonify({'error': 'No session token provided'}), 401
        
        session = db.get_session(session_token)
        if not session or session['pococlass_role'] != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        request.current_user = session
        return f(*args, **kwargs)
    return decorated_function

def require_system_token_or_admin(f):
    """Decorator that accepts either a system API token OR admin session.
    
    For system token auth, use X-API-Key header.
    For session auth, use standard Authorization: Bearer header.
    System token auth sets request.is_system_token = True.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # First try system API token (X-API-Key header)
        system_token = request.headers.get('X-API-Key', '')
        if system_token:
            if db.validate_system_token(system_token):
                request.current_user = None  # No user session for system tokens
                request.is_system_token = True
                return f(*args, **kwargs)
            else:
                return jsonify({'error': 'Invalid system API token'}), 401
        
        # Fall back to session token (admin required)
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_token:
            return jsonify({'error': 'No authentication provided. Use X-API-Key header for system token or Authorization header for session token.'}), 401
        
        session = db.get_session(session_token)
        if not session:
            return jsonify({'error': 'Invalid or expired session'}), 401
        
        if session['pococlass_role'] != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Check if user is enabled
        user = db.get_user_by_id(session['user_id'])
        if not user or user.get('is_enabled', 1) == 0:
            return jsonify({'error': 'User account is disabled'}), 403
        
        request.current_user = session
        request.is_system_token = False
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/health')
def health_check():
    """Health check endpoint for Docker/container orchestration"""
    try:
        db_status = "ok" if db else "error"
        return jsonify({
            'status': 'healthy',
            'database': db_status,
            'version': '2.0'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

def normalize_paperless_url(url):
    """
    Normalize Paperless URL by removing trailing slashes and validating scheme
    Args:
        url: The URL to normalize
    Returns:
        Normalized URL
    Raises:
        ValueError: If URL is invalid
    """
    if not url:
        raise ValueError("Paperless URL cannot be empty")
    
    url = url.strip()
    
    # Ensure URL has a scheme
    if not url.startswith('http://') and not url.startswith('https://'):
        raise ValueError("Paperless URL must start with http:// or https://")
    
    # Remove trailing slashes
    while url.endswith('/'):
        url = url[:-1]
    
    # Basic validation - URL should have at least scheme://domain
    if url.count('/') < 2:
        raise ValueError("Invalid Paperless URL format")
    
    return url

def fetch_all_users_paginated(paperless_url, token, username):
    """
    Fetch all users from Paperless with pagination support
    Returns: (user_info, user_id, is_superuser) or (None, None, None) if not found
    """
    # Try /api/users/me/ first (most efficient - Paperless-ngx modern)
    try:
        user_response = requests.get(
            f'{paperless_url}/api/users/me/',
            headers={'Authorization': f'Token {token}'},
            timeout=10
        )
        
        if user_response.status_code == 200:
            user_info = user_response.json()
            user_id = user_info.get('id')
            is_superuser = user_info.get('is_superuser', False)
            logger.info("Found user via /api/users/me/ endpoint")
            return user_info, user_id, is_superuser
        else:
            logger.warning(f"/api/users/me/ returned {user_response.status_code}, trying paginated user list")
    except Exception as e:
        logger.warning(f"Error calling /api/users/me/: {e}")
    
    # Fallback: paginate through ALL users to find the current user
    try:
        page = 1
        page_size = 25  # Paperless default page size
        
        while True:
            users_response = requests.get(
                f'{paperless_url}/api/users/',
                headers={'Authorization': f'Token {token}'},
                params={'page': page, 'page_size': page_size},
                timeout=10
            )
            
            if users_response.status_code != 200:
                logger.error(f"/api/users/ returned {users_response.status_code}")
                break
            
            users_data = users_response.json()
            
            # Handle both list and paginated response formats
            if isinstance(users_data, list):
                users = users_data
                has_next = False
            elif isinstance(users_data, dict):
                users = users_data.get('results', [])
                # Check if there are more pages
                has_next = users_data.get('next') is not None
            else:
                logger.error(f"Unexpected API response format: {type(users_data)}")
                break
            
            # Search for user in current page
            for user in users:
                if user.get('username') == username:
                    user_info = user
                    user_id = user.get('id')
                    is_superuser = user.get('is_superuser', False)
                    logger.info(f"Found user '{username}' via /api/users/ pagination (page {page})")
                    return user_info, user_id, is_superuser
            
            # If no more pages, stop
            if not has_next:
                break
            
            page += 1
            
            # Safety limit to prevent infinite loops
            if page > 100:
                logger.error("Exceeded maximum page limit (100) while searching for user")
                break
    
    except Exception as e:
        logger.error(f"Error during paginated user lookup: {e}")
    
    # User not found in Paperless
    return None, None, None

# ---- Authentication & Setup Routes ----

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    """Check if setup is completed and get system status"""
    try:
        is_setup = db.is_setup_completed()
        paperless_url = db.get_config('paperless_url') if is_setup else None
        
        return jsonify({
            'setupCompleted': is_setup,
            'paperlessUrl': paperless_url
        })
    except Exception as e:
        logger.error(f"Error checking auth status: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/setup', methods=['POST'])
def setup():
    """Initial setup - connect to Paperless and create first admin"""
    try:
        data = request.json
        paperless_url = data.get('paperlessUrl')
        username = data.get('username')
        password = data.get('password')
        
        if not all([paperless_url, username, password]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        if db.is_setup_completed():
            return jsonify({'error': 'Setup already completed'}), 400
        
        # Normalize Paperless URL
        try:
            paperless_url = normalize_paperless_url(paperless_url)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        
        # Authenticate with Paperless to get user info and token
        try:
            auth_response = requests.post(
                f'{paperless_url}/api/token/',
                json={'username': username, 'password': password},
                timeout=10
            )
            
            if auth_response.status_code != 200:
                return jsonify({'error': 'Invalid Paperless credentials'}), 401
            
            paperless_token = auth_response.json().get('token')
            
            # Get user info from Paperless with proper pagination
            user_info, paperless_user_id, is_superuser = fetch_all_users_paginated(
                paperless_url, paperless_token, username
            )
            
            # Fail closed if user not found - do not create synthetic IDs
            if not paperless_user_id:
                logger.error(
                    f"Could not retrieve user ID from Paperless for user '{username}'. "
                    f"This may indicate Paperless API compatibility issues or network problems."
                )
                return jsonify({
                    'error': 'Failed to retrieve user information from Paperless. '
                             'Please ensure your Paperless-ngx instance is accessible and up to date.'
                }), 500
            
            # Create first admin user
            role = 'admin' if is_superuser else 'user'
            user_id = db.create_user(username, paperless_user_id, role)
            
            # Store Paperless URL (but don't mark setup as complete yet)
            # Setup will be completed in step 3 after validation
            db.set_config('paperless_url', paperless_url)
            
            # Create session
            session_token = db.create_session(user_id, paperless_token)
            
            # Initial sync on setup (without auto-creating mandatory items)
            try:
                logger.info("Performing initial sync of Paperless data...")
                sync_service.sync_all(paperless_token, paperless_url, ensure_mandatory=False)
                logger.info("Initial sync completed successfully")
            except Exception as e:
                logger.warning(f"Initial sync failed (non-critical): {e}")
            
            logger.info(f"Initial setup (step 2) completed by user: {username}, awaiting validation (step 3)")
            
            return jsonify({
                'success': True,
                'sessionToken': session_token,
                'user': {
                    'id': user_id,
                    'username': username,
                    'role': role
                }
            })
            
        except requests.RequestException as e:
            logger.error(f"Error connecting to Paperless: {e}")
            return jsonify({'error': f'Failed to connect to Paperless: {str(e)}'}), 500
            
    except Exception as e:
        logger.error(f"Error during setup: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/complete-setup', methods=['POST'])
@require_auth
def complete_setup_endpoint():
    """Mark setup as completed after step 3 validation"""
    try:
        data = request.json or {}
        skip_missing_data = data.get('skipMissingData', False)
        
        paperless_url = db.get_config('paperless_url')
        if not paperless_url:
            return jsonify({'error': 'Paperless URL not configured'}), 400
        
        if skip_missing_data:
            logger.warning("Setup completed with missing mandatory data - user skipped creation")
        
        db.complete_setup(paperless_url)
        logger.info("Setup completed successfully")
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Error completing setup: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login with Paperless credentials"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not all([username, password]):
            return jsonify({'error': 'Missing username or password'}), 400
        
        if not db.is_setup_completed():
            return jsonify({'error': 'Setup not completed'}), 400
        
        paperless_url = db.get_config('paperless_url')
        
        # Authenticate with Paperless
        try:
            auth_response = requests.post(
                f'{paperless_url}/api/token/',
                json={'username': username, 'password': password},
                timeout=10
            )
            
            if auth_response.status_code != 200:
                # Log failed login attempt
                db.add_log(
                    log_type='system',
                    level='warning',
                    message=f'Failed login attempt for user: {username}',
                    source='authentication'
                )
                return jsonify({'error': 'Invalid credentials'}), 401
            
            paperless_token = auth_response.json().get('token')
            
            # Get user info from Paperless with proper pagination
            user_info, paperless_user_id, is_superuser = fetch_all_users_paginated(
                paperless_url, paperless_token, username
            )
            
            # Fail closed if user not found - do not create synthetic IDs
            if not paperless_user_id:
                logger.error(
                    f"Could not retrieve user ID from Paperless for user '{username}'. "
                    f"This may indicate Paperless API compatibility issues or network problems."
                )
                return jsonify({
                    'error': 'Failed to retrieve user information from Paperless. '
                             'Please ensure your Paperless-ngx instance is accessible and up to date.'
                }), 500
            
            # Get or create user in PocoClass database
            pococlass_user = db.get_user_by_paperless_id(paperless_user_id)
            if not pococlass_user:
                # Create new user with default 'user' role
                user_id = db.create_user(username, paperless_user_id, 'user')
                if not user_id:
                    logger.error("Failed to create user, user_id is None")
                    return jsonify({'error': 'Failed to create user'}), 500
                pococlass_user = db.get_user_by_id(user_id)
                if not pococlass_user:
                    logger.error(f"Failed to retrieve newly created user with id {user_id}")
                    return jsonify({'error': 'Failed to retrieve user'}), 500
            else:
                user_id = pococlass_user['id']
                db.update_last_login(user_id)
            
            # Create session
            session_token = db.create_session(user_id, paperless_token)
            
            # Auto-sync on login if data is stale (>60 minutes old)
            try:
                if should_sync():
                    logger.info(f"Auto-syncing Paperless data on login for user: {username}")
                    sync_service.sync_all(paperless_token, paperless_url)
                else:
                    logger.info(f"Skipping auto-sync - data is fresh (user: {username})")
            except Exception as e:
                logger.warning(f"Auto-sync on login failed (non-critical): {e}")
            
            logger.info(f"User logged in: {username}")
            
            # Log successful login to database
            db.add_log(
                log_type='system',
                level='info',
                message=f'User logged in: {username}',
                source='authentication'
            )
            
            return jsonify({
                'success': True,
                'sessionToken': session_token,
                'user': {
                    'id': user_id,
                    'username': username,
                    'role': pococlass_user['pococlass_role']
                }
            })
            
        except requests.RequestException as e:
            logger.error(f"Error authenticating with Paperless: {e}")
            return jsonify({'error': 'Failed to authenticate with Paperless'}), 500
            
    except Exception as e:
        logger.error(f"Error during login: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def logout():
    """Logout and destroy session"""
    try:
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        db.delete_session(session_token)
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error during logout: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_current_user():
    """Get current user session"""
    try:
        user = request.current_user
        return jsonify({
            'id': user['user_id'],
            'username': user['paperless_username'],
            'role': user['pococlass_role'],
            'paperlessUserId': user['paperless_user_id']
        })
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        return jsonify({'error': str(e)}), 500

# ---- User Management Routes ----

@app.route('/api/users', methods=['GET'])
@require_admin
def list_all_users():
    """List all users with Paperless groups (admin only)"""
    try:
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        headers = {
            'Authorization': f'Token {session["paperless_token"]}',
            'Content-Type': 'application/json'
        }
        
        # Fetch Paperless users and groups
        users_response = requests.get(f"{paperless_url}/api/users/", headers=headers, timeout=30)
        users_response.raise_for_status()
        paperless_data = users_response.json()
        
        groups_response = requests.get(f"{paperless_url}/api/groups/", headers=headers, timeout=30)
        groups_response.raise_for_status()
        groups_data = groups_response.json()
        
        # Build group ID -> name mapping
        group_map = {}
        if isinstance(groups_data, list):
            group_map = {g['id']: g['name'] for g in groups_data}
        elif isinstance(groups_data, dict) and 'results' in groups_data:
            group_map = {g['id']: g['name'] for g in groups_data['results']}
        
        # Handle both list and paginated response formats
        if isinstance(paperless_data, list):
            paperless_users = paperless_data
        elif isinstance(paperless_data, dict) and 'results' in paperless_data:
            paperless_users = paperless_data['results']
        else:
            paperless_users = []
        
        # Get PocoClass users
        pococlass_users = db.list_users()
        paperless_id_map = {u['paperless_user_id']: u for u in pococlass_users}
        
        # Merge data with Paperless groups
        for user in pococlass_users:
            paperless_user = next((p for p in paperless_users if p['id'] == user['paperless_user_id']), None)
            if paperless_user:
                groups = paperless_user.get('groups', [])
                group_names = []
                for g in groups:
                    if isinstance(g, dict):
                        group_names.append(g['name'])
                    elif isinstance(g, int):
                        group_names.append(group_map.get(g, f"Group {g}"))
                user['groups'] = group_names if group_names else []
            else:
                user['groups'] = []
        
        return jsonify(pococlass_users)
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>/role', methods=['PUT'])
@require_admin
def update_user_role_endpoint(user_id):
    """Update user role (admin only)"""
    try:
        data = request.json
        role = data.get('role')
        
        if role not in ['admin', 'user']:
            return jsonify({'error': 'Invalid role'}), 400
        
        db.update_user_role(user_id, role)
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error updating user role: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>/enable', methods=['PUT'])
@require_admin
def enable_user_endpoint(user_id):
    """Enable user account (admin only)"""
    try:
        # Get user to check paperless_user_id
        users = db.list_users()
        user = next((u for u in users if u['id'] == user_id), None)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Enable using paperless_user_id
        db.enable_user(user['paperless_user_id'])
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error enabling user: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>/disable', methods=['PUT'])
@require_admin
def disable_user_endpoint(user_id):
    """Disable user account (admin only)"""
    try:
        # Prevent disabling yourself
        if user_id == request.current_user['user_id']:
            return jsonify({'error': 'Cannot disable your own account'}), 400
        
        # Get user to check paperless_user_id
        users = db.list_users()
        user = next((u for u in users if u['id'] == user_id), None)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Disable using paperless_user_id
        db.disable_user(user['paperless_user_id'])
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error disabling user: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/all-paperless', methods=['GET'])
@require_admin
def get_all_paperless_users():
    """Get all Paperless users with their PocoClass status (admin only)"""
    try:
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        
        # Fetch all Paperless users
        headers = {
            'Authorization': f'Token {session["paperless_token"]}',
            'Content-Type': 'application/json'
        }
        # Fetch users from Paperless
        response = requests.get(f"{paperless_url}/api/users/", headers=headers, timeout=30)
        response.raise_for_status()
        paperless_data = response.json()
        
        # Handle both list and paginated response formats
        if isinstance(paperless_data, list):
            paperless_users = paperless_data
        elif isinstance(paperless_data, dict) and 'results' in paperless_data:
            paperless_users = paperless_data['results']
        else:
            logger.error(f"Unexpected Paperless API response format: {type(paperless_data)}")
            return jsonify({'error': 'Unexpected API response format'}), 500
        
        # Fetch groups from Paperless to map IDs to names
        groups_response = requests.get(f"{paperless_url}/api/groups/", headers=headers, timeout=30)
        groups_response.raise_for_status()
        groups_data = groups_response.json()
        
        # Build group ID -> name mapping
        group_map = {}
        if isinstance(groups_data, list):
            group_map = {g['id']: g['name'] for g in groups_data}
        elif isinstance(groups_data, dict) and 'results' in groups_data:
            group_map = {g['id']: g['name'] for g in groups_data['results']}
        
        # Get PocoClass users
        pococlass_users = db.list_users()
        pococlass_map = {u['paperless_user_id']: u for u in pococlass_users}
        
        # Merge data
        result = []
        for paperless_user in paperless_users:
            # Log if username is missing
            if not paperless_user.get('username'):
                logger.warning(f"User ID {paperless_user.get('id')} is missing username in Paperless API response")
            
            pococlass_user = pococlass_map.get(paperless_user['id'])
            
            # Get groups - Paperless may return IDs or objects
            groups = paperless_user.get('groups', [])
            
            # Convert group IDs to names using the group_map
            group_names = []
            for g in groups:
                if isinstance(g, dict):
                    # Full object with name
                    group_names.append(g['name'])
                elif isinstance(g, int):
                    # Just ID, look up name
                    group_names.append(group_map.get(g, f"Group {g}"))
                else:
                    group_names.append(str(g))
            
            result.append({
                'paperless_id': paperless_user.get('id'),
                'paperless_username': paperless_user.get('username', f"user_{paperless_user.get('id', 'unknown')}"),
                'paperless_groups': group_names,
                'is_active': paperless_user.get('is_active', False),
                'is_staff': paperless_user.get('is_staff', False),
                'is_superuser': paperless_user.get('is_superuser', False),
                'is_registered': pococlass_user is not None,
                'is_enabled': pococlass_user.get('is_enabled', False) if pococlass_user else False,
                'pococlass_id': pococlass_user.get('id') if pococlass_user else None,
                'pococlass_role': pococlass_user.get('role') if pococlass_user else None,
                'last_login': pococlass_user.get('last_login') if pococlass_user else None
            })
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error fetching Paperless users: {e}")
        return jsonify({'error': str(e)}), 500

# ---- Settings Batch Route ----

@app.route('/api/settings/batch', methods=['GET'])
@require_auth
def get_settings_batch():
    """Get all settings data in one request to reduce lag"""
    try:
        is_admin = request.current_user['pococlass_role'] == 'admin'
        
        # Build response with all data
        response = {
            'appSettings': {},
            'dateFormats': [],
            'placeholders': [],
            'paperlessConfig': {},
            'syncStatus': {},
            'syncHistory': []
        }
        
        # App settings
        try:
            app_settings = db.get_all_app_settings()
            response['appSettings'] = app_settings
        except Exception as e:
            logger.error(f"Error loading app settings: {e}")
        
        # Date formats
        try:
            date_formats = db.get_all_date_formats()
            response['dateFormats'] = date_formats
        except Exception as e:
            logger.error(f"Error loading date formats: {e}")
        
        # Placeholders
        try:
            placeholders = db.get_all_placeholder_settings()
            response['placeholders'] = placeholders
        except Exception as e:
            logger.error(f"Error loading placeholders: {e}")
        
        # Paperless config
        try:
            paperless_url = db.get_config('paperless_url')
            response['paperlessConfig'] = {'paperless_url': paperless_url}
        except Exception as e:
            logger.error(f"Error loading paperless config: {e}")
        
        # Sync status and history (admin only)
        if is_admin:
            try:
                response['syncStatus'] = sync_service.get_sync_status()
            except Exception as e:
                logger.error(f"Error loading sync status: {e}")
            
            try:
                limit = int(request.args.get('history_limit', 4))
                history = db.get_sync_history(limit)
                response['syncHistory'] = history
            except Exception as e:
                logger.error(f"Error loading sync history: {e}")
            
            try:
                users = list_all_users()
                if isinstance(users, tuple):
                    response['users'] = []
                else:
                    response['users'] = users.get_json()
            except Exception as e:
                logger.error(f"Error loading users: {e}")
                response['users'] = []
        
        return jsonify(response)
    except Exception as e:
        logger.error(f"Error in settings batch: {e}")
        return jsonify({'error': str(e)}), 500

# ---- Sync Routes ----

@app.route('/api/sync', methods=['POST'])
@require_admin
def trigger_sync():
    """Trigger a full sync of Paperless data (admin only) - does NOT auto-create mandatory items"""
    try:
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        
        results = sync_service.sync_all(session['paperless_token'], paperless_url, ensure_mandatory=False)
        
        return jsonify({
            'success': True,
            'results': results
        })
    except Exception as e:
        logger.error(f"Sync error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/sync/status', methods=['GET'])
@require_auth
def get_sync_status():
    """Get current sync status"""
    try:
        status = sync_service.get_sync_status()
        return jsonify(status)
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/sync/history', methods=['GET'])
@require_admin
def get_sync_history():
    """Get sync history (admin only)"""
    try:
        limit = request.args.get('limit', 10, type=int)
        history = db.get_sync_history(limit)
        return jsonify(history)
    except Exception as e:
        logger.error(f"Error getting sync history: {e}")
        return jsonify({'error': str(e)}), 500

# ---- Paperless Entity Cache Routes ----

@app.route('/api/paperless/correspondents', methods=['GET'])
@require_auth
def get_cached_correspondents():
    """Get cached correspondents"""
    try:
        correspondents = db.get_all_correspondents()
        return jsonify(correspondents)
    except Exception as e:
        logger.error(f"Error getting correspondents: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/paperless/tags', methods=['GET'])
@require_auth
def get_cached_tags():
    """Get cached tags"""
    try:
        tags = db.get_all_tags()
        return jsonify(tags)
    except Exception as e:
        logger.error(f"Error getting tags: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/paperless/document-types', methods=['GET'])
@require_auth
def get_cached_document_types():
    """Get cached document types"""
    try:
        doc_types = db.get_all_document_types()
        return jsonify(doc_types)
    except Exception as e:
        logger.error(f"Error getting document types: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/paperless/custom-fields', methods=['GET'])
@require_auth
def get_cached_custom_fields():
    """Get cached custom fields"""
    try:
        custom_fields = db.get_all_custom_fields()
        return jsonify(custom_fields)
    except Exception as e:
        logger.error(f"Error getting custom fields: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/paperless/custom-fields', methods=['POST'])
@require_admin
def create_custom_field():
    """Create a custom field in Paperless (admin only, POCO fields only)"""
    try:
        data = request.json
        field_name = data.get('name')
        data_type = data.get('data_type', 'integer')
        
        # Security: Only allow creating POCO fields
        if field_name not in ['POCO Score', 'POCO OCR']:
            return jsonify({'error': 'Only POCO Score and POCO OCR fields can be created via this endpoint'}), 403
        
        # Validate data type
        if data_type != 'integer':
            return jsonify({'error': 'POCO fields must be integer type'}), 400
        
        # Get Paperless credentials
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        
        # Create field in Paperless via API
        config = Config()
        config.paperless_token = session['paperless_token']
        config.paperless_url = paperless_url
        api_client = PaperlessAPIClient(config)
        
        # Prepare payload
        payload = {
            'name': field_name,
            'data_type': data_type
        }
        
        # Make API call to create custom field
        response = api_client.session.post(
            f"{paperless_url}/api/custom_fields/",
            json=payload
        )
        
        if response.status_code == 201:
            # Field created successfully, trigger sync
            results = sync_service.sync_all(session['paperless_token'], paperless_url)
            
            return jsonify({
                'success': True,
                'field': response.json(),
                'poco_fields_status': results.get('poco_fields_status', {})
            }), 201
        elif response.status_code == 400:
            error_data = response.json()
            return jsonify({'error': error_data.get('name', ['Field already exists'])[0]}), 400
        else:
            response.raise_for_status()
            
    except Exception as e:
        logger.error(f"Error creating custom field: {e}")
        return jsonify({'error': str(e)}), 500

# ---- Settings Routes ----

@app.route('/api/settings', methods=['GET'])
@require_auth
def get_settings():
    """Get all settings"""
    try:
        category = request.args.get('category')
        settings = db.get_all_settings(category)
        return jsonify(settings)
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/<key>', methods=['PUT'])
@require_admin
def update_setting(key):
    """Update a setting (admin only)"""
    try:
        data = request.json
        value = data.get('value')
        category = data.get('category', 'general')
        description = data.get('description', '')
        
        db.set_setting(key, value, category, description)
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error updating setting: {e}")
        return jsonify({'error': str(e)}), 500

# ---- App Settings Routes ----

@app.route('/api/settings/app', methods=['GET'])
@require_auth
def get_app_settings():
    """Get all app settings"""
    try:
        settings = db.get_all_app_settings()
        return jsonify(settings)
    except Exception as e:
        logger.error(f"Error getting app settings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/app', methods=['POST'])
@require_auth
def update_app_settings():
    """Update app settings"""
    try:
        data = request.json
        for key, value in data.items():
            db.set_app_setting(key, value)
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error updating app settings: {e}")
        return jsonify({'error': str(e)}), 500

# ---- Date Format Settings Routes ----

@app.route('/api/settings/date-formats', methods=['GET'])
@require_auth
def get_date_formats():
    """Get all date formats"""
    try:
        formats = db.get_all_date_formats()
        return jsonify(formats)
    except Exception as e:
        logger.error(f"Error getting date formats: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/date-formats/selected', methods=['GET'])
@require_auth
def get_selected_date_formats():
    """Get selected date formats"""
    try:
        formats = db.get_selected_date_formats()
        return jsonify(formats)
    except Exception as e:
        logger.error(f"Error getting selected date formats: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/date-formats/<path:format_pattern>', methods=['PUT'])
@require_auth
def update_date_format_selection(format_pattern):
    """Update date format selection"""
    try:
        data = request.json
        is_selected = data.get('is_selected', False)
        db.set_date_format_selection(format_pattern, is_selected)
        return jsonify({'success': True})
    except ValueError as e:
        # Handle validation errors (e.g., cannot deselect last format)
        logger.warning(f"Date format selection validation failed: {e}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error updating date format selection: {e}")
        return jsonify({'error': str(e)}), 500

# ---- Placeholder Settings Routes ----

@app.route('/api/settings/placeholders', methods=['GET'])
@require_auth
def get_placeholder_settings():
    """Get all placeholder settings"""
    try:
        # Sync custom field placeholders first
        db.sync_custom_field_placeholders()
        placeholders = db.get_all_placeholder_settings()
        return jsonify(placeholders)
    except Exception as e:
        logger.error(f"Error getting placeholder settings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/placeholders/<path:placeholder_name>', methods=['PUT'])
@require_auth
def update_placeholder_visibility(placeholder_name):
    """Update placeholder visibility mode"""
    try:
        data = request.json
        visibility_mode = data.get('visibility_mode')
        if visibility_mode not in ['disabled', 'predefined', 'dynamic', 'both']:
            return jsonify({'error': 'Invalid visibility mode'}), 400
        
        db.set_placeholder_visibility(placeholder_name, visibility_mode)
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error updating placeholder visibility: {e}")
        return jsonify({'error': str(e)}), 500

# ---- Paperless Configuration Routes ----

@app.route('/api/settings/paperless-config', methods=['GET'])
@require_auth
def get_paperless_config():
    """Get Paperless configuration"""
    try:
        paperless_url = db.get_config('paperless_url')
        return jsonify({'paperless_url': paperless_url})
    except Exception as e:
        logger.error(f"Error getting Paperless config: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/paperless-config', methods=['PUT'])
@require_admin
def update_paperless_config():
    """Update Paperless configuration (admin only)"""
    try:
        data = request.json
        paperless_url = data.get('paperless_url')
        if paperless_url:
            # Normalize URL before saving (remove trailing slashes, validate scheme)
            try:
                paperless_url = normalize_paperless_url(paperless_url)
            except ValueError as e:
                return jsonify({'error': str(e)}), 400
            
            db.set_config('paperless_url', paperless_url)
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error updating Paperless config: {e}")
        return jsonify({'error': str(e)}), 500

# ---- POCO OCR Field Configuration Routes ----

@app.route('/api/settings/poco-ocr-enabled', methods=['GET'])
@require_auth
def get_poco_ocr_enabled():
    """Get POCO OCR enabled status"""
    try:
        enabled = db.get_config('poco_ocr_enabled') == 'true'
        return jsonify({'enabled': enabled})
    except Exception as e:
        logger.error(f"Error getting POCO OCR enabled status: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/poco-ocr-enabled', methods=['PUT'])
@require_admin
def update_poco_ocr_enabled():
    """Update POCO OCR enabled status and instantly create field if enabling (admin only)"""
    try:
        data = request.json
        enabled = data.get('enabled', False)
        db.set_config('poco_ocr_enabled', 'true' if enabled else 'false')
        
        # If enabling, create field if it doesn't exist
        if enabled:
            session = request.current_user
            paperless_url = db.get_config('paperless_url')
            
            config = Config()
            config.paperless_token = session['paperless_token']
            config.paperless_url = paperless_url
            api_client = PaperlessAPIClient(config, db)
            
            poco_ocr_exists = api_client.check_custom_field_exists('POCO OCR') is not None
            
            if not poco_ocr_exists:
                try:
                    api_client.create_custom_field('POCO OCR', 'string')
                    logger.info("Created POCO OCR custom field")
                    return jsonify({
                        'success': True,
                        'enabled': enabled,
                        'field_created': True,
                        'message': 'POCO OCR field has been created successfully in Paperless-ngx'
                    })
                except Exception as e:
                    logger.error(f"Failed to create POCO OCR field: {e}")
                    return jsonify({
                        'success': False,
                        'error': f'Failed to create POCO OCR field: {str(e)}'
                    }), 500
            
            return jsonify({
                'success': True,
                'enabled': enabled,
                'field_created': False,
                'message': 'POCO OCR field already exists'
            })
        
        return jsonify({
            'success': True,
            'enabled': enabled,
            'message': 'POCO OCR disabled. Note: The POCO OCR custom field will NOT be removed from Paperless-ngx.'
        })
    except Exception as e:
        logger.error(f"Error updating POCO OCR enabled status: {e}")
        return jsonify({'error': str(e)}), 500

# ---- Data Validation Routes ----

@app.route('/api/validation/mandatory-data', methods=['GET'])
@require_auth
def check_mandatory_data():
    """Check for mandatory custom fields and tags in Paperless-ngx"""
    try:
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        
        config = Config()
        config.paperless_token = session['paperless_token']
        config.paperless_url = paperless_url
        api_client = PaperlessAPIClient(config, db)
        
        # Force a fresh sync to ensure cache is up-to-date before checking
        # Use ensure_mandatory=False to prevent auto-creation during validation
        try:
            sync_service.sync_all(session['paperless_token'], paperless_url, ensure_mandatory=False)
            logger.info("Synced data before mandatory data check (without auto-creation)")
        except Exception as e:
            logger.warning(f"Sync failed before validation (non-critical): {e}")
        
        # Check if POCO OCR is enabled
        poco_ocr_enabled = db.get_config('poco_ocr_enabled') == 'true'
        
        # POCO Score is always required; POCO OCR only if enabled
        required_fields = ['POCO Score']
        if poco_ocr_enabled:
            required_fields.append('POCO OCR')
        
        # Use check_custom_field_exists to avoid auto-creating during validation
        missing_fields = []
        for field_name in required_fields:
            field_id = api_client.check_custom_field_exists(field_name)
            if not field_id:
                missing_fields.append(field_name)
        
        # Required tags - use check_tag_exists to avoid auto-creating during validation
        required_tags = ['POCO+', 'POCO-', 'NEW']
        missing_tags = []
        
        for tag_name in required_tags:
            tag_id = api_client.check_tag_exists(tag_name)
            if not tag_id:
                missing_tags.append(tag_name)
        
        # Check if all mandatory data exists
        has_all_data = len(missing_fields) == 0 and len(missing_tags) == 0
        
        # Check field existence for UI display (use check methods to avoid auto-creating)
        poco_score_exists = api_client.check_custom_field_exists('POCO Score') is not None
        poco_ocr_exists = api_client.check_custom_field_exists('POCO OCR') is not None
        
        return jsonify({
            'valid': has_all_data,
            'missing_fields': missing_fields,
            'missing_tags': missing_tags,
            'poco_ocr_enabled': poco_ocr_enabled,
            'fields': {
                'poco_score': poco_score_exists,
                'poco_ocr': poco_ocr_exists
            },
            'tags': {
                'poco_plus': 'POCO+' not in missing_tags,
                'poco_minus': 'POCO-' not in missing_tags,
                'new': 'NEW' not in missing_tags
            }
        })
    except Exception as e:
        logger.error(f"Error checking mandatory data: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/validation/fix-mandatory-data', methods=['POST'])
@require_admin
def fix_mandatory_data():
    """Create missing mandatory custom fields and tags (admin only)"""
    try:
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        
        config = Config()
        config.paperless_token = session['paperless_token']
        config.paperless_url = paperless_url
        api_client = PaperlessAPIClient(config, db)
        
        created_fields = []
        created_tags = []
        errors = []
        
        # Check if POCO OCR is enabled
        poco_ocr_enabled = db.get_config('poco_ocr_enabled') == 'true'
        
        # POCO Score is always required; POCO OCR only if enabled
        required_fields = [{'name': 'POCO Score', 'data_type': 'string'}]
        if poco_ocr_enabled:
            required_fields.append({'name': 'POCO OCR', 'data_type': 'string'})
        
        for field_spec in required_fields:
            field_name = field_spec['name']
            if not api_client.check_custom_field_exists(field_name):
                try:
                    field_id = api_client.get_custom_field_id(field_name)
                    if field_id:
                        created_fields.append(field_name)
                    else:
                        errors.append(f"Failed to create field: {field_name}")
                except Exception as e:
                    errors.append(f"Error creating field {field_name}: {str(e)}")
        
        # Create missing tags
        required_tags = [
            {'name': 'POCO+'},
            {'name': 'POCO-'},
            {'name': 'NEW'}
        ]
        
        for tag_spec in required_tags:
            tag_name = tag_spec['name']
            if not api_client.check_tag_exists(tag_name):
                try:
                    tag_id = api_client.get_tag_id(tag_name)
                    if tag_id:
                        created_tags.append(tag_name)
                    else:
                        errors.append(f"Failed to create tag: {tag_name}")
                except Exception as e:
                    errors.append(f"Error creating tag {tag_name}: {str(e)}")
        
        # Force sync to update cache (without auto-creating again)
        try:
            paperless_url = db.get_config('paperless_url')
            paperless_token = session['paperless_token']
            sync_service.sync_all(paperless_token, paperless_url, ensure_mandatory=False)
        except Exception as e:
            logger.warning(f"Sync failed after creating mandatory data: {e}")
        
        return jsonify({
            'success': len(errors) == 0,
            'created_fields': created_fields,
            'created_tags': created_tags,
            'errors': errors
        })
    except Exception as e:
        logger.error(f"Error fixing mandatory data: {e}")
        return jsonify({'error': str(e)}), 500

# ---- Middleware & Static Serving ----

@app.before_request
def proxy_to_vite():
    """Proxy non-API requests to the Vite dev server in development mode."""
    # Only proxy non-API requests in development mode
    if request.path.startswith('/api/'):
        return None
    
    if os.getenv('FLASK_ENV') == 'development' or os.getenv('FLASK_DEBUG') == '1':
        try:
            # Proxy all non-API requests to Vite dev server
            vite_url = f'http://localhost:5000{request.full_path.rstrip("?")}'
            response = requests.request(
                method=request.method,
                url=vite_url,
                headers={k: v for k, v in request.headers if k.lower() != 'host'},
                data=request.get_data(),
                cookies=request.cookies,
                allow_redirects=False,
                timeout=5
            )
            
            # Build response
            excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
            headers = [(k, v) for k, v in response.raw.headers.items() if k.lower() not in excluded_headers]
            
            return response.content, response.status_code, headers
        except requests.exceptions.RequestException as e:
            logger.warning(f"Vite proxy failed: {e}")
            return None
    
    return None

@app.route('/')
@app.route('/<path:path>')
def serve_react_app(path=''):
    """Serve the React SPA; falls back to index.html for client-side routing."""
    static_folder = app.static_folder or 'frontend/dist'
    if path and os.path.exists(os.path.join(static_folder, path)):
        return send_from_directory(static_folder, path)
    return send_from_directory(static_folder, 'index.html')

# ---- Rule Management Routes ----

@app.route('/api/rules', methods=['GET'])
def list_rules():
    """List all rules"""
    try:
        rules = rule_loader.load_all_rules()
        order_by = request.args.get('order_by', '-created_date')
        
        # Convert rules to frontend format (same as get_rule endpoint)
        rules_list = []
        for rule_id, rule_data in rules.items():
            # Convert to frontend format to ensure consistency with get_rule endpoint
            frontend_rule = convert_backend_to_frontend(rule_data, rule_id)
            # Add id and created_date for list display
            frontend_rule['id'] = rule_id
            frontend_rule['created_date'] = rule_data.get('created_date', datetime.now().isoformat())
            rules_list.append(frontend_rule)
        
        # Sort rules (convert snake_case to camelCase for sorting)
        sort_field_map = {
            'created_date': 'created_date',
            'rule_name': 'ruleName',
            'status': 'status',
            'threshold': 'threshold'
        }
        
        sort_field = order_by.lstrip('-')
        sort_field = sort_field_map.get(sort_field, sort_field)
        reverse = order_by.startswith('-')
        
        rules_list.sort(key=lambda x: x.get(sort_field, ''), reverse=reverse)
        
        return jsonify(rules_list)
    except Exception as e:
        logger.error(f"Error listing rules: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rules/errors', methods=['GET'])
def get_rule_errors():
    """Get rule loading errors"""
    try:
        errors = rule_loader.get_load_errors()
        has_errors = rule_loader.has_load_errors()
        
        return jsonify({
            'has_errors': has_errors,
            'errors': errors,
            'error_count': len(errors)
        })
    except Exception as e:
        logger.error(f"Error getting rule errors: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rules/<rule_id>', methods=['GET'])
def get_rule(rule_id):
    """Get a single rule"""
    try:
        # Load single rule from file
        rule_file = Path('rules') / f'{rule_id}.yaml'
        rule_data = rule_loader.load_rule_file(rule_file)
        if not rule_data:
            return jsonify({'error': 'Rule not found'}), 404
        
        # Convert to frontend format
        frontend_rule = convert_backend_to_frontend(rule_data, rule_id)
        return jsonify(frontend_rule)
    except Exception as e:
        logger.error(f"Error getting rule {rule_id}: {e}")
        return jsonify({'error': str(e)}), 500

def escape_yaml_string(value):
    """
    Escape special characters for YAML single-quoted strings.
    Single quotes preserve backslashes literally, avoiding YAML escape sequence interpretation.
    Only single quotes need to be escaped by doubling them.
    """
    if not value:
        return value
    # In single-quoted YAML strings, single quotes are escaped by doubling them (' -> '')
    value = value.replace("'", "''")
    return value

def validate_yaml_content(yaml_content):
    """
    Validate that generated YAML can be parsed correctly.
    Returns (is_valid, error_message) tuple.
    """
    try:
        yaml.safe_load(yaml_content)
        return (True, None)
    except yaml.YAMLError as e:
        error_msg = str(e)
        # Extract line and column information if available
        if hasattr(e, 'problem_mark'):
            mark = e.problem_mark
            error_msg = f"YAML validation error at line {mark.line + 1}, column {mark.column + 1}: {e.problem}"
        logger.error(f"YAML validation failed: {error_msg}")
        return (False, error_msg)
    except Exception as e:
        logger.error(f"Unexpected error during YAML validation: {e}")
        return (False, f"Validation error: {str(e)}")

def generate_formatted_yaml(frontend_data, user_name='System'):
    """Generate formatted YAML with comments matching the preview"""
    creation_date = datetime.now().strftime('%Y-%m-%d')
    rule_name = frontend_data.get('ruleName', 'Unnamed Rule')
    rule_id = frontend_data.get('ruleId', '')
    description = frontend_data.get('description', '')
    threshold = frontend_data.get('threshold', 75)
    ocr_threshold = frontend_data.get('ocrThreshold', 75)
    ocr_multiplier = frontend_data.get('ocrMultiplier', 3)
    filename_multiplier = frontend_data.get('filenameMultiplier', 1)
    
    # Handle verification multiplier config (new format) or legacy single value
    verification_multiplier_config = frontend_data.get('verificationMultiplierConfig')
    if verification_multiplier_config:
        verification_multiplier_mode = verification_multiplier_config.get('mode', 'auto')
        verification_multiplier = verification_multiplier_config.get('value', 0.5)
    else:
        # Legacy format: single value defaults to auto mode
        verification_multiplier = frontend_data.get('verificationMultiplier', 0.5)
        verification_multiplier_mode = 'auto'
    
    yaml_content = f"""# =================================================================================================
# PocoClass Document Classification Rule
# =================================================================================================
# This YAML file was generated using the PocoClass Rule Builder wizard.
# Each section below corresponds to a step in the 6-step configuration process.
#
# Created: {creation_date}
# Created by: {user_name}
# Rule Name: {rule_name}
# =================================================================================================

# =============================
# STEP 1: BASIC INFORMATION
# =============================
# General rule identification and threshold settings

rule_name: "{rule_name}"
rule_id: "{rule_id}"
description: "{description}"

# POCO Score Requirement: Minimum overall confidence score required for document classification
# This combines scores from OCR content, filename patterns, and Paperless Placeholder Verification
threshold: {threshold}  # {threshold}% minimum confidence

# Source Document ID: Original Paperless document used to create this rule (for OCR/PDF preview)
source_document_id: {frontend_data.get('sourceDocumentId', '')}

"""
    
    # Step 2: OCR Identifiers
    ocr_identifiers = frontend_data.get('ocrIdentifiers', [])
    if ocr_identifiers:
        yaml_content += f"""# =============================
# STEP 2: OCR IDENTIFIERS
# =============================
# Text patterns found in document content that help identify the document type
# Each logic group can contain multiple patterns with different matching rules

# OCR Score Requirement: Minimum percentage of OCR patterns that must match
ocr_threshold: {ocr_threshold}  # {ocr_threshold}% minimum match rate

# OCR Weight Multiplier: Controls importance of OCR content in final POCO score
ocr_multiplier: {ocr_multiplier}  # {ocr_multiplier}× weight

core_identifiers:
  logic_groups:
"""
        for idx, group in enumerate(ocr_identifiers, 1):
            group_type = group.get('type', 'match')
            mandatory = 'true' if group.get('mandatory', False) else 'false'
            num_groups = len(ocr_identifiers)
            score_per_group = round(100 / num_groups) if num_groups > 0 else 100
            
            yaml_content += f"""    # Logic Group {idx}
    - type: {group_type}     # Match type: 'match' (OR) or 'match_all' (AND)
      score: {score_per_group}
      mandatory: {mandatory}  # Must match for rule to succeed
      conditions:
"""
            for condition in group.get('conditions', []):
                pattern = escape_yaml_string(condition.get('pattern', ''))
                range_val = condition.get('range', '0-1600')
                yaml_content += f"""        - pattern: '{pattern}'    # Search pattern (text or regex)
          source: content
          range: "{range_val}"        # Search area
"""
    else:
        yaml_content += """# =============================
# STEP 2: OCR IDENTIFIERS
# =============================
# No OCR identifiers configured

"""
    
    # Step 3: Document Classifications
    predefined = frontend_data.get('predefinedData', {})
    dynamic = frontend_data.get('dynamicData', {})
    
    yaml_content += """
# =============================
# STEP 3: DOCUMENT CLASSIFICATIONS
# =============================
# Static metadata and dynamic data extraction rules

static_metadata:
"""
    yaml_content += f"""  correspondent: "{predefined.get('correspondent', '')}"
  document_type: "{predefined.get('documentType', '')}"
"""
    tags = predefined.get('tags', [])
    if tags:
        escaped_tags = [f"'{escape_yaml_string(tag)}'" for tag in tags]
        yaml_content += f"""  tags: [{', '.join(escaped_tags)}]
"""
    
    # Add custom fields if present
    custom_fields = predefined.get('customFields', {})
    if custom_fields and any(v for v in custom_fields.values() if v):
        yaml_content += """  custom_fields:
"""
        for field_name, field_value in custom_fields.items():
            if field_value:
                escaped_value = escape_yaml_string(str(field_value))
                yaml_content += f"""    {field_name}: '{escaped_value}'
"""
    
    extraction_rules = dynamic.get('extractionRules', [])
    
    # Always write dynamic_metadata section if there are extraction rules
    if extraction_rules:
        yaml_content += """
dynamic_metadata:
"""
        # Separate different types of extraction rules
        date_rules = [r for r in extraction_rules if r.get('extractionType') == 'date']
        tag_rules = [r for r in extraction_rules if r.get('extractionType') == 'text' and r.get('targetField') == 'tags']
        custom_field_rules = [r for r in extraction_rules if r.get('extractionType') == 'text' and r.get('targetField') not in ['tags', 'dateCreated']]
        
        content_written = False
        
        # Handle date extraction (including date-type custom fields)
        for rule in date_rules:
            target_field = rule.get('targetField', '')
            # Map frontend field names to backend YAML field names
            if target_field == 'dateCreated':
                target_field = 'date_created'
            
            before_anchor = escape_yaml_string(rule.get('beforeAnchor', {}).get('pattern', ''))
            after_anchor = escape_yaml_string(rule.get('afterAnchor', {}).get('pattern', ''))
            date_format = rule.get('dateFormat', 'DD-MM-YYYY')
            
            yaml_content += f"""  {target_field}:
    pattern_before: '{before_anchor}'
    pattern_after: '{after_anchor}'
    format: {date_format}
"""
            content_written = True
        
        # Handle custom field text extraction
        for rule in custom_field_rules:
            target_field = rule.get('targetField', '')  # Use actual field name like "Total Price"
            before_anchor = escape_yaml_string(rule.get('beforeAnchor', {}).get('pattern', ''))
            after_anchor = escape_yaml_string(rule.get('afterAnchor', {}).get('pattern', ''))
            
            yaml_content += f"""  {target_field}:
    pattern_before: '{before_anchor}'
    pattern_after: '{after_anchor}'
"""
            content_written = True
        
        # Handle tag extraction
        if tag_rules:
            yaml_content += """  extracted_tags:
"""
            for rule in tag_rules:
                regex_pattern = escape_yaml_string(rule.get('regexPattern', ''))
                tag_value = escape_yaml_string(rule.get('tagValue', ''))
                prefix = escape_yaml_string(rule.get('prefix', ''))
                
                yaml_content += f"""    - pattern: '{regex_pattern}'
      value: '{tag_value}'
"""
                if prefix:
                    yaml_content += f"""      prefix: '{prefix}'
"""
            content_written = True
        
        # If no content was written, make it an empty dict to avoid null
        if not content_written:
            # Remove the "dynamic_metadata:\n" and replace with empty dict
            yaml_content = yaml_content.rstrip()
            if yaml_content.endswith('dynamic_metadata:'):
                yaml_content = yaml_content[:-len('dynamic_metadata:')] + 'dynamic_metadata: {}\n'
    else:
        # No extraction rules at all - write empty dict
        yaml_content += """
dynamic_metadata: {}
"""
    
    # Step 4: Filename Patterns
    yaml_content += f"""
# =============================
# STEP 4: FILENAME IDENTIFICATION  
# =============================
# Patterns that identify documents by filename

filename_multiplier: {filename_multiplier}  # {filename_multiplier}× weight

filename_patterns:
"""
    filename_patterns = frontend_data.get('filenamePatterns', {}).get('patterns', [])
    if filename_patterns and any(p for p in filename_patterns if p):
        for pattern in filename_patterns:
            if pattern:
                escaped_pattern = escape_yaml_string(pattern)
                yaml_content += f"""  - '{escaped_pattern}'
"""
    else:
        yaml_content += """  # No filename patterns configured
"""
    
    # Step 5: Verification
    yaml_content += f"""
# =============================
# STEP 5: PAPERLESS DATA VERIFICATION
# =============================
# Paperless placeholder fields to verify for additional confidence

# Verification Weight Multiplier: Controls importance of placeholder verification
# Mode: 'auto' = dynamic neutraliser (1 / number_of_enabled_fields), 'manual' = fixed multiplier
verification_multiplier_mode: "{verification_multiplier_mode}"  # auto or manual
verification_multiplier: {verification_multiplier}  # {'Auto-adjusted (neutraliser)' if verification_multiplier_mode == 'auto' else f'{verification_multiplier}× weight'}

verification_fields:
"""
    enabled_fields = frontend_data.get('verification', {}).get('enabledFields', {})
    enabled_list = [field for field, enabled in enabled_fields.items() if enabled]
    if enabled_list:
        for field in enabled_list:
            yaml_content += f"""  - {field}
"""
    else:
        yaml_content += """  # No verification fields enabled
"""
    
    # Status
    status = frontend_data.get('status', 'draft')
    yaml_content += f"""
status: {status}
"""
    
    return yaml_content

@app.route('/api/rules', methods=['POST'])
def create_rule():
    """Create a new rule"""
    try:
        rule_data = request.json
        rule_id = rule_data.get('ruleId')
        
        if not rule_id:
            return jsonify({'error': 'Rule ID is required'}), 400
        
        # Get current user for attribution
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        session = db.get_session(session_token) if session_token else None
        user_name = 'System'
        if session:
            user = db.get_user_by_id(session.get('user_id'))
            if user:
                user_name = user.get('paperless_username', 'Unknown User')
        
        # Generate formatted YAML with comments
        formatted_yaml = generate_formatted_yaml(rule_data, user_name)
        
        # Validate YAML before saving
        is_valid, error_msg = validate_yaml_content(formatted_yaml)
        if not is_valid:
            logger.error(f"Failed to create rule {rule_id}: {error_msg}")
            return jsonify({'error': f'Invalid YAML generated: {error_msg}'}), 400
        
        # Save rule
        rule_file = os.path.join('rules', f'{rule_id}.yaml')
        with open(rule_file, 'w') as f:
            f.write(formatted_yaml)
        
        return jsonify({'id': rule_id, 'message': 'Rule created successfully'})
    except Exception as e:
        logger.error(f"Error creating rule: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rules/<rule_id>', methods=['PUT'])
def update_rule(rule_id):
    """Update an existing rule"""
    try:
        rule_data = request.json
        
        # Get current user for attribution
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        session = db.get_session(session_token) if session_token else None
        user_name = 'System'
        if session:
            user = db.get_user_by_id(session.get('user_id'))
            if user:
                user_name = user.get('paperless_username', 'Unknown User')
        
        # Generate formatted YAML with comments
        formatted_yaml = generate_formatted_yaml(rule_data, user_name)
        
        # Validate YAML before saving
        is_valid, error_msg = validate_yaml_content(formatted_yaml)
        if not is_valid:
            logger.error(f"Failed to update rule {rule_id}: {error_msg}")
            return jsonify({'error': f'Invalid YAML generated: {error_msg}'}), 400
        
        new_rule_id = rule_data.get('ruleId', rule_id)
        old_rule_file = os.path.join('rules', f'{rule_id}.yaml')
        new_rule_file = os.path.join('rules', f'{new_rule_id}.yaml')
        
        if new_rule_id != rule_id:
            if os.path.exists(new_rule_file):
                return jsonify({'error': f'A rule with ID "{new_rule_id}" already exists'}), 409
            if os.path.exists(old_rule_file):
                os.rename(old_rule_file, new_rule_file)
            else:
                logger.warning(f"Old rule file {old_rule_file} not found during rename to {new_rule_id}")
        
        with open(new_rule_file, 'w') as f:
            f.write(formatted_yaml)
        
        return jsonify({'id': new_rule_id, 'message': 'Rule updated successfully'})
    except Exception as e:
        logger.error(f"Error updating rule {rule_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rules/<rule_id>', methods=['DELETE'])
def delete_rule(rule_id):
    """Delete a rule"""
    try:
        rule_file = os.path.join('rules', f'{rule_id}.yaml')
        if os.path.exists(rule_file):
            # Move to deleted folder instead of permanent delete
            deleted_dir = os.path.join('rules', 'deleted')
            os.makedirs(deleted_dir, exist_ok=True)
            os.rename(rule_file, os.path.join(deleted_dir, f'{rule_id}.yaml'))
            return jsonify({'message': 'Rule deleted successfully'})
        return jsonify({'error': 'Rule not found'}), 404
    except Exception as e:
        logger.error(f"Error deleting rule {rule_id}: {e}")
        return jsonify({'error': str(e)}), 500

# ---- Deleted Rules (Trash Can) Routes ----

@app.route('/api/deleted-rules', methods=['GET'])
def list_deleted_rules():
    """List all deleted rules from the deleted folder"""
    try:
        deleted_dir = os.path.join('rules', 'deleted')
        if not os.path.exists(deleted_dir):
            return jsonify([])
        
        deleted_rules = []
        deleted_files = list(Path(deleted_dir).glob('*.yaml')) + list(Path(deleted_dir).glob('*.yml'))
        
        for rule_file in deleted_files:
            try:
                # Load the rule data
                rule_data = rule_loader.load_rule_file(rule_file)
                if rule_data:
                    # Get file stats for deletion date
                    stats = os.stat(rule_file)
                    deleted_date = datetime.fromtimestamp(stats.st_mtime).isoformat()
                    
                    deleted_rules.append({
                        'id': rule_file.stem,
                        'originalRuleId': rule_data.get('rule_id', rule_file.stem),
                        'ruleName': rule_data.get('rule_name', rule_file.stem),
                        'deletedDate': deleted_date,
                        'ruleData': rule_data
                    })
            except Exception as e:
                logger.error(f"Error loading deleted rule {rule_file.name}: {e}")
        
        # Sort by deleted date (newest first)
        deleted_rules.sort(key=lambda x: x.get('deletedDate', ''), reverse=True)
        
        return jsonify(deleted_rules)
    except Exception as e:
        logger.error(f"Error listing deleted rules: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/deleted-rules/<rule_id>', methods=['DELETE'])
def permanently_delete_rule(rule_id):
    """Permanently delete a rule from the deleted folder"""
    try:
        rule_file = os.path.join('rules', 'deleted', f'{rule_id}.yaml')
        if os.path.exists(rule_file):
            os.remove(rule_file)
            return jsonify({'message': 'Rule permanently deleted'})
        return jsonify({'error': 'Deleted rule not found'}), 404
    except Exception as e:
        logger.error(f"Error permanently deleting rule {rule_id}: {e}")
        return jsonify({'error': str(e)}), 500

# ---- Log Routes ----

@app.route('/api/logs', methods=['GET'])
def list_logs():
    """List logs with optional filtering by type, level, date range, and search term."""
    try:
        # Get filter parameters
        limit = request.args.get('limit', 500, type=int)
        order_by = request.args.get('order', '-timestamp')
        log_type = request.args.get('type')
        level = request.args.get('level')
        date_from = request.args.get('dateFrom')
        date_to = request.args.get('dateTo')
        search = request.args.get('search')
        
        # Retrieve logs from database
        logs = db.get_logs(
            limit=limit,
            order_by=order_by,
            log_type=log_type,
            level=level,
            date_from=date_from,
            date_to=date_to,
            search=search
        )
        
        return jsonify(logs)
    except Exception as e:
        logger.error(f"Error listing logs: {e}")
        return jsonify({'error': str(e)}), 500

# ---- Document Routes ----

@app.route('/api/documents', methods=['GET'])
@require_auth
def list_documents():
    """List documents from Paperless-ngx with optional filters, enriched with cached entity names."""
    try:
        limit = request.args.get('limit', type=int)
        
        # Get filter parameters
        title = request.args.get('title')
        tags = request.args.get('tags', '').split(',') if request.args.get('tags') else None
        tags_mode = request.args.get('tags_mode', 'include')
        exclude_tags = request.args.get('exclude_tags', '').split(',') if request.args.get('exclude_tags') else None
        correspondents = request.args.get('correspondents', '').split(',') if request.args.get('correspondents') else None
        correspondents_mode = request.args.get('correspondents_mode', 'include')
        doc_types = request.args.get('doc_types', '').split(',') if request.args.get('doc_types') else None
        doc_types_mode = request.args.get('doc_types_mode', 'include')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Determine if we should ignore legacy tag filtering:
        # - If user explicitly sets ignore_tags parameter, use that
        # - If user has selected any tag filters, skip legacy filtering so it doesn't interfere
        # - Otherwise, automatically ignore legacy tags when viewing the full document list
        explicit_ignore_tags = request.args.get('ignore_tags')
        if explicit_ignore_tags is not None:
            ignore_tags = explicit_ignore_tags.lower() == 'true'
        else:
            ignore_tags = True
        
        logger.info(f"Document list request - tags={tags}, exclude_tags={exclude_tags}, ignore_tags={ignore_tags}")
        
        # Get Paperless credentials from session
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        
        # Initialize Paperless API client
        from api_client import PaperlessAPIClient
        from config import Config
        
        config = Config()
        config.paperless_token = session['paperless_token']
        config.paperless_url = paperless_url
        api_client = PaperlessAPIClient(config, db)
        
        # Fetch documents with filters
        documents = api_client.get_documents(
            limit=limit, 
            ignore_tags=ignore_tags,
            title=title,
            tags=tags,
            tags_mode=tags_mode,
            exclude_tags=exclude_tags,
            correspondents=correspondents,
            correspondents_mode=correspondents_mode,
            doc_types=doc_types,
            doc_types_mode=doc_types_mode,
            date_from=date_from,
            date_to=date_to
        )
        
        logger.info(f"Fetched {len(documents)} documents from Paperless API")
        
        # Get cached data for lookups (use paperless_id as key, not internal id)
        correspondents = {c['paperless_id']: c for c in db.get_all_correspondents()}
        doc_types = {dt['paperless_id']: dt for dt in db.get_all_document_types()}
        tags = {t['paperless_id']: t for t in db.get_all_tags()}
        custom_fields_lookup = {cf['paperless_id']: cf for cf in db.get_all_custom_fields()}
        
        # Convert to frontend format
        formatted_docs = []
        for doc in documents:
            # Get correspondent name
            correspondent_name = None
            if doc.get('correspondent'):
                corr = correspondents.get(doc['correspondent'])
                correspondent_name = corr['name'] if corr else None
            
            # Get document type name
            doc_type_name = None
            if doc.get('document_type'):
                dt = doc_types.get(doc['document_type'])
                doc_type_name = dt['name'] if dt else None
            
            # Get tag names
            tag_names = []
            if doc.get('tags'):
                for tag_id in doc['tags']:
                    tag = tags.get(tag_id)
                    if tag:
                        tag_names.append(tag['name'])
            
            # Get owner username from cache (from Paperless user ID, not our DB user ID)
            owner_name = None
            if doc.get('owner'):
                # Try to get from cache first
                owner_name = db.get_cached_username_by_paperless_id(doc['owner'])
                if not owner_name:
                    # Fallback to API if not in cache
                    try:
                        owner_response = api_client.session.get(f"{paperless_url}/api/users/{doc['owner']}/")
                        if owner_response.ok:
                            owner_data = owner_response.json()
                            owner_name = owner_data.get('username', f"User {doc['owner']}")
                        else:
                            owner_name = f"User {doc['owner']}"
                    except:
                        owner_name = f"User {doc['owner']}"
            
            # Extract POCO Score and Doc Category from custom fields
            poco_score = None
            doc_category = None
            poco_score_field_id = api_client.get_custom_field_id('POCO Score')
            doc_category_field_id = api_client.get_custom_field_id('Document Category')
            
            custom_fields = doc.get('custom_fields', [])
            for cf in custom_fields:
                # Extract POCO Score
                if poco_score_field_id and cf.get('field') == poco_score_field_id:
                    try:
                        poco_score = float(cf.get('value', 0))
                    except (ValueError, TypeError):
                        poco_score = None
                
                # Extract Doc Category (resolve select option ID to text)
                if doc_category_field_id and cf.get('field') == doc_category_field_id:
                    raw_value = cf.get('value')
                    # Check if this is a select field with option IDs
                    if raw_value and doc_category_field_id in custom_fields_lookup:
                        cf_def = custom_fields_lookup[doc_category_field_id]
                        if cf_def.get('data_type') == 'select' and cf_def.get('extra_data'):
                            # Resolve option ID to label
                            select_options = cf_def['extra_data'].get('select_options', [])
                            for option in select_options:
                                if option.get('id') == raw_value:
                                    doc_category = option.get('label', raw_value)
                                    break
                            if not doc_category:
                                doc_category = raw_value  # Fallback to raw value
                        else:
                            doc_category = raw_value
                    else:
                        doc_category = raw_value
            
            # Build URLs for document viewing
            pdf_url = f"{paperless_url}/api/documents/{doc['id']}/preview/"
            download_url = f"{paperless_url}/api/documents/{doc['id']}/download/"
            
            formatted_docs.append({
                'id': doc['id'],
                'title': doc.get('title', doc.get('original_file_name', 'Untitled')),
                'created': doc.get('created', ''),
                'added': doc.get('added', ''),
                'correspondent': correspondent_name,
                'documentType': doc_type_name,
                'tags': tag_names,
                'owner': owner_name,
                'originalFileName': doc.get('original_file_name', ''),
                'pdfUrl': pdf_url,
                'downloadUrl': download_url,
                'content': doc.get('content', ''),  # OCR text content
                'pocoScore': poco_score,  # POCO Score from custom fields
                'docCategory': doc_category  # Doc Category from custom fields
            })
        
        logger.info(f"Returning {len(formatted_docs)} formatted documents to frontend")
        return jsonify(formatted_docs)
    except Exception as e:
        logger.error(f"Error listing documents: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/<int:doc_id>/preview', methods=['GET'])
def proxy_document_preview(doc_id):
    """Proxy document PDF preview with authentication"""
    try:
        # Get token from header or query parameter (for new tab opens)
        session_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_token:
            session_token = request.args.get('token')
        
        if not session_token:
            return jsonify({'error': 'No session token provided'}), 401
        
        session = db.get_session(session_token)
        if not session:
            return jsonify({'error': 'Invalid or expired session'}), 401
        
        # Check if user is enabled
        user = db.get_user_by_id(session['user_id'])
        if not user or user.get('is_enabled', 1) == 0:
            return jsonify({'error': 'User account is disabled'}), 403
        
        paperless_url = db.get_config('paperless_url')
        
        # Create API client with user's token
        config_temp = Config()
        config_temp.paperless_url = paperless_url
        config_temp.paperless_token = session['paperless_token']
        api_client = PaperlessAPIClient(config_temp, db)
        
        # Fetch PDF from Paperless
        pdf_response = api_client.session.get(
            f"{paperless_url}/api/documents/{doc_id}/preview/",
            stream=True
        )
        
        if not pdf_response.ok:
            return jsonify({'error': 'Failed to fetch PDF from Paperless'}), pdf_response.status_code
        
        # Stream the PDF back to the client
        from flask import Response
        return Response(
            pdf_response.iter_content(chunk_size=8192),
            content_type=pdf_response.headers.get('Content-Type', 'application/pdf'),
            headers={
                'Content-Disposition': pdf_response.headers.get('Content-Disposition', 'inline')
            }
        )
    except Exception as e:
        logger.error(f"Error proxying PDF preview: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/<int:doc_id>/content', methods=['GET'])
@app.route('/api/documents/<int:doc_id>/ocr', methods=['GET'])
@require_auth
def get_document_ocr_content(doc_id):
    """Get OCR content for a document"""
    try:
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        
        # Create API client with user's token
        config_temp = Config()
        config_temp.paperless_url = paperless_url
        config_temp.paperless_token = session['paperless_token']
        api_client = PaperlessAPIClient(config_temp, db)
        
        # Get document content
        content = api_client.get_document_content(doc_id)
        if content is None:
            return jsonify({'error': 'Could not retrieve document content'}), 500
        
        original_filename = ''
        try:
            docs = api_client.get_documents(document_id=doc_id, ignore_tags=True)
            if docs and len(docs) > 0:
                original_filename = docs[0].get('original_file_name', '')
        except Exception:
            pass
        
        return jsonify({'ocr': content, 'content': content, 'originalFileName': original_filename})
    except Exception as e:
        logger.error(f"Error getting document content: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ---- Rule Format Conversion Helpers ----

def convert_frontend_to_backend(frontend_data):
    """Convert frontend rule format to backend YAML format"""
    backend = {
        'rule_name': frontend_data.get('ruleName', ''),
        'rule_id': frontend_data.get('ruleId', ''),
        'description': frontend_data.get('description', ''),
        'threshold': frontend_data.get('threshold', 75),
        'ocr_threshold': frontend_data.get('ocrThreshold', 75),
        'ocr_multiplier': frontend_data.get('ocrMultiplier', 3),
        'filename_multiplier': frontend_data.get('filenameMultiplier', 1),
        'verification_multiplier': frontend_data.get('verificationMultiplierConfig', {}).get('value', frontend_data.get('verificationMultiplier', 0.5)),
        'verification_multiplier_mode': frontend_data.get('verificationMultiplierConfig', {}).get('mode', 'auto'),
        'status': frontend_data.get('status', 'draft'),
    }
    
    # Save source document ID if provided (for OCR/PDF preview when editing)
    if frontend_data.get('sourceDocumentId'):
        backend['source_document_id'] = frontend_data['sourceDocumentId']
    
    # OCR Identifiers - Use v2 format with core_identifiers
    if frontend_data.get('ocrIdentifiers'):
        backend['core_identifiers'] = {'logic_groups': []}
        num_groups = len(frontend_data['ocrIdentifiers'])
        score_per_group = round(100 / num_groups) if num_groups > 0 else 100
        
        for group in frontend_data['ocrIdentifiers']:
            backend_group = {
                'type': group.get('type', 'match'),
                'score': score_per_group,
                'mandatory': group.get('mandatory', False),
                'conditions': []
            }
            for condition in group.get('conditions', []):
                backend_group['conditions'].append({
                    'pattern': condition.get('pattern', ''),
                    'source': 'content',
                    'range': condition.get('range', '0-1600')
                })
            backend['core_identifiers']['logic_groups'].append(backend_group)
    
    # Static Metadata
    if frontend_data.get('predefinedData'):
        pd = frontend_data['predefinedData']
        backend['static_metadata'] = {}
        if pd.get('correspondent'):
            backend['static_metadata']['correspondent'] = pd['correspondent']
        if pd.get('documentType'):
            backend['static_metadata']['document_type'] = pd['documentType']
        if pd.get('tags'):
            backend['static_metadata']['tags'] = pd['tags']
        if pd.get('documentCategory'):
            backend['static_metadata']['custom_fields'] = {
                'Document Category': pd['documentCategory']
            }
    
    # Dynamic Metadata - Always initialize as empty dict to avoid YAML null issues
    backend['dynamic_metadata'] = {}
    
    if frontend_data.get('dynamicData', {}).get('extractionRules'):
        for rule in frontend_data['dynamicData']['extractionRules']:
            target = rule.get('targetField')
            extraction_type = rule.get('extractionType', '')
            
            if target == 'dateCreated':
                backend['dynamic_metadata']['date_created'] = {
                    'pattern_before': rule.get('beforeAnchor', {}).get('pattern', ''),
                    'pattern_after': rule.get('afterAnchor', {}).get('pattern', ''),
                    'format': rule.get('dateFormat', '')
                }
            elif target == 'tags' and extraction_type == 'text':
                if 'extracted_tags' not in backend['dynamic_metadata']:
                    backend['dynamic_metadata']['extracted_tags'] = []
                backend['dynamic_metadata']['extracted_tags'].append({
                    'pattern': rule.get('regexPattern', ''),
                    'value': rule.get('tagValue', '')
                })
            elif target and target not in ['dateCreated', 'tags']:
                # Handle custom fields (target is the actual field name like "Total Price")
                backend['dynamic_metadata'][target] = {
                    'pattern_before': rule.get('beforeAnchor', {}).get('pattern', ''),
                    'pattern_after': rule.get('afterAnchor', {}).get('pattern', ''),
                }
                # Store extraction type for data filtering
                if extraction_type:
                    backend['dynamic_metadata'][target]['extraction_type'] = extraction_type
                # Add format for date-type custom fields
                if extraction_type == 'date' and rule.get('dateFormat'):
                    backend['dynamic_metadata'][target]['format'] = rule.get('dateFormat')
    
    # Filename Patterns
    if frontend_data.get('filenamePatterns'):
        backend['filename_patterns'] = frontend_data['filenamePatterns'].get('patterns', [])
    
    # Verification - Only include fields that are actually enabled (value = True)
    if frontend_data.get('verification'):
        enabled_fields = frontend_data['verification'].get('enabledFields', {})
        backend['verification_fields'] = [k for k, v in enabled_fields.items() if v]
    
    return backend

def convert_backend_to_frontend(backend_data, rule_id):
    """Convert backend YAML format to frontend format"""
    frontend = {
        'ruleId': rule_id,
        'ruleName': backend_data.get('rule_name', rule_id),
        'description': backend_data.get('description', ''),
        'threshold': backend_data.get('threshold', 75),
        'ocrThreshold': backend_data.get('ocr_threshold', 75),
        'ocrMultiplier': backend_data.get('ocr_multiplier', 3),
        'filenameMultiplier': backend_data.get('filename_multiplier', 1),
        'verificationMultiplier': backend_data.get('verification_multiplier', 0.5),
        'verificationMultiplierConfig': {
            'mode': backend_data.get('verification_multiplier_mode', 'auto'),
            'value': backend_data.get('verification_multiplier', 0.5)
        },
        'status': backend_data.get('status', 'draft'),
        'ocrIdentifiers': [],
        'predefinedData': {},
        'dynamicData': {'extractionRules': []},
        'filenamePatterns': {'patterns': [], 'dateFormats': []},
        'verification': {'enabledFields': {}}
    }
    
    # Load source document ID if available (for OCR/PDF preview when editing)
    if backend_data.get('source_document_id'):
        frontend['sourceDocumentId'] = backend_data['source_document_id']
    
    # Convert logic groups to OCR identifiers - Handle both v1 and v2 formats
    # v2 format (core_identifiers)
    logic_groups_data = None
    if backend_data.get('core_identifiers'):
        logic_groups_data = backend_data['core_identifiers'].get('logic_groups', [])
    # v1 format fallback (logic_groups)
    elif backend_data.get('logic_groups'):
        logic_groups_data = backend_data['logic_groups']
    
    if logic_groups_data:
        for group in logic_groups_data:
            frontend_group = {
                'type': group.get('type', 'match'),
                'mandatory': group.get('mandatory', False),
                'conditions': []
            }
            # v2 format uses 'conditions' with 'pattern'
            if group.get('conditions'):
                for condition in group['conditions']:
                    frontend_group['conditions'].append({
                        'pattern': condition.get('pattern', ''),
                        'range': condition.get('range', '0-1600')
                    })
            # v1 format uses 'patterns' with 'text'
            elif group.get('patterns'):
                for pattern in group['patterns']:
                    frontend_group['conditions'].append({
                        'pattern': pattern.get('text', ''),
                        'range': pattern.get('range', '0-1600')
                    })
            frontend['ocrIdentifiers'].append(frontend_group)
    
    # Static metadata
    if backend_data.get('static_metadata'):
        sm = backend_data['static_metadata']
        frontend['predefinedData'] = {
            'correspondent': sm.get('correspondent', ''),
            'documentType': sm.get('document_type', ''),
            'tags': sm.get('tags', []),
            'customFields': sm.get('custom_fields', {})
        }
    
    # Dynamic metadata (extraction rules)
    if backend_data.get('dynamic_metadata'):
        dm = backend_data['dynamic_metadata']
        
        # Date extraction
        if dm.get('date_created'):
            date_rule = dm['date_created']
            
            # Handle pattern_before (new format - string) or beforeAnchor (old format - dict or string)
            before_pattern = ''
            if 'pattern_before' in date_rule:
                before_pattern = date_rule['pattern_before']
            elif 'beforeAnchor' in date_rule:
                before_anchor = date_rule['beforeAnchor']
                # Check if it's a dict with 'pattern' key or just a string
                if isinstance(before_anchor, dict):
                    before_pattern = before_anchor.get('pattern', '')
                else:
                    before_pattern = before_anchor
            
            # Handle pattern_after (new format - string) or afterAnchor (old format - dict or string)
            after_pattern = ''
            if 'pattern_after' in date_rule:
                after_pattern = date_rule['pattern_after']
            elif 'afterAnchor' in date_rule:
                after_anchor = date_rule['afterAnchor']
                # Check if it's a dict with 'pattern' key or just a string
                if isinstance(after_anchor, dict):
                    after_pattern = after_anchor.get('pattern', '')
                else:
                    after_pattern = after_anchor
            
            frontend['dynamicData']['extractionRules'].append({
                'targetField': 'dateCreated',
                'extractionType': 'date',
                'beforeAnchor': {'pattern': before_pattern},
                'afterAnchor': {'pattern': after_pattern},
                'dateFormat': date_rule.get('format', 'DD-MM-YYYY')
            })
        
        # Tag extraction
        if dm.get('extracted_tags'):
            for tag_rule in dm['extracted_tags']:
                frontend['dynamicData']['extractionRules'].append({
                    'targetField': 'tags',
                    'extractionType': 'text',
                    'regexPattern': tag_rule.get('pattern', ''),
                    'tagValue': tag_rule.get('value', ''),
                    'prefix': tag_rule.get('prefix', '')
                })
        
        # Custom field extraction (any field that's not date_created or extracted_tags)
        for field_name, field_data in dm.items():
            if field_name not in ['date_created', 'extracted_tags'] and isinstance(field_data, dict):
                # Determine extraction type based on whether format is present
                extraction_type = 'date' if field_data.get('format') else 'text'
                
                # Handle legacy customField_* format for backward compatibility
                # If field_name starts with "customField_", it's legacy format - keep as-is for now
                # New format uses actual field names like "Total Price"
                target_field_value = field_name
                
                extraction_rule = {
                    'targetField': target_field_value,  # Use actual field name like "Total Price" or legacy "customField_13"
                    'extractionType': extraction_type,
                    'beforeAnchor': {'pattern': field_data.get('pattern_before', '')},
                    'afterAnchor': {'pattern': field_data.get('pattern_after', '')}
                }
                
                # Add dateFormat for date-type custom fields
                if extraction_type == 'date':
                    extraction_rule['dateFormat'] = field_data.get('format', 'DD-MM-YYYY')
                
                frontend['dynamicData']['extractionRules'].append(extraction_rule)
    
    # Filename patterns
    if backend_data.get('filename_patterns'):
        frontend['filenamePatterns']['patterns'] = backend_data['filename_patterns']
    
    # Verification fields
    if backend_data.get('verification_fields'):
        # Convert list of field names to dict with all fields enabled
        for field in backend_data['verification_fields']:
            frontend['verification']['enabledFields'][field] = True
    
    return frontend

# ---- Rule Test & Execution Routes ----

@app.route('/api/rules/test', methods=['POST'])
def test_rule_endpoint():
    """Test a rule against document content"""
    try:
        data = request.json
        rule_data = data.get('rule')
        document_content = data.get('documentContent', '')
        document_filename = data.get('documentFilename', 'test.pdf')
        paperless_metadata = data.get('paperlessMetadata', None)
        document_id = data.get('documentId')
        
        if not rule_data:
            return jsonify({'error': 'Rule data is required'}), 400
        
        # Convert frontend format to backend format if needed
        backend_rule = convert_frontend_to_backend(rule_data)
        rule_name = backend_rule.get('rule_name', 'Unnamed Rule')
        
        # Test the rule
        result = test_engine.test_rule(
            backend_rule,
            document_content,
            document_filename,
            paperless_metadata
        )
        
        # Log the test result
        if result.get('success'):
            poco_score = result.get('scores', {}).get('poco_score', 0)
            poco_ocr = result.get('scores', {}).get('poco_ocr_score', 0)
            matched = result.get('result') == 'Match'
            
            db.add_log(
                log_type='rule_execution',
                level='success' if matched else 'info',
                message=f"Rule test {'successful' if matched else 'completed'}: {rule_name} - {'Match' if matched else 'No match'}",
                rule_name=rule_name,
                rule_id=rule_data.get('id'),
                document_id=document_id,
                document_name=document_filename,
                poco_score=poco_score,
                poco_ocr=poco_ocr,
                source='test_engine'
            )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error testing rule: {e}", exc_info=True)
        # Log the error
        db.add_log(
            log_type='error',
            level='error',
            message=f"Rule test failed: {str(e)}",
            rule_name=rule_data.get('ruleName', 'Unknown') if rule_data else 'Unknown',
            source='test_engine'
        )
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rules/<rule_id>/execute', methods=['POST'])
@require_auth
def execute_rule_endpoint(rule_id):
    """Execute a rule against a Paperless document"""
    try:
        data = request.json
        document_id = data.get('documentId')
        dry_run = data.get('dryRun', True)
        
        if not document_id:
            return jsonify({'error': 'Document ID is required'}), 400
        
        # Create user-specific API client
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        config = Config()
        config.paperless_token = session['paperless_token']
        config.paperless_url = paperless_url
        user_api_client = PaperlessAPIClient(config, db)
        
        # Load rule
        rule_file = Path('rules') / f'{rule_id}.yaml'
        rule_data = rule_loader.load_rule_file(rule_file)
        if not rule_data:
            return jsonify({'error': 'Rule not found'}), 404
        
        # Get document from Paperless
        documents = user_api_client.get_documents(document_id=document_id)
        if not documents or len(documents) == 0:
            return jsonify({'error': 'Document not found in Paperless'}), 404
        
        document = documents[0]
        
        # Get document content
        content = user_api_client.get_document_content(document_id)
        if not content:
            return jsonify({'error': 'Could not retrieve document content'}), 500
        
        # Convert document IDs to names for verification using standard PocoClass pattern
        # Create lookup dictionaries from cached database data
        correspondents_lookup = {c['paperless_id']: c for c in db.get_all_correspondents()}
        doc_types_lookup = {dt['paperless_id']: dt for dt in db.get_all_document_types()}
        tags_lookup = {t['paperless_id']: t for t in db.get_all_tags()}
        custom_fields_lookup = {cf['paperless_id']: cf for cf in db.get_all_custom_fields()}
        
        # Build paperless_metadata with names instead of IDs
        paperless_metadata = {}
        
        # Convert correspondent ID to name
        if document.get('correspondent'):
            corr = correspondents_lookup.get(document['correspondent'])
            if corr:
                paperless_metadata['correspondent'] = corr['name']
        
        # Convert document_type ID to name
        if document.get('document_type'):
            dt = doc_types_lookup.get(document['document_type'])
            if dt:
                paperless_metadata['document_type'] = dt['name']
        
        # Convert tag IDs to tag names
        if document.get('tags'):
            tag_names = []
            for tag_id in document['tags']:
                tag = tags_lookup.get(tag_id)
                if tag:
                    tag_names.append(tag['name'])
            if tag_names:
                paperless_metadata['tags'] = tag_names
        
        # Extract custom fields with field names and values (resolve select option IDs)
        if document.get('custom_fields'):
            custom_fields_dict = {}
            for cf_entry in document['custom_fields']:
                field_id = cf_entry.get('field')
                cf_def = custom_fields_lookup.get(field_id)
                if cf_def:
                    raw_value = cf_entry.get('value')
                    # Resolve select option ID to label
                    if cf_def.get('data_type') == 'select' and cf_def.get('extra_data'):
                        select_options = cf_def['extra_data'].get('select_options', [])
                        resolved_value = raw_value
                        for option in select_options:
                            if option.get('id') == raw_value:
                                resolved_value = option.get('label', raw_value)
                                break
                        custom_fields_dict[cf_def['name']] = resolved_value
                    else:
                        custom_fields_dict[cf_def['name']] = raw_value
            if custom_fields_dict:
                paperless_metadata['custom_fields'] = custom_fields_dict
        
        # Pass through date_created
        if document.get('created'):
            paperless_metadata['date_created'] = document['created']
        
        # Execute rule
        result = test_engine.execute_rule(
            rule_data,
            document_id,
            content,
            document.get('original_file_name', 'unknown.pdf'),
            paperless_metadata,
            dry_run
        )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error executing rule: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

# ---- Background Processing Routes ----

from background_processor import BackgroundProcessor
background_processor = BackgroundProcessor(db)

@app.route('/api/background/trigger', methods=['POST'])
@require_system_token_or_admin
def trigger_background_processing():
    """Trigger background processing with debouncing.
    
    Accepts either:
    - System API token via X-API-Key header (for automation/scripts)
    - Admin session via Authorization: Bearer header (for UI)
    """
    try:
        # For system token auth, skip validation checks (trust that setup is correct)
        # The background processor will fail gracefully if required fields/tags are missing
        if getattr(request, 'is_system_token', False):
            logger.info("Background processing triggered via system API token")
            result = background_processor.trigger_processing()
            return jsonify(result)
        
        # For session auth, perform validation check
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        
        config = Config()
        config.paperless_token = session['paperless_token']
        config.paperless_url = paperless_url
        api_client = PaperlessAPIClient(config, db)
        
        # Check if POCO OCR is enabled
        poco_ocr_enabled = db.get_config('poco_ocr_enabled') == 'true'
        
        # Check for required custom fields (POCO Score always required, POCO OCR if enabled) - use check methods to avoid auto-creating
        poco_score_exists = api_client.check_custom_field_exists('POCO Score') is not None
        poco_ocr_exists = api_client.check_custom_field_exists('POCO OCR') is not None if poco_ocr_enabled else True
        
        # Check for required tags - use check methods to avoid auto-creating
        poco_plus_exists = api_client.check_tag_exists('POCO+') is not None
        poco_minus_exists = api_client.check_tag_exists('POCO-') is not None
        new_tag_exists = api_client.check_tag_exists('NEW') is not None
        
        if not (poco_score_exists and poco_ocr_exists and poco_plus_exists and poco_minus_exists and new_tag_exists):
            return jsonify({
                'error': 'Cannot start background processing: Missing required custom fields or tags. Please fix in Settings > Data Validation.',
                'validation_required': True
            }), 400
        
        result = background_processor.trigger_processing()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error triggering background processing: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/background/status', methods=['GET'])
@require_auth
def get_background_status():
    """Get background processing status"""
    try:
        status = background_processor.get_status()
        return jsonify(status)
    except Exception as e:
        logger.error(f"Error getting background status: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/background/process', methods=['POST'])
@require_auth
def manual_processing():
    """Manual processing with optional filters"""
    try:
        session = request.current_user
        data = request.json or {}
        
        # Check if mandatory data exists before processing
        paperless_url = db.get_config('paperless_url')
        
        config = Config()
        config.paperless_token = session['paperless_token']
        config.paperless_url = paperless_url
        api_client = PaperlessAPIClient(config, db)
        
        # Check if POCO OCR is enabled
        poco_ocr_enabled = db.get_config('poco_ocr_enabled') == 'true'
        
        # Check for required custom fields (POCO Score always required, POCO OCR if enabled) - use check methods to avoid auto-creating
        poco_score_exists = api_client.check_custom_field_exists('POCO Score') is not None
        poco_ocr_exists = api_client.check_custom_field_exists('POCO OCR') is not None if poco_ocr_enabled else True
        
        # Check for required tags - use check methods to avoid auto-creating
        poco_plus_exists = api_client.check_tag_exists('POCO+') is not None
        poco_minus_exists = api_client.check_tag_exists('POCO-') is not None
        new_tag_exists = api_client.check_tag_exists('NEW') is not None
        
        if not (poco_score_exists and poco_ocr_exists and poco_plus_exists and poco_minus_exists and new_tag_exists):
            return jsonify({
                'error': 'Cannot start background processing: Missing required custom fields or tags. Please fix in Settings > Data Validation.',
                'validation_required': True
            }), 400
        
        # Extract filters and dry_run mode from request
        filters = data.get('filters', {})
        dry_run = data.get('dry_run', False)
        
        # Manual processing bypasses auto-pause check and uses provided filters
        result = background_processor.process_batch(
            user_session=session,
            filters=filters,
            dry_run=dry_run
        )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in manual processing: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/background/history', methods=['GET'])
@require_auth
def get_processing_history():
    """Get processing history with optional document details"""
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        status = request.args.get('status', None)
        include_details = request.args.get('include_details', 'true').lower() == 'true'
        details_limit = request.args.get('details_limit', 100, type=int)
        
        history = db.get_processing_history(limit=limit, status=status, offset=offset)
        
        # Optionally include document details for each run (limited to first N per run)
        if include_details:
            for run in history:
                run_id = run['id']
                run['details'] = db.get_processing_details(run_id, limit=details_limit)
        
        return jsonify({
            'history': history,
            'count': len(history)
        })
    except Exception as e:
        logger.error(f"Error getting processing history: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/background/history/<int:run_id>/details', methods=['GET'])
@require_auth
def get_processing_run_details(run_id):
    """Get detailed processing information for a specific run"""
    try:
        limit = request.args.get('limit', None, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        details = db.get_processing_details(run_id, limit=limit, offset=offset)
        
        return jsonify({
            'run_id': run_id,
            'details': details,
            'count': len(details)
        })
    except Exception as e:
        logger.error(f"Error getting processing run details: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/background/settings', methods=['GET'])
@require_auth
def get_background_settings():
    """Get background processing settings"""
    try:
        settings = {
            'bg_enabled': db.get_config('bg_enabled') == 'true',
            'bg_debounce_seconds': int(db.get_config('bg_debounce_seconds') or '30'),
            'bg_tag_new': db.get_config('bg_tag_new') or 'NEW',
            'bg_tag_poco': db.get_config('bg_tag_poco') or 'POCO',
            'bg_remove_new_tag': db.get_config('bg_remove_new_tag') == 'true',
            'history_retention_type': db.get_config('history_retention_type') or 'days',
            'history_retention_days': int(db.get_config('history_retention_days') or '365'),
            'history_retention_count': int(db.get_config('history_retention_count') or '100')
        }
        
        return jsonify(settings)
    except Exception as e:
        logger.error(f"Error getting background settings: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/background/settings', methods=['POST'])
@require_admin
def update_background_settings():
    """Update background processing settings (admin only)"""
    try:
        data = request.json
        
        if 'bg_enabled' in data:
            db.set_config('bg_enabled', 'true' if data['bg_enabled'] else 'false')
        
        if 'bg_debounce_seconds' in data:
            db.set_config('bg_debounce_seconds', str(int(data['bg_debounce_seconds'])))
        
        if 'bg_tag_new' in data:
            db.set_config('bg_tag_new', data['bg_tag_new'])
        
        if 'bg_tag_poco' in data:
            db.set_config('bg_tag_poco', data['bg_tag_poco'])
        
        if 'bg_remove_new_tag' in data:
            db.set_config('bg_remove_new_tag', 'true' if data['bg_remove_new_tag'] else 'false')
        
        if 'history_retention_type' in data:
            retention_type = data['history_retention_type']
            if retention_type not in ['days', 'count']:
                return jsonify({'error': 'Invalid retention type. Must be "days" or "count"'}), 400
            db.set_config('history_retention_type', retention_type)
        
        if 'history_retention_days' in data:
            days = int(data['history_retention_days'])
            if days < 1:
                return jsonify({'error': 'Retention days must be at least 1'}), 400
            db.set_config('history_retention_days', str(days))
        
        if 'history_retention_count' in data:
            count = int(data['history_retention_count'])
            if count < 1:
                return jsonify({'error': 'Retention count must be at least 1'}), 400
            db.set_config('history_retention_count', str(count))
        
        return jsonify({'success': True, 'message': 'Settings updated'})
    except Exception as e:
        logger.error(f"Error updating background settings: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ---- System API Token Management Routes ----

@app.route('/api/system-token', methods=['GET'])
@require_admin
def get_system_token_info():
    """Get information about the system API token (admin only).
    
    Returns metadata about the token, not the token itself.
    The actual token is only shown once when generated.
    """
    try:
        token_info = db.get_system_token_info()
        if token_info:
            return jsonify({
                'exists': True,
                'created_at': token_info['created_at']
            })
        else:
            return jsonify({
                'exists': False,
                'created_at': None
            })
    except Exception as e:
        logger.error(f"Error getting system token info: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/system-token', methods=['POST'])
@require_admin
def generate_system_token():
    """Generate a new system API token (admin only).
    
    This will invalidate any existing token.
    The raw token is only returned once - it cannot be retrieved later.
    """
    try:
        # Generate new token (this revokes the old one)
        raw_token = db.generate_system_token()
        
        logger.info(f"System API token generated by user {request.current_user.get('username', 'admin')}")
        
        return jsonify({
            'success': True,
            'token': raw_token,
            'message': 'New system API token generated. Save this token now - it cannot be retrieved later.',
            'created_at': db.get_config('system_api_token_created')
        })
    except Exception as e:
        logger.error(f"Error generating system token: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/system-token', methods=['DELETE'])
@require_admin
def revoke_system_token():
    """Revoke the system API token (admin only).
    
    After revoking, the trigger endpoint will only accept session-based auth.
    """
    try:
        db.revoke_system_token()
        
        logger.info(f"System API token revoked by user {request.current_user.get('username', 'admin')}")
        
        return jsonify({
            'success': True,
            'message': 'System API token has been revoked.'
        })
    except Exception as e:
        logger.error(f"Error revoking system token: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ---- Sync Count Comparison Route ----

@app.route('/api/sync/counts', methods=['GET'])
@require_auth
def get_sync_counts():
    """Compare entity counts between Paperless and local cache to detect sync drift."""
    try:
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        config = Config()
        config.paperless_url = paperless_url
        config.paperless_token = session['paperless_token']
        api_client = PaperlessAPIClient(config, db)
        
        # Get counts from Paperless (using page_size=1 for lightweight queries)
        paperless_counts = {}
        local_counts = {}
        
        # Query Paperless counts
        try:
            resp = api_client.session.get(f"{paperless_url}/api/correspondents/?page_size=1", timeout=10)
            paperless_counts['correspondents'] = resp.json().get('count', 0) if resp.status_code == 200 else 0
        except:
            paperless_counts['correspondents'] = 0
        
        try:
            resp = api_client.session.get(f"{paperless_url}/api/tags/?page_size=1", timeout=10)
            paperless_counts['tags'] = resp.json().get('count', 0) if resp.status_code == 200 else 0
        except:
            paperless_counts['tags'] = 0
        
        try:
            resp = api_client.session.get(f"{paperless_url}/api/document_types/?page_size=1", timeout=10)
            paperless_counts['document_types'] = resp.json().get('count', 0) if resp.status_code == 200 else 0
        except:
            paperless_counts['document_types'] = 0
        
        try:
            resp = api_client.session.get(f"{paperless_url}/api/custom_fields/?page_size=1", timeout=10)
            paperless_counts['custom_fields'] = resp.json().get('count', 0) if resp.status_code == 200 else 0
        except:
            paperless_counts['custom_fields'] = 0
        
        # Get local cached counts
        conn = db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) as count FROM paperless_correspondents")
        local_counts['correspondents'] = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM paperless_tags")
        local_counts['tags'] = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM paperless_document_types")
        local_counts['document_types'] = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM paperless_custom_fields")
        local_counts['custom_fields'] = cursor.fetchone()['count']
        
        conn.close()
        
        # Check if sync is needed
        needs_sync = any(paperless_counts[k] != local_counts[k] for k in paperless_counts.keys())
        
        return jsonify({
            'paperless_counts': paperless_counts,
            'local_counts': local_counts,
            'needs_sync': needs_sync
        })
    except Exception as e:
        logger.error(f"Error getting sync counts: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ---- Startup Cleanup & System Maintenance ----

try:
    logger.info("Running processing history cleanup on startup...")
    deleted_count = db.cleanup_old_processing_history()
    if deleted_count > 0:
        logger.info(f"Startup cleanup: Deleted {deleted_count} old processing runs")
    else:
        logger.info("Startup cleanup: No old processing runs to delete")
except Exception as e:
    logger.warning(f"Startup cleanup failed (non-critical): {e}")

def table_exists(cursor, table_name):
    """Check if a table exists in the database"""
    try:
        cursor.execute(f"PRAGMA table_info({table_name})")
        return cursor.fetchone() is not None
    except:
        return False

@app.route('/api/system/reset-app', methods=['POST'])
@require_admin
def reset_application():
    """Reset application to initial installation state (admin only)"""
    try:
        # Clear all sessions first
        db.clear_all_sessions()
        
        # Reset setup_completed flag
        db.set_config('setup_completed', '0')
        
        # Delete all rules (cascade deletes related records)
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Delete all data while preserving database structure
        # Check each table exists before deleting (gracefully handle missing tables)
        tables_to_clear = [
            'classification_runs',
            'rule_patterns',
            'rules',
            'rule_sets',
            'sessions',
            'app_logs'
        ]
        
        for table in tables_to_clear:
            if table_exists(cursor, table):
                cursor.execute(f"DELETE FROM {table}")
        
        # Clear app_settings but preserve paperless_url
        if table_exists(cursor, 'app_settings'):
            cursor.execute("DELETE FROM app_settings WHERE key NOT IN ('paperless_url')")
        
        conn.commit()
        conn.close()
        
        logger.info('Application reset by admin', extra={
            'level': 'warning',
            'detail': f'Application reset to initial state by user {request.current_user["user_id"]}',
            'source': 'system'
        })
        
        return jsonify({'success': True, 'message': 'Application reset complete'})
    except Exception as e:
        logger.error(f"Error resetting application: {e}")
        return jsonify({'error': str(e)}), 500

# ---- Development Server Entry Point ----

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
