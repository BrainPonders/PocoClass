"""
POCOmeta REST API
Provides API endpoints for the POCOclass frontend
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import yaml
import json
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
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize components
config = Config()
db = Database()
rule_loader = RuleLoader('rules')
paperless_api = PaperlessAPIClient(config, db)
test_engine = TestEngine()
sync_service = SyncService(db)

# Helper function to check if sync is needed
def should_sync(entity_type='all', max_age_minutes=60):
    """Check if sync is needed based on last sync time"""
    try:
        if entity_type == 'all':
            # Check if any entity type needs sync
            for entity in ['correspondents', 'tags', 'document_types', 'custom_fields']:
                last_sync = db.get_last_sync_time(entity)
                if not last_sync:
                    return True  # Never synced
                
                from datetime import datetime, timedelta
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

# Authentication decorator
def require_auth(f):
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

# Authentication Endpoints
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
        
        # Remove trailing slash from URL
        if paperless_url.endswith('/'):
            paperless_url = paperless_url[:-1]
        
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
            
            # Get user info from Paperless (try multiple endpoints for compatibility)
            user_info = None
            paperless_user_id = None
            is_superuser = False
            
            # Try /api/users/me/ first (Paperless-ngx modern)
            try:
                user_response = requests.get(
                    f'{paperless_url}/api/users/me/',
                    headers={'Authorization': f'Token {paperless_token}'},
                    timeout=10
                )
                
                if user_response.status_code == 200:
                    user_info = user_response.json()
                    paperless_user_id = user_info.get('id')
                    is_superuser = user_info.get('is_superuser', False)
                else:
                    logger.warning(f"/api/users/me/ returned {user_response.status_code}, trying alternative endpoints")
            except Exception as e:
                logger.warning(f"Error calling /api/users/me/: {e}")
            
            # Fallback: try to get user list and find current user
            if not user_info:
                try:
                    users_response = requests.get(
                        f'{paperless_url}/api/users/',
                        headers={'Authorization': f'Token {paperless_token}'},
                        timeout=10
                    )
                    
                    if users_response.status_code == 200:
                        users_data = users_response.json()
                        users = users_data.get('results', []) if isinstance(users_data, dict) else users_data
                        
                        # Find user by username
                        for user in users:
                            if user.get('username') == username:
                                user_info = user
                                paperless_user_id = user.get('id')
                                is_superuser = user.get('is_superuser', False)
                                logger.info(f"Found user via /api/users/ endpoint")
                                break
                except Exception as e:
                    logger.warning(f"Error calling /api/users/: {e}")
            
            # If we still don't have user info, use a fallback approach
            if not paperless_user_id:
                logger.warning(f"Could not get user ID from Paperless, using username hash as fallback")
                # Use a hash of username as paperless_user_id for internal tracking
                import hashlib
                paperless_user_id = int(hashlib.md5(username.encode()).hexdigest()[:8], 16)
                is_superuser = True  # Make first user admin by default
            
            # Create first admin user
            role = 'admin' if is_superuser else 'user'
            user_id = db.create_user(username, paperless_user_id, role)
            
            # Complete setup
            db.complete_setup(paperless_url)
            
            # Create session
            session_token = db.create_session(user_id, paperless_token)
            
            # Initial sync on setup
            try:
                logger.info(f"Performing initial sync of Paperless data...")
                sync_service.sync_all(paperless_token, paperless_url)
                logger.info(f"Initial sync completed successfully")
            except Exception as e:
                logger.warning(f"Initial sync failed (non-critical): {e}")
            
            logger.info(f"Setup completed by user: {username}")
            
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
                return jsonify({'error': 'Invalid credentials'}), 401
            
            paperless_token = auth_response.json().get('token')
            
            # Get user info from Paperless (try multiple endpoints for compatibility)
            user_info = None
            paperless_user_id = None
            
            # Try /api/users/me/ first (Paperless-ngx modern)
            try:
                user_response = requests.get(
                    f'{paperless_url}/api/users/me/',
                    headers={'Authorization': f'Token {paperless_token}'},
                    timeout=10
                )
                
                if user_response.status_code == 200:
                    user_info = user_response.json()
                    paperless_user_id = user_info.get('id')
                else:
                    logger.warning(f"/api/users/me/ returned {user_response.status_code}, trying alternative endpoints")
            except Exception as e:
                logger.warning(f"Error calling /api/users/me/: {e}")
            
            # Fallback: try to get user list and find current user
            if not user_info:
                try:
                    users_response = requests.get(
                        f'{paperless_url}/api/users/',
                        headers={'Authorization': f'Token {paperless_token}'},
                        timeout=10
                    )
                    
                    if users_response.status_code == 200:
                        users_data = users_response.json()
                        users = users_data.get('results', []) if isinstance(users_data, dict) else users_data
                        
                        # Find user by username
                        for user in users:
                            if user.get('username') == username:
                                user_info = user
                                paperless_user_id = user.get('id')
                                logger.info(f"Found user via /api/users/ endpoint")
                                break
                except Exception as e:
                    logger.warning(f"Error calling /api/users/: {e}")
            
            # If we still don't have user info, use a fallback approach
            if not paperless_user_id:
                logger.warning(f"Could not get user ID from Paperless, using username hash as fallback")
                # Use a hash of username as paperless_user_id for internal tracking
                import hashlib
                paperless_user_id = int(hashlib.md5(username.encode()).hexdigest()[:8], 16)
            
            # Get or create user in POCOclass
            user = db.get_user_by_paperless_id(paperless_user_id)
            if not user:
                # Create new user with default 'user' role
                user_id = db.create_user(username, paperless_user_id, 'user')
                user = db.get_user_by_id(user_id)
            else:
                user_id = user['id']
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
            
            return jsonify({
                'success': True,
                'sessionToken': session_token,
                'user': {
                    'id': user_id,
                    'username': username,
                    'role': user['pococlass_role']
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

@app.route('/api/users', methods=['GET'])
@require_admin
def list_all_users():
    """List all users (admin only)"""
    try:
        users = db.list_users()
        return jsonify(users)
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

@app.route('/api/users/all-paperless', methods=['GET'])
@require_admin
def get_all_paperless_users():
    """Get all Paperless users with their POCOclass status (admin only)"""
    try:
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        
        # Fetch all Paperless users
        headers = {
            'Authorization': f'Token {session["paperless_token"]}',
            'Content-Type': 'application/json'
        }
        # Fetch users from Paperless
        response = requests.get(f"{paperless_url}/api/users/", headers=headers)
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
        groups_response = requests.get(f"{paperless_url}/api/groups/", headers=headers)
        groups_response.raise_for_status()
        groups_data = groups_response.json()
        
        # Build group ID -> name mapping
        group_map = {}
        if isinstance(groups_data, list):
            group_map = {g['id']: g['name'] for g in groups_data}
        elif isinstance(groups_data, dict) and 'results' in groups_data:
            group_map = {g['id']: g['name'] for g in groups_data['results']}
        
        # Get POCOclass users
        pococlass_users = db.list_users()
        pococlass_map = {u['paperless_user_id']: u for u in pococlass_users}
        
        # Merge data
        result = []
        for paperless_user in paperless_users:
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
                'paperless_id': paperless_user['id'],
                'paperless_username': paperless_user['username'],
                'paperless_groups': group_names,
                'is_active': paperless_user.get('is_active', False),
                'is_staff': paperless_user.get('is_staff', False),
                'is_superuser': paperless_user.get('is_superuser', False),
                'is_registered': pococlass_user is not None,
                'is_enabled': pococlass_user['is_enabled'] == 1 if pococlass_user else False,
                'pococlass_id': pococlass_user['id'] if pococlass_user else None,
                'pococlass_role': pococlass_user['pococlass_role'] if pococlass_user else None,
                'last_login': pococlass_user['last_login'] if pococlass_user else None
            })
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error fetching Paperless users: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:paperless_user_id>/enable', methods=['POST'])
@require_admin
def enable_user_endpoint(paperless_user_id):
    """Enable a user (admin only)"""
    try:
        # Check if user exists in POCOclass database
        pococlass_user = db.get_user_by_paperless_id(paperless_user_id)
        
        if pococlass_user:
            # User exists, just enable them
            db.enable_user(paperless_user_id)
        else:
            # User doesn't exist, fetch from Paperless and create
            session = request.current_user
            paperless_url = db.get_config('paperless_url')
            headers = {
                'Authorization': f'Token {session["paperless_token"]}',
                'Content-Type': 'application/json'
            }
            response = requests.get(f"{paperless_url}/api/users/", headers=headers)
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
            
            # Find the user
            target_user = next((u for u in paperless_users if u['id'] == paperless_user_id), None)
            if not target_user:
                return jsonify({'error': 'User not found in Paperless'}), 404
            
            # Create the user as enabled
            db.create_user(target_user['username'], paperless_user_id, role='user')
            db.enable_user(paperless_user_id)
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error enabling user: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:paperless_user_id>/disable', methods=['POST'])
@require_admin
def disable_user_endpoint(paperless_user_id):
    """Disable a user (admin only)"""
    try:
        # Check if user exists
        pococlass_user = db.get_user_by_paperless_id(paperless_user_id)
        
        if not pococlass_user:
            return jsonify({'error': 'User not registered in POCOclass'}), 404
        
        # Prevent disabling the specific user named "Admin"
        # Fetch the Paperless username to check
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        headers = {
            'Authorization': f'Token {session["paperless_token"]}',
            'Content-Type': 'application/json'
        }
        response = requests.get(f"{paperless_url}/api/users/{paperless_user_id}/", headers=headers)
        response.raise_for_status()
        paperless_user = response.json()
        
        if paperless_user['username'].lower() == 'admin':
            return jsonify({'error': 'Cannot disable the Admin user'}), 400
        
        db.disable_user(paperless_user_id)
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error disabling user: {e}")
        return jsonify({'error': str(e)}), 500

# Sync Endpoints
@app.route('/api/sync', methods=['POST'])
@require_admin
def trigger_sync():
    """Trigger a full sync of Paperless data (admin only)"""
    try:
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        
        results = sync_service.sync_all(session['paperless_token'], paperless_url)
        
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

# Settings Endpoints
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

# Serve React App
@app.route('/')
@app.route('/<path:path>')
def serve_react_app(path=''):
    static_folder = app.static_folder or 'frontend/dist'
    if path and os.path.exists(os.path.join(static_folder, path)):
        return send_from_directory(static_folder, path)
    return send_from_directory(static_folder, 'index.html')

# Rule Endpoints
@app.route('/api/rules', methods=['GET'])
def list_rules():
    """List all rules"""
    try:
        rules = rule_loader.load_all_rules()
        order_by = request.args.get('order_by', '-created_date')
        
        # Convert rules to API format
        rules_list = []
        for rule_id, rule_data in rules.items():
            rules_list.append({
                'id': rule_id,
                'ruleName': rule_data.get('rule_name', rule_id),
                'ruleId': rule_id,
                'description': rule_data.get('description', ''),
                'status': rule_data.get('status', 'draft'),
                'threshold': rule_data.get('threshold', 75),
                'ocrThreshold': rule_data.get('ocr_threshold', 75),
                'created_date': rule_data.get('created_date', datetime.now().isoformat()),
                **rule_data
            })
        
        # Sort rules
        if order_by.startswith('-'):
            rules_list.sort(key=lambda x: x.get(order_by[1:], ''), reverse=True)
        else:
            rules_list.sort(key=lambda x: x.get(order_by, ''))
        
        return jsonify(rules_list)
    except Exception as e:
        logger.error(f"Error listing rules: {e}")
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

@app.route('/api/rules', methods=['POST'])
def create_rule():
    """Create a new rule"""
    try:
        rule_data = request.json
        rule_id = rule_data.get('ruleId')
        
        if not rule_id:
            return jsonify({'error': 'Rule ID is required'}), 400
        
        # Convert frontend format to backend YAML format
        backend_rule = convert_frontend_to_backend(rule_data)
        
        # Save rule
        rule_file = os.path.join('rules', f'{rule_id}.yaml')
        with open(rule_file, 'w') as f:
            yaml.dump(backend_rule, f, default_flow_style=False, sort_keys=False)
        
        return jsonify({'id': rule_id, 'message': 'Rule created successfully'})
    except Exception as e:
        logger.error(f"Error creating rule: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rules/<rule_id>', methods=['PUT'])
def update_rule(rule_id):
    """Update an existing rule"""
    try:
        rule_data = request.json
        
        # Convert frontend format to backend YAML format
        backend_rule = convert_frontend_to_backend(rule_data)
        
        # Save rule
        rule_file = os.path.join('rules', f'{rule_id}.yaml')
        with open(rule_file, 'w') as f:
            yaml.dump(backend_rule, f, default_flow_style=False, sort_keys=False)
        
        return jsonify({'id': rule_id, 'message': 'Rule updated successfully'})
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

@app.route('/api/rules/<rule_id>/test', methods=['POST'])
def test_rule(rule_id):
    """Test a rule against a document"""
    try:
        data = request.json
        document_id = data.get('documentId')
        
        # TODO: Implement rule testing logic
        # This will use the new scoring algorithm
        
        return jsonify({
            'success': True,
            'results': {
                'poco_ocr_score': 0,
                'poco_score': 0,
                'matched': False,
                'details': {}
            }
        })
    except Exception as e:
        logger.error(f"Error testing rule {rule_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs', methods=['GET'])
def list_logs():
    """List logs"""
    try:
        # TODO: Implement log retrieval from log file
        return jsonify([])
    except Exception as e:
        logger.error(f"Error listing logs: {e}")
        return jsonify({'error': str(e)}), 500

def convert_frontend_to_backend(frontend_data):
    """Convert frontend rule format to backend YAML format"""
    backend = {
        'rule_name': frontend_data.get('ruleName', ''),
        'description': frontend_data.get('description', ''),
        'threshold': frontend_data.get('threshold', 75),
        'ocr_threshold': frontend_data.get('ocrThreshold', 75),
        'ocr_multiplier': frontend_data.get('ocrMultiplier', 3),
        'filename_multiplier': frontend_data.get('filenameMultiplier', 1),
        'verification_multiplier': frontend_data.get('verificationMultiplier', 0.5),
        'status': frontend_data.get('status', 'draft'),
    }
    
    # OCR Identifiers
    if frontend_data.get('ocrIdentifiers'):
        backend['logic_groups'] = []
        for group in frontend_data['ocrIdentifiers']:
            backend_group = {
                'type': group.get('type', 'match'),
                'mandatory': group.get('mandatory', False),
                'patterns': []
            }
            for condition in group.get('conditions', []):
                backend_group['patterns'].append({
                    'text': condition.get('pattern', ''),
                    'range': condition.get('range', '0-1600')
                })
            backend['logic_groups'].append(backend_group)
    
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
    
    # Dynamic Metadata
    if frontend_data.get('dynamicData', {}).get('extractionRules'):
        backend['dynamic_metadata'] = {}
        for rule in frontend_data['dynamicData']['extractionRules']:
            target = rule.get('targetField')
            if target == 'dateCreated':
                backend['dynamic_metadata']['date_created'] = {
                    'pattern_before': rule.get('beforeAnchor', {}).get('pattern', ''),
                    'pattern_after': rule.get('afterAnchor', {}).get('pattern', ''),
                    'format': rule.get('dateFormat', '')
                }
            elif target == 'tags':
                if 'extracted_tags' not in backend['dynamic_metadata']:
                    backend['dynamic_metadata']['extracted_tags'] = []
                backend['dynamic_metadata']['extracted_tags'].append({
                    'pattern': rule.get('regexPattern', ''),
                    'value': rule.get('tagValue', '')
                })
    
    # Filename Patterns
    if frontend_data.get('filenamePatterns'):
        backend['filename_patterns'] = frontend_data['filenamePatterns'].get('patterns', [])
    
    # Verification
    if frontend_data.get('verification'):
        backend['verification_fields'] = list(frontend_data['verification'].get('enabledFields', {}).keys())
    
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
        'status': backend_data.get('status', 'draft'),
        'ocrIdentifiers': [],
        'predefinedData': {},
        'dynamicData': {'extractionRules': []},
        'filenamePatterns': {'patterns': [], 'dateFormats': []},
        'verification': {'enabledFields': {}}
    }
    
    # Convert logic groups to OCR identifiers
    if backend_data.get('logic_groups'):
        for group in backend_data['logic_groups']:
            frontend_group = {
                'type': group.get('type', 'match'),
                'mandatory': group.get('mandatory', False),
                'conditions': []
            }
            for pattern in group.get('patterns', []):
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
            'documentCategory': sm.get('custom_fields', {}).get('Document Category', '')
        }
    
    # Filename patterns
    if backend_data.get('filename_patterns'):
        frontend['filenamePatterns']['patterns'] = backend_data['filename_patterns']
    
    return frontend

# Test/Execute Endpoints
@app.route('/api/rules/test', methods=['POST'])
def test_rule_endpoint():
    """Test a rule against document content"""
    try:
        data = request.json
        rule_data = data.get('rule')
        document_content = data.get('documentContent', '')
        document_filename = data.get('documentFilename', 'test.pdf')
        paperless_metadata = data.get('paperlessMetadata', None)
        
        if not rule_data:
            return jsonify({'error': 'Rule data is required'}), 400
        
        # Convert frontend format to backend format if needed
        backend_rule = convert_frontend_to_backend(rule_data)
        
        # Test the rule
        result = test_engine.test_rule(
            backend_rule,
            document_content,
            document_filename,
            paperless_metadata
        )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error testing rule: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rules/<rule_id>/execute', methods=['POST'])
def execute_rule_endpoint(rule_id):
    """Execute a rule against a Paperless document"""
    try:
        data = request.json
        document_id = data.get('documentId')
        dry_run = data.get('dryRun', True)
        
        if not document_id:
            return jsonify({'error': 'Document ID is required'}), 400
        
        # Load rule
        rule_file = Path('rules') / f'{rule_id}.yaml'
        rule_data = rule_loader.load_rule_file(rule_file)
        if not rule_data:
            return jsonify({'error': 'Rule not found'}), 404
        
        # Get document from Paperless
        document = paperless_api.get_document(document_id)
        if not document:
            return jsonify({'error': 'Document not found in Paperless'}), 404
        
        # Get document content
        content = paperless_api.get_document_content(document_id)
        if not content:
            return jsonify({'error': 'Could not retrieve document content'}), 500
        
        # Execute rule
        result = test_engine.execute_rule(
            rule_data,
            document_id,
            content,
            document.get('original_file_name', 'unknown.pdf'),
            document,
            dry_run
        )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error executing rule: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    # In development, run with debug mode on port 8000
    # Frontend Vite runs on port 5000 and proxies API requests to 8000
    app.run(host='0.0.0.0', port=8000, debug=True)
