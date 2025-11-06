"""
Background Processing Engine for PocoClass
Handles automatic document classification with debouncing, locking, and tag-based discovery
"""

import logging
import time
import threading
from datetime import datetime
from typing import Dict, List, Optional, Any
from database import Database
from api_client import PaperlessAPIClient
from config import Config
from test_engine import TestEngine
from rule_loader import RuleLoader

logger = logging.getLogger(__name__)


class BackgroundProcessor:
    """Manages background processing of documents"""
    
    def __init__(self, db: Database = None):
        self.db = db or Database()
        self.debounce_timer = None
        self.debounce_lock = threading.Lock()
    
    def trigger_processing(self, delay_seconds: int = None) -> Dict[str, Any]:
        """
        Trigger background processing with debouncing
        If called multiple times within debounce window, only the last call will execute
        """
        # Check if background processing is enabled
        enabled = self.db.get_config('bg_enabled') == 'true'
        if not enabled:
            return {'status': 'disabled', 'message': 'Background processing is disabled'}
        
        # Get debounce delay from config or use provided value
        if delay_seconds is None:
            delay_seconds = int(self.db.get_config('bg_debounce_seconds') or '30')
        
        with self.debounce_lock:
            # Cancel existing timer if any
            if self.debounce_timer and self.debounce_timer.is_alive():
                self.debounce_timer.cancel()
                logger.info(f"Cancelled existing debounce timer, restarting with {delay_seconds}s delay")
            
            # Create new timer
            self.debounce_timer = threading.Timer(delay_seconds, self._execute_processing)
            self.debounce_timer.daemon = True
            self.debounce_timer.start()
            
            logger.info(f"Background processing triggered, will execute in {delay_seconds} seconds")
            return {
                'status': 'scheduled',
                'message': f'Processing scheduled in {delay_seconds} seconds',
                'delay_seconds': delay_seconds
            }
    
    def _execute_processing(self):
        """Execute the actual background processing (called by timer)"""
        try:
            # Check if processing is locked
            if self.db.get_processing_lock():
                logger.warning("Processing already running, setting needs_rerun flag")
                self.db.set_needs_rerun(True)
                return
            
            # Acquire lock
            self.db.set_processing_lock(True)
            self.db.set_needs_rerun(False)
            
            # Create processing run record with automatic trigger type
            run_id = self.db.create_processing_run(trigger_type='automatic')
            
            logger.info(f"Starting background processing run #{run_id}")
            
            # Execute processing with run_id
            result = self.process_batch(run_id=run_id)
            
            logger.info(f"Background processing run #{run_id} completed: {result}")
            
        except Exception as e:
            logger.error(f"Background processing failed: {e}", exc_info=True)
            if 'run_id' in locals():
                self.db.update_processing_run(
                    run_id=run_id,
                    status='failed',
                    error_message=str(e)
                )
        finally:
            # Release lock
            self.db.set_processing_lock(False)
            
            # Check if we need to rerun
            if self.db.get_needs_rerun():
                logger.info("needs_rerun flag set, triggering another processing run")
                self.db.set_needs_rerun(False)
                self.trigger_processing(delay_seconds=5)
    
    def process_batch(self, user_session: Dict = None, filters: Dict = None, dry_run: bool = False, run_id: int = None) -> Dict[str, Any]:
        """
        Process a batch of documents with sync safety guarantees
        
        Args:
            user_session: Optional user session for manual processing (bypasses auto-pause check)
            filters: Optional filters for manual processing (title, tags, correspondents, doc_types, dates)
            dry_run: If True, only simulate processing without making changes
            run_id: Optional existing run_id (for internal use by _execute_processing)
        
        Returns:
            Dictionary with processing results including run_id
        """
        try:
            # Determine trigger_type based on parameters
            if dry_run:
                trigger_type = 'manual_dry_run'
            elif filters or user_session:
                trigger_type = 'manual_run'
            else:
                trigger_type = 'automatic'
            
            # Create processing run if not provided
            if run_id is None:
                user_id = user_session.get('user_id') if user_session else None
                run_id = self.db.create_processing_run(trigger_type=trigger_type, user_id=user_id)
                logger.info(f"Created processing run #{run_id} with trigger_type={trigger_type}")
            
            # Auto-pause check: skip if Web UI is active (unless manual processing)
            if user_session is None and self._is_web_ui_active():
                logger.info("Web UI is active, skipping background processing (auto-pause)")
                self.db.update_processing_run(
                    run_id=run_id,
                    status='skipped',
                    error_message='Processing paused while Web UI is active'
                )
                return {
                    'success': True,
                    'skipped': True,
                    'reason': 'auto-pause',
                    'message': 'Processing paused while Web UI is active',
                    'run_id': run_id
                }
            
            # Get Paperless URL and create API client
            paperless_url = self.db.get_config('paperless_url')
            if not paperless_url:
                raise ValueError("Paperless URL not configured")
            
            # For background processing, we need a system token
            # Use the first admin user's token (or the provided session)
            if user_session:
                paperless_token = user_session.get('paperless_token')
            else:
                # Get first admin user's encrypted token from sessions
                admin_session = self._get_admin_session()
                if not admin_session:
                    raise ValueError("No admin session available for background processing")
                paperless_token = admin_session['paperless_token']
            
            config = Config()
            config.paperless_url = paperless_url
            config.paperless_token = paperless_token
            api_client = PaperlessAPIClient(config, self.db)
            
            # Sync data from Paperless ONCE before processing
            logger.info("Syncing data from Paperless before processing...")
            from sync_service import SyncService
            sync_service = SyncService(self.db)
            sync_result = sync_service.sync_all(paperless_token, paperless_url)
            logger.info(f"Sync completed: {sync_result}")
            
            # Discover documents to process
            # If filters provided (manual mode), use them; otherwise auto-discover (trigger mode)
            if filters:
                logger.info(f"Manual processing with filters: {filters}")
                documents = self._fetch_filtered_documents(api_client, filters)
                logger.info(f"Found {len(documents)} documents matching filters")
            else:
                logger.info("Auto-discovery mode (trigger)")
                documents = self._discover_documents(api_client)
                logger.info(f"Discovered {len(documents)} documents to process")
            
            if not documents:
                self.db.update_processing_run(
                    run_id=run_id,
                    status='completed',
                    documents_found=0,
                    documents_processed=0,
                    documents_classified=0,
                    documents_skipped=0,
                    rules_applied=0
                )
                return {
                    'success': True,
                    'documents_found': 0,
                    'documents_processed': 0,
                    'documents_classified': 0,
                    'documents_skipped': 0,
                    'rules_applied': 0,
                    'run_id': run_id
                }
            
            # Load all rules
            rule_loader = RuleLoader('rules')
            rules_dict = rule_loader.load_all_rules()
            rules = list(rules_dict.values())  # Convert dict to list of rule objects
            logger.info(f"Loaded {len(rules)} rules")
            
            # Process each document
            processed = 0
            classified = 0
            skipped = 0
            unique_rules_used = set()  # Track unique rule IDs that were actually used
            
            for doc in documents:
                result = self._process_document(doc, rules, api_client, dry_run=dry_run, run_id=run_id)
                processed += 1
                if result['classified']:
                    classified += 1
                    # Track which rule was used
                    if result.get('rule_id'):
                        unique_rules_used.add(result['rule_id'])
                else:
                    skipped += 1
                
                # Save per-document details to database
                if result.get('detail'):
                    try:
                        self.db.add_processing_detail(run_id, result['detail'])
                    except Exception as e:
                        logger.error(f"Failed to save processing detail for document {doc['id']}: {e}")
            
            # Count unique rules used (not number of documents)
            rules_applied_count = len(unique_rules_used)
            
            # Update run record with final stats
            self.db.update_processing_run(
                run_id=run_id,
                status='completed',
                documents_found=len(documents),
                documents_processed=processed,
                documents_classified=classified,
                documents_skipped=skipped,
                rules_applied=rules_applied_count
            )
            
            return {
                'success': True,
                'documents_found': len(documents),
                'documents_processed': processed,
                'documents_classified': classified,
                'documents_skipped': skipped,
                'rules_applied': rules_applied_count,
                'run_id': run_id
            }
            
        except Exception as e:
            logger.error(f"Batch processing failed: {e}", exc_info=True)
            # Update run record with error
            if 'run_id' in locals() and run_id:
                self.db.update_processing_run(
                    run_id=run_id,
                    status='failed',
                    error_message=str(e)
                )
            return {
                'success': False,
                'error': str(e),
                'run_id': run_id if 'run_id' in locals() else None
            }
    
    def _discover_documents(self, api_client: PaperlessAPIClient) -> List[Dict]:
        """
        Discover documents to process using tag-based filtering
        Returns documents with NEW tag but without POCO+ or POCO- tags
        """
        # Get tag names from config
        tag_new = self.db.get_config('bg_tag_new') or 'NEW'
        
        # Get tag IDs
        new_tag_id = api_client.get_tag_id(tag_new)
        poco_plus_tag_id = api_client.get_tag_id('POCO+')
        poco_minus_tag_id = api_client.get_tag_id('POCO-')
        
        if not new_tag_id:
            logger.warning(f"Tag '{tag_new}' not found, no documents to process")
            return []
        
        # Query documents with NEW tag
        all_docs = api_client.get_documents(ignore_tags=True)
        
        # Filter for documents with NEW tag but without POCO+ or POCO- tags
        filtered_docs = []
        logger.info(f"Filtering {len(all_docs)} total documents for NEW tag (ID={new_tag_id}) without POCO tags")
        for doc in all_docs:
            doc_tags = doc.get('tags', [])
            has_new = new_tag_id in doc_tags
            has_poco_plus = poco_plus_tag_id and poco_plus_tag_id in doc_tags
            has_poco_minus = poco_minus_tag_id and poco_minus_tag_id in doc_tags
            
            doc_id = doc.get('id')
            doc_title = doc.get('title', 'Unknown')
            logger.info(f"Doc {doc_id} ({doc_title}): tags={doc_tags}, has_new={has_new}, has_poco+={has_poco_plus}, has_poco-={has_poco_minus}")
            
            if has_new and not has_poco_plus and not has_poco_minus:
                filtered_docs.append(doc)
                logger.info(f"  ✓ Doc {doc_id} included for processing")
        
        logger.info(f"Found {len(filtered_docs)} documents with '{tag_new}' tag (not yet processed by PocoClass)")
        return filtered_docs
    
    def _fetch_filtered_documents(self, api_client: PaperlessAPIClient, filters: Dict) -> List[Dict]:
        """
        Fetch documents from Paperless using provided filters (for manual processing)
        
        Args:
            api_client: PaperlessAPIClient instance
            filters: Dictionary with title, tags, correspondents, doc_types, dates filters, and optional document_ids
        
        Returns:
            List of documents matching the filters
        """
        logger.info(f"Fetching documents with filters: {filters}")
        
        # Extract filter parameters
        title = filters.get('title')
        tags = filters.get('tags')  # List of tag names to include
        tags_mode = filters.get('tags_mode', 'any')
        exclude_tags = filters.get('exclude_tags')  # List of tag names to exclude
        correspondents = filters.get('correspondents')  # List of correspondent IDs
        correspondents_mode = filters.get('correspondents_mode', 'include')
        doc_types = filters.get('doc_types')  # List of doc type IDs
        doc_types_mode = filters.get('doc_types_mode', 'include')
        date_from = filters.get('date_from')
        date_to = filters.get('date_to')
        document_ids = filters.get('document_ids')  # List of specific document IDs to process
        
        # Fetch documents from Paperless using API client
        documents = api_client.get_documents(
            title=title,
            tags=tags,
            tags_mode=tags_mode,
            exclude_tags=exclude_tags,
            correspondents=correspondents,
            correspondents_mode=correspondents_mode,
            doc_types=doc_types,
            doc_types_mode=doc_types_mode,
            date_from=date_from,
            date_to=date_to,
            ignore_tags=False  # Respect user's tag filters in manual mode
        )
        
        # If specific document IDs are provided, filter to only those documents
        if document_ids:
            logger.info(f"Filtering documents to only include IDs: {document_ids}")
            documents = [doc for doc in documents if doc['id'] in document_ids]
            logger.info(f"After document_ids filter: {len(documents)} documents")
        
        return documents
    
    def _convert_document_ids_to_names(self, doc: Dict) -> Dict:
        """
        Convert document IDs to names for verification using database lookups.
        This matches the same conversion done in the execute_rule endpoint.
        """
        # Create lookup dictionaries from cached database data
        correspondents_lookup = {c['paperless_id']: c for c in self.db.get_all_correspondents()}
        doc_types_lookup = {dt['paperless_id']: dt for dt in self.db.get_all_document_types()}
        tags_lookup = {t['paperless_id']: t for t in self.db.get_all_tags()}
        custom_fields_lookup = {cf['paperless_id']: cf for cf in self.db.get_all_custom_fields()}
        
        # Build paperless_metadata with names instead of IDs
        paperless_metadata = {}
        
        # Convert correspondent ID to name
        if doc.get('correspondent'):
            corr = correspondents_lookup.get(doc['correspondent'])
            if corr:
                paperless_metadata['correspondent'] = corr['name']
        
        # Convert document_type ID to name
        if doc.get('document_type'):
            dt = doc_types_lookup.get(doc['document_type'])
            if dt:
                paperless_metadata['document_type'] = dt['name']
        
        # Convert tag IDs to tag names
        if doc.get('tags'):
            tag_names = []
            for tag_id in doc['tags']:
                tag = tags_lookup.get(tag_id)
                if tag:
                    tag_names.append(tag['name'])
            if tag_names:
                paperless_metadata['tags'] = tag_names
        
        # Extract custom fields with field names and values (resolve select option IDs)
        if doc.get('custom_fields'):
            custom_fields_dict = {}
            for cf_entry in doc['custom_fields']:
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
        if doc.get('created'):
            paperless_metadata['date_created'] = doc['created']
        
        return paperless_metadata
    
    def _process_document(self, doc: Dict, rules: List[Dict], api_client: PaperlessAPIClient, dry_run: bool = False, run_id: int = None) -> Dict[str, Any]:
        """
        Process a single document by testing all rules and applying the best match.
        ALWAYS adds POCO scores and tags (POCO+ or POCO-) regardless of match status.
        
        Args:
            doc: Document dictionary from Paperless
            rules: List of rule objects
            api_client: PaperlessAPIClient instance
            dry_run: If True, simulate processing without making changes
            run_id: Optional processing run ID for tracking
        
        Returns:
            Dict with classified status, rules_applied count, and detail dict
        """
        doc_id = doc['id']
        doc_title = doc.get('title', 'Unknown')
        
        logger.info(f"Processing document {doc_id}: {doc_title}")
        
        # Get document content
        content = api_client.get_document_content(doc_id)
        if not content:
            logger.warning(f"No content for document {doc_id}, skipping")
            return {'classified': False, 'rules_applied': 0, 'detail': None}
        
        # Log content length for debugging
        logger.info(f"Document {doc_id} content: {len(content)} chars, {len(content.splitlines())} lines")
        
        # Convert document IDs to names for proper verification
        paperless_metadata = self._convert_document_ids_to_names(doc)
        
        # Create test engine
        test_engine = TestEngine()
        
        # Test all rules and find best match
        best_result = None
        best_rule = None
        best_score = 0
        
        for rule in rules:
            try:
                # Evaluate rule with converted metadata
                result = test_engine.test_rule(rule, content, doc.get('original_file_name', ''), paperless_metadata)
                poco_score = result.get('scores', {}).get('poco_score', 0)
                
                # Track best match
                if poco_score > best_score:
                    best_score = poco_score
                    best_result = result
                    best_rule = rule
                    
            except Exception as e:
                logger.error(f"Error testing rule '{rule.get('rule_name', 'unknown')}' on document {doc_id}: {e}")
        
        # Determine if document matched based on threshold
        threshold = best_rule.get('threshold', 75) if best_rule else 75
        classified = best_result and best_result.get('classification_allowed', False)
        
        # Get POCO Score and POCO OCR (default to 0 if no match)
        poco_score = best_score if best_result else 0
        poco_ocr = best_result.get('scores', {}).get('poco_ocr_score', 0) if best_result else 0
        
        # Log result
        if classified:
            logger.info(f"Document {doc_id} matched rule '{best_rule['rule_name']}' (POCO: {poco_score:.1f}%, OCR: {poco_ocr:.1f}%)")
        else:
            logger.info(f"Document {doc_id} no match (best score: {poco_score:.1f}%)")
        
        # Build metadata_applied list for tracking
        metadata_applied = []
        
        # Apply metadata updates (only if not dry run)
        rules_applied = 0
        if not dry_run:
            if classified and best_result:
                updates = self._build_metadata_updates(best_result, api_client)
                if updates:
                    # Track what metadata will be applied
                    metadata_applied = self._build_metadata_applied_list(updates, best_result, api_client)
                    
                    success = api_client.update_document(doc_id, updates)
                    if success:
                        rules_applied = 1
                    else:
                        logger.error(f"Failed to update metadata for document {doc_id}")
                        metadata_applied = []  # Clear if update failed
            
            # ALWAYS add POCO scores to custom fields (even if 0)
            self._add_poco_scores(doc_id, poco_score, poco_ocr, api_client)
            
            # ALWAYS add POCO+ or POCO- tag
            self._add_poco_tag(doc_id, doc, classified, api_client)
            
            # ALWAYS add scoring table to document notes
            self._add_scoring_note(doc_id, best_result, best_rule, poco_score, poco_ocr, classified, threshold, api_client)
        else:
            # In dry run mode, build what would be applied
            if classified and best_result:
                rules_applied = 1
                updates = self._build_metadata_updates(best_result, api_client)
                if updates:
                    metadata_applied = self._build_metadata_applied_list(updates, best_result, api_client)
            logger.info(f"DRY RUN: Would update document {doc_id} with POCO Score={poco_score:.1f}%, OCR={poco_ocr:.1f}%, {'POCO+' if classified else 'POCO-'}")
        
        # Log the processing
        self.db.add_log(
            log_type='classification' if classified else 'processing',
            level='info',
            message=f"Document {'classified' if classified else 'processed'} " + (f"by rule '{best_rule['rule_name']}'" if classified and best_rule else '(no match)'),
            rule_name=best_rule['rule_name'] if best_rule else None,
            rule_id=best_rule.get('rule_id') if best_rule else None,
            document_id=doc_id,
            document_name=doc_title,
            poco_score=poco_score,
            poco_ocr=poco_ocr,
            source='background_processor'
        )
        
        # Build detail dict for database tracking
        detail = {
            'document_id': doc_id,
            'document_title': doc_title,
            'rule_id': best_rule.get('rule_id') if best_rule else None,
            'rule_name': best_rule.get('rule_name') if best_rule else None,
            'poco_score': round(poco_score, 1),
            'ocr_score': round(poco_ocr, 1),
            'classification': 'POCO+' if classified else 'POCO-',
            'metadata_applied': metadata_applied,
            'status': 'simulated' if dry_run else 'applied'
        }
        
        return {
            'classified': classified,
            'rules_applied': rules_applied,
            'rule_id': best_rule.get('rule_id') if best_rule else None,
            'detail': detail
        }
    
    def _build_metadata_updates(self, result: Dict, api_client: PaperlessAPIClient) -> Dict[str, Any]:
        """Build metadata updates dictionary from rule evaluation result"""
        updates = {}
        extracted = result.get('extracted_metadata', {})
        
        # Map extracted metadata to Paperless fields
        if 'title' in extracted:
            updates['title'] = extracted['title']
        
        if 'created_date' in extracted:
            updates['created_date'] = extracted['created_date']
        
        if 'correspondent' in extracted:
            corr_id = api_client.get_correspondent_id(extracted['correspondent'])
            if corr_id:
                updates['correspondent'] = corr_id
        
        if 'document_type' in extracted:
            dt_id = api_client.get_document_type_id(extracted['document_type'])
            if dt_id:
                updates['document_type'] = dt_id
        
        # Handle tags (append to existing)
        if 'tags' in extracted:
            tag_ids = []
            for tag_name in extracted['tags']:
                tag_id = api_client.get_tag_id(tag_name)
                if tag_id:
                    tag_ids.append(tag_id)
            if tag_ids:
                updates['tags'] = tag_ids
        
        # Handle custom fields
        custom_fields = []
        for field_name, value in extracted.items():
            if field_name not in ['title', 'created_date', 'correspondent', 'document_type', 'tags']:
                field_id = api_client.get_custom_field_id(field_name)
                if field_id:
                    custom_fields.append({
                        'field': field_id,
                        'value': str(value)
                    })
        
        if custom_fields:
            updates['custom_fields'] = custom_fields
        
        return updates
    
    def _build_metadata_applied_list(self, updates: Dict[str, Any], result: Dict, api_client: PaperlessAPIClient) -> List[str]:
        """
        Build human-readable list of metadata with actual values that were applied
        
        Args:
            updates: Metadata updates dictionary from _build_metadata_updates
            result: Test engine result with extracted_metadata
            api_client: API client to resolve custom field IDs to names
        
        Returns:
            List of strings like ["Title: Bank Statement", "Correspondent: Rabobank", "Tags: Bank, NEW"]
        """
        applied = []
        extracted_metadata = result.get('extracted_metadata', {})
        
        # Flatten extracted metadata from static/dynamic/filename structure
        extracted = {}
        extracted.update(extracted_metadata.get('static', {}))
        extracted.update(extracted_metadata.get('dynamic', {}))
        extracted.update(extracted_metadata.get('filename', {}))
        
        logger.info(f"Building metadata list - extracted: {extracted}, updates keys: {list(updates.keys())}")
        
        # Standard fields with actual values
        if 'title' in updates:
            applied.append(f"Title: {extracted.get('title', updates.get('title', 'Unknown'))}")
        
        if 'created_date' in updates:
            applied.append(f"Date: {extracted.get('created_date', updates.get('created_date', 'Unknown'))}")
        
        if 'correspondent' in updates:
            applied.append(f"Correspondent: {extracted.get('correspondent', 'Unknown')}")
        
        if 'document_type' in updates:
            applied.append(f"Doc Type: {extracted.get('document_type', 'Unknown')}")
        
        # Tags with names
        if 'tags' in updates and 'tags' in extracted:
            tags_list = extracted['tags'] if isinstance(extracted['tags'], list) else [extracted['tags']]
            tags_str = ', '.join(str(t) for t in tags_list)
            applied.append(f"Tags: {tags_str}")
        elif 'tags' in updates:
            tag_count = len(updates['tags'])
            applied.append(f"Tags: {tag_count} added")
        
        # Custom fields - only include fields that were actually updated
        if 'custom_fields' in updates:
            # Build set of updated field names by resolving IDs
            updated_field_names = set()
            for cf in updates['custom_fields']:
                field_id = cf['field']
                # Resolve field ID to name using api_client's cached data
                for field_name in extracted.keys():
                    if field_name not in ['title', 'created_date', 'correspondent', 'document_type', 'tags']:
                        # Check if this field name matches this field ID
                        if api_client.get_custom_field_id(field_name) == field_id:
                            updated_field_names.add(field_name)
                            break
            
            # Now add only the updated custom fields with their values
            for field_name in updated_field_names:
                if field_name in extracted:
                    applied.append(f"{field_name}: {extracted[field_name]}")
        
        return applied
    
    def _add_poco_scores(self, doc_id: int, poco_score: float, poco_ocr: float, api_client: PaperlessAPIClient) -> None:
        """Add POCO Score and POCO OCR to document custom fields"""
        try:
            poco_score_field_id = api_client.get_custom_field_id('POCO Score')
            poco_ocr_field_id = api_client.get_custom_field_id('POCO OCR')
            
            custom_fields = []
            if poco_score_field_id:
                custom_fields.append({
                    'field': poco_score_field_id,
                    'value': str(round(poco_score, 1))
                })
            if poco_ocr_field_id:
                custom_fields.append({
                    'field': poco_ocr_field_id,
                    'value': str(round(poco_ocr, 1))
                })
            
            if custom_fields:
                success = api_client.update_document(doc_id, {'custom_fields': custom_fields})
                if not success:
                    logger.warning(f"Failed to add POCO scores to document {doc_id}")
        except Exception as e:
            logger.error(f"Error adding POCO scores to document {doc_id}: {e}")
    
    def _add_poco_tag(self, doc_id: int, doc: Dict, classified: bool, api_client: PaperlessAPIClient) -> None:
        """Add POCO+ tag if classified, POCO- tag if not"""
        try:
            tag_name = 'POCO+' if classified else 'POCO-'
            tag_id = api_client.get_tag_id(tag_name)
            
            if tag_id:
                current_tags = doc.get('tags', [])
                if tag_id not in current_tags:
                    current_tags.append(tag_id)
                    success = api_client.update_document(doc_id, {'tags': current_tags})
                    if not success:
                        logger.warning(f"Failed to add {tag_name} tag to document {doc_id}")
            else:
                logger.warning(f"Tag '{tag_name}' not found, cannot tag document {doc_id}")
        except Exception as e:
            logger.error(f"Error adding POCO tag to document {doc_id}: {e}")
    
    def _add_scoring_note(self, doc_id: int, result: Optional[Dict], rule: Optional[Dict], 
                         poco_score: float, poco_ocr: float, classified: bool, 
                         threshold: float, api_client: PaperlessAPIClient) -> None:
        """Add or update scoring table in document notes"""
        try:
            from datetime import datetime
            import requests
            
            # Delete old PocoClass scoring notes
            paperless_url = self.db.get_config('paperless_url')
            session = self._get_admin_session()
            if not session:
                logger.warning(f"No admin session available to add notes to document {doc_id}")
                return
            
            paperless_token = session['paperless_token']
            
            # Get existing notes
            notes_response = requests.get(
                f'{paperless_url}/api/documents/{doc_id}/notes/',
                headers={'Authorization': f'Token {paperless_token}'},
                timeout=10
            )
            
            if notes_response.status_code == 200:
                notes = notes_response.json()
                # Delete notes containing "PocoClass Scoring Report"
                for note in notes:
                    if 'PocoClass Scoring Report' in note.get('note', ''):
                        note_id = note.get('id')
                        if note_id:
                            requests.delete(
                                f'{paperless_url}/api/documents/{doc_id}/notes/{note_id}/',
                                headers={'Authorization': f'Token {paperless_token}'},
                                timeout=10
                            )
            
            # Build scoring table
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            rule_name = rule['rule_name'] if rule else 'N/A'
            
            # Get multipliers from rule or use defaults
            ocr_multiplier = rule.get('scoring_weights', {}).get('ocr_patterns', 3) if rule else 3
            filename_multiplier = rule.get('scoring_weights', {}).get('filename_patterns', 1) if rule else 1
            metadata_multiplier = rule.get('scoring_weights', {}).get('verification_fields', 1) if rule else 1
            
            # Get OCR threshold
            ocr_threshold = rule.get('ocr_threshold', 75) if rule else 75
            
            # Get breakdown scores if available
            filename_score = result.get('filename_score', 0) if result else 0
            metadata_score = result.get('metadata_score', 0) if result else 0
            
            note_text = f"""PocoClass Scoring Report
========================
Processed: {timestamp}
Rule: {rule_name}

POCO Score: {poco_score:.1f}%
POCO OCR: {poco_ocr:.1f}% (Minimum {ocr_threshold}%, Multiplier: {ocr_multiplier}x)

Score Breakdown:
- OCR Patterns: {poco_ocr:.1f}% (Multiplier: {ocr_multiplier}x)
- Filename Match: {filename_score:.1f}% (Multiplier: {filename_multiplier}x)
- Metadata Verification: {metadata_score:.1f}% (Multiplier: {metadata_multiplier}x)

Result: {'✓ MATCHED' if classified else '✗ NO MATCH'} (threshold: {threshold}%)
Tag Applied: {'POCO+' if classified else 'POCO-'}
"""
            
            # Add new note
            requests.post(
                f'{paperless_url}/api/documents/{doc_id}/notes/',
                headers={
                    'Authorization': f'Token {paperless_token}',
                    'Content-Type': 'application/json'
                },
                json={'note': note_text},
                timeout=10
            )
            
        except Exception as e:
            logger.error(f"Error adding scoring note to document {doc_id}: {e}")
    
    def _is_web_ui_active(self) -> bool:
        """Check if Web UI has active sessions (for auto-pause)"""
        # Check for sessions in last 5 minutes
        from datetime import timedelta
        conn = self.db.get_connection()
        cursor = conn.cursor()
        
        cutoff_time = (datetime.now() - timedelta(minutes=5)).isoformat()
        cursor.execute("""
            SELECT COUNT(*) as count FROM sessions 
            WHERE last_activity > ?
        """, (cutoff_time,))
        
        row = cursor.fetchone()
        conn.close()
        
        active_count = row['count'] if row else 0
        return active_count > 0
    
    def _get_admin_session(self) -> Optional[Dict]:
        """Get an active admin session for background processing"""
        conn = self.db.get_connection()
        cursor = conn.cursor()
        
        # Get most recent admin session
        cursor.execute("""
            SELECT s.*, u.pococlass_role 
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE u.pococlass_role = 'admin'
            ORDER BY s.last_activity DESC
            LIMIT 1
        """)
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            session = dict(row)
            # Decrypt token
            session['paperless_token'] = self.db.encryption.decrypt(session['paperless_token'])
            return session
        
        return None
    
    def get_status(self) -> Dict[str, Any]:
        """Get current background processing status"""
        enabled = self.db.get_config('bg_enabled') == 'true'
        locked = self.db.get_processing_lock()
        needs_rerun = self.db.get_needs_rerun()
        debounce_seconds = self.db.get_config('bg_debounce_seconds') or '30'
        tag_new = self.db.get_config('bg_tag_new') or 'NEW'
        tag_poco = self.db.get_config('bg_tag_poco') or 'POCO'
        
        # Check if timer is active
        timer_active = self.debounce_timer is not None and self.debounce_timer.is_alive()
        
        # Get latest processing run
        history = self.db.get_processing_history(limit=1)
        latest_run = history[0] if history else None
        
        return {
            'enabled': enabled,
            'processing_locked': locked,
            'needs_rerun': needs_rerun,
            'timer_active': timer_active,
            'debounce_seconds': int(debounce_seconds),
            'tag_new': tag_new,
            'tag_poco': tag_poco,
            'latest_run': latest_run
        }
