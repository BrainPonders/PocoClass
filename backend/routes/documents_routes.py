"""Document listing, preview proxy, and OCR content routes."""

from backend.api_client import PaperlessAPIClient
from backend.config import Config
from backend.routes.auth_users import COOKIE_NAME, require_auth
from flask import Blueprint, jsonify, request

documents_bp = Blueprint("documents", __name__)

db = None
logger = None
# ---- Document Routes ----

@documents_bp.route('/api/documents', methods=['GET'])
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
        return jsonify({'error': 'Internal server error'}), 500

@documents_bp.route('/api/documents/<int:doc_id>/preview', methods=['GET'])
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
        return jsonify({'error': 'Internal server error'}), 500

@documents_bp.route('/api/documents/<int:doc_id>/content', methods=['GET'])
@documents_bp.route('/api/documents/<int:doc_id>/ocr', methods=['GET'])
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
        return jsonify({'error': 'Internal server error'}), 500



def init_documents_routes(app, db_instance, logger_instance):
    """Inject dependencies and register document routes."""
    global db, logger

    db = db_instance
    logger = logger_instance

    if "documents" not in app.blueprints:
        app.register_blueprint(documents_bp)
