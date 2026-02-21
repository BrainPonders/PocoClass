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
import json
from datetime import datetime
from pathlib import Path
import logging

from backend.rule_loader import RuleLoader
from backend.api_client import PaperlessAPIClient
from backend.config import Config
from backend.test_engine import TestEngine
from backend.database import Database
from backend.sync_service import SyncService
from backend.routes.auth_users import (
    init_auth_users,
    list_all_users,
    require_auth,
    require_admin,
    require_system_token_or_admin,
)
from backend.routes.settings_sync import init_settings_sync
from backend.routes.rules_routes import init_rules_routes
from backend.routes.documents_routes import init_documents_routes
from backend.routes.background_system_routes import init_background_system_routes
import requests

app = Flask(__name__, static_folder=None)

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

@app.after_request
def add_security_headers(response):
    """Add security headers to all responses."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'"
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    if request.scheme == 'https':
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

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

COOKIE_NAME = 'pococlass_session'
init_auth_users(
    app=app,
    db_instance=db,
    logger_instance=logger,
    sync_service_instance=sync_service,
    should_sync=should_sync,
)

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

init_settings_sync(app=app, db_instance=db, logger_instance=logger, sync_service_instance=sync_service)
init_rules_routes(
    app=app,
    db_instance=db,
    logger_instance=logger,
    rule_loader_instance=rule_loader,
    test_engine_instance=test_engine,
)

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

# ---- Log Routes ----

@app.route('/api/logs', methods=['GET'])
@require_auth
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

init_documents_routes(app=app, db_instance=db, logger_instance=logger)

init_background_system_routes(app=app, db_instance=db, logger_instance=logger)

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

# ---- SPA Catch-All Route (must be last) ----

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')

@app.route('/')
@app.route('/<path:path>')
def serve_react_app(path=''):
    """Serve the React SPA; falls back to index.html for client-side routing."""
    if path and os.path.exists(os.path.join(STATIC_DIR, path)):
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, 'index.html')

# ---- Development Server Entry Point ----

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=os.environ.get('FLASK_DEBUG', 'false').lower() == 'true')
