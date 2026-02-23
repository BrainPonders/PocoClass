"""Sync, settings, Paperless cache, and validation routes."""

from flask import Blueprint, jsonify, request

from backend.api_client import PaperlessAPIClient
from backend.config import Config
from backend.routes.auth_users import (
    normalize_paperless_url,
    require_admin,
    require_auth,
)

settings_sync_bp = Blueprint("settings_sync", __name__)

db = None
logger = None
sync_service = None
# ---- Sync Routes ----

@settings_sync_bp.route('/api/sync', methods=['POST'])
@require_auth
def trigger_sync():
    """Trigger a full sync of Paperless data - does NOT auto-create mandatory items"""
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

@settings_sync_bp.route('/api/sync/status', methods=['GET'])
@require_auth
def get_sync_status():
    """Get current sync status"""
    try:
        status = sync_service.get_sync_status()
        return jsonify(status)
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        return jsonify({'error': str(e)}), 500

@settings_sync_bp.route('/api/sync/history', methods=['GET'])
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

@settings_sync_bp.route('/api/paperless/correspondents', methods=['GET'])
@require_auth
def get_cached_correspondents():
    """Get cached correspondents"""
    try:
        correspondents = db.get_all_correspondents()
        return jsonify(correspondents)
    except Exception as e:
        logger.error(f"Error getting correspondents: {e}")
        return jsonify({'error': str(e)}), 500

@settings_sync_bp.route('/api/paperless/tags', methods=['GET'])
@require_auth
def get_cached_tags():
    """Get cached tags"""
    try:
        tags = db.get_all_tags()
        return jsonify(tags)
    except Exception as e:
        logger.error(f"Error getting tags: {e}")
        return jsonify({'error': str(e)}), 500

@settings_sync_bp.route('/api/paperless/document-types', methods=['GET'])
@require_auth
def get_cached_document_types():
    """Get cached document types"""
    try:
        doc_types = db.get_all_document_types()
        return jsonify(doc_types)
    except Exception as e:
        logger.error(f"Error getting document types: {e}")
        return jsonify({'error': str(e)}), 500

@settings_sync_bp.route('/api/paperless/custom-fields', methods=['GET'])
@require_auth
def get_cached_custom_fields():
    """Get cached custom fields"""
    try:
        custom_fields = db.get_all_custom_fields()
        return jsonify(custom_fields)
    except Exception as e:
        logger.error(f"Error getting custom fields: {e}")
        return jsonify({'error': str(e)}), 500

@settings_sync_bp.route('/api/paperless/custom-fields', methods=['POST'])
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

@settings_sync_bp.route('/api/settings', methods=['GET'])
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

@settings_sync_bp.route('/api/settings/<key>', methods=['PUT'])
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

@settings_sync_bp.route('/api/settings/app', methods=['GET'])
@require_auth
def get_app_settings():
    """Get all app settings"""
    try:
        settings = db.get_all_app_settings()
        return jsonify(settings)
    except Exception as e:
        logger.error(f"Error getting app settings: {e}")
        return jsonify({'error': str(e)}), 500

@settings_sync_bp.route('/api/settings/app', methods=['POST'])
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

@settings_sync_bp.route('/api/settings/date-formats', methods=['GET'])
@require_auth
def get_date_formats():
    """Get all date formats"""
    try:
        formats = db.get_all_date_formats()
        return jsonify(formats)
    except Exception as e:
        logger.error(f"Error getting date formats: {e}")
        return jsonify({'error': str(e)}), 500

@settings_sync_bp.route('/api/settings/date-formats/selected', methods=['GET'])
@require_auth
def get_selected_date_formats():
    """Get selected date formats"""
    try:
        formats = db.get_selected_date_formats()
        return jsonify(formats)
    except Exception as e:
        logger.error(f"Error getting selected date formats: {e}")
        return jsonify({'error': str(e)}), 500

@settings_sync_bp.route('/api/settings/date-formats/<path:format_pattern>', methods=['PUT'])
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

@settings_sync_bp.route('/api/settings/placeholders', methods=['GET'])
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

@settings_sync_bp.route('/api/settings/placeholders/<path:placeholder_name>', methods=['PUT'])
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

@settings_sync_bp.route('/api/settings/paperless-config', methods=['GET'])
@require_auth
def get_paperless_config():
    """Get Paperless configuration"""
    try:
        paperless_url = db.get_config('paperless_url')
        return jsonify({'paperless_url': paperless_url})
    except Exception as e:
        logger.error(f"Error getting Paperless config: {e}")
        return jsonify({'error': str(e)}), 500

@settings_sync_bp.route('/api/settings/paperless-config', methods=['PUT'])
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

@settings_sync_bp.route('/api/settings/poco-ocr-enabled', methods=['GET'])
@require_auth
def get_poco_ocr_enabled():
    """Get POCO OCR enabled status"""
    try:
        enabled = db.get_config('poco_ocr_enabled') == 'true'
        return jsonify({'enabled': enabled})
    except Exception as e:
        logger.error(f"Error getting POCO OCR enabled status: {e}")
        return jsonify({'error': str(e)}), 500

@settings_sync_bp.route('/api/settings/poco-ocr-enabled', methods=['PUT'])
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

@settings_sync_bp.route('/api/validation/mandatory-data', methods=['GET'])
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

@settings_sync_bp.route('/api/validation/fix-mandatory-data', methods=['POST'])
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



def init_settings_sync(app, db_instance, logger_instance, sync_service_instance):
    """Inject dependencies and register sync/settings/validation routes."""
    global db, logger, sync_service

    db = db_instance
    logger = logger_instance
    sync_service = sync_service_instance

    if "settings_sync" not in app.blueprints:
        app.register_blueprint(settings_sync_bp)
