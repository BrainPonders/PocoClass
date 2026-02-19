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
        from backend.api_client import PaperlessAPIClient
        from backend.config import Config
        
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
        session_token = request.cookies.get(COOKIE_NAME)
        if not session_token:
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

# ---- Background Processing Routes ----

from backend.background_processor import BackgroundProcessor
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
        
        result = background_processor.trigger_processing(user_session=session)
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
