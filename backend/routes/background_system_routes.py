"""Background processing and system-maintenance routes."""

from flask import Blueprint, jsonify, request

from backend.api_client import PaperlessAPIClient
from backend.background_processor import BackgroundProcessor
from backend.config import Config
from backend.routes.auth_users import (
    require_admin,
    require_auth,
    require_system_token_or_admin,
)

background_system_bp = Blueprint("background_system", __name__)

db = None
logger = None
background_processor = None
# ---- Background Processing Routes ----


@background_system_bp.route('/api/background/trigger', methods=['POST'])
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
            if not db.get_background_paperless_token_info():
                return jsonify({
                    'error': 'Cannot start background processing: No background automation token configured in PocoClass settings.'
                }), 400
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
        return jsonify({'error': 'Internal server error'}), 500

@background_system_bp.route('/api/background/status', methods=['GET'])
@require_auth
def get_background_status():
    """Get background processing status"""
    try:
        status = background_processor.get_status()
        return jsonify(status)
    except Exception as e:
        logger.error(f"Error getting background status: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@background_system_bp.route('/api/background/process', methods=['POST'])
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
        return jsonify({'error': 'Internal server error'}), 500

@background_system_bp.route('/api/background/history', methods=['GET'])
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
        return jsonify({'error': 'Internal server error'}), 500

@background_system_bp.route('/api/background/history/<int:run_id>/details', methods=['GET'])
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
        return jsonify({'error': 'Internal server error'}), 500

@background_system_bp.route('/api/background/settings', methods=['GET'])
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
        return jsonify({'error': 'Internal server error'}), 500

@background_system_bp.route('/api/background/settings', methods=['POST'])
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
        return jsonify({'error': 'Internal server error'}), 500

# ---- System API Token Management Routes ----

@background_system_bp.route('/api/system-token', methods=['GET'])
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
        return jsonify({'error': 'Internal server error'}), 500

@background_system_bp.route('/api/system-token', methods=['POST'])
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
        return jsonify({'error': 'Internal server error'}), 500

@background_system_bp.route('/api/system-token', methods=['DELETE'])
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
        return jsonify({'error': 'Internal server error'}), 500


@background_system_bp.route('/api/background/automation-token', methods=['GET'])
@require_admin
def get_background_automation_token_info():
    """Get metadata about the stored Paperless automation token (admin only)."""
    try:
        token_info = db.get_background_paperless_token_info()
        if token_info:
            return jsonify({
                'exists': True,
                'created_at': token_info['created_at']
            })
        return jsonify({
            'exists': False,
            'created_at': None
        })
    except Exception as e:
        logger.error(f"Error getting background automation token info: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@background_system_bp.route('/api/background/automation-token', methods=['POST'])
@require_admin
def set_background_automation_token():
    """Store the Paperless API token used for automatic background processing."""
    try:
        data = request.json or {}
        raw_token = (data.get('paperless_token') or '').strip()
        if not raw_token:
            return jsonify({'error': 'Paperless API token is required'}), 400

        paperless_url = db.get_config('paperless_url')
        if not paperless_url:
            return jsonify({'error': 'Paperless URL is not configured'}), 400

        config = Config()
        config.paperless_token = raw_token
        config.paperless_url = paperless_url
        api_client = PaperlessAPIClient(config, db)

        if not api_client.test_connection():
            return jsonify({'error': 'Paperless API token is invalid or cannot access the configured Paperless URL'}), 400

        db.set_background_paperless_token(raw_token)

        logger.info(
            "Background automation token stored by user %s",
            request.current_user.get('username', 'admin')
        )

        return jsonify({
            'success': True,
            'message': 'Background automation token stored successfully.',
            'created_at': db.get_config('bg_paperless_token_created')
        })
    except Exception as e:
        logger.error(f"Error storing background automation token: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@background_system_bp.route('/api/background/automation-token', methods=['DELETE'])
@require_admin
def revoke_background_automation_token():
    """Delete the stored Paperless API token used for automatic background processing."""
    try:
        db.revoke_background_paperless_token()

        logger.info(
            "Background automation token revoked by user %s",
            request.current_user.get('username', 'admin')
        )

        return jsonify({
            'success': True,
            'message': 'Background automation token has been revoked.'
        })
    except Exception as e:
        logger.error(f"Error revoking background automation token: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

# ---- Sync Count Comparison Route ----

@background_system_bp.route('/api/sync/counts', methods=['GET'])
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
        return jsonify({'error': 'Internal server error'}), 500


def table_exists(cursor, table_name):
    """Check if a table exists in the database"""
    try:
        cursor.execute(f"PRAGMA table_info({table_name})")
        return cursor.fetchone() is not None
    except:
        return False

@background_system_bp.route('/api/system/reset-app', methods=['POST'])
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
        return jsonify({'error': 'Internal server error'}), 500



def init_background_system_routes(app, db_instance, logger_instance):
    """Inject dependencies and register background/system routes."""
    global db, logger, background_processor

    db = db_instance
    logger = logger_instance
    background_processor = BackgroundProcessor(db_instance)

    if "background_system" not in app.blueprints:
        app.register_blueprint(background_system_bp)
