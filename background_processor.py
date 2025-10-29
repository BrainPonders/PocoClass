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
            
            # Create processing run record
            run_id = self.db.create_processing_run(trigger_type='post-consumption')
            
            logger.info(f"Starting background processing run #{run_id}")
            
            # Execute processing
            result = self.process_batch()
            
            # Update run record
            self.db.update_processing_run(
                run_id=run_id,
                status='completed' if result['success'] else 'failed',
                documents_found=result.get('documents_found', 0),
                documents_processed=result.get('documents_processed', 0),
                documents_classified=result.get('documents_classified', 0),
                documents_skipped=result.get('documents_skipped', 0),
                rules_applied=result.get('rules_applied', 0),
                error_message=result.get('error'),
                details=result.get('details')
            )
            
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
    
    def process_batch(self, user_session: Dict = None) -> Dict[str, Any]:
        """
        Process a batch of documents with sync safety guarantees
        
        Args:
            user_session: Optional user session for manual processing (bypasses auto-pause check)
        
        Returns:
            Dictionary with processing results
        """
        try:
            # Auto-pause check: skip if Web UI is active (unless manual processing)
            if user_session is None and self._is_web_ui_active():
                logger.info("Web UI is active, skipping background processing (auto-pause)")
                return {
                    'success': True,
                    'skipped': True,
                    'reason': 'auto-pause',
                    'message': 'Processing paused while Web UI is active'
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
            
            config = Config(paperless_url=paperless_url, paperless_token=paperless_token)
            api_client = PaperlessAPIClient(config, self.db)
            
            # Sync data from Paperless ONCE before processing
            logger.info("Syncing data from Paperless before processing...")
            from sync_service import SyncService
            sync_service = SyncService(self.db)
            sync_result = sync_service.sync_all(api_client)
            logger.info(f"Sync completed: {sync_result}")
            
            # Discover documents to process (tag-based)
            documents = self._discover_documents(api_client)
            logger.info(f"Discovered {len(documents)} documents to process")
            
            if not documents:
                return {
                    'success': True,
                    'documents_found': 0,
                    'documents_processed': 0,
                    'documents_classified': 0,
                    'documents_skipped': 0,
                    'rules_applied': 0
                }
            
            # Load all rules
            rule_loader = RuleLoader()
            rules = rule_loader.load_all_rules()
            logger.info(f"Loaded {len(rules)} rules")
            
            # Process each document
            processed = 0
            classified = 0
            skipped = 0
            total_rules_applied = 0
            
            for doc in documents:
                result = self._process_document(doc, rules, api_client)
                processed += 1
                if result['classified']:
                    classified += 1
                    total_rules_applied += result['rules_applied']
                else:
                    skipped += 1
            
            return {
                'success': True,
                'documents_found': len(documents),
                'documents_processed': processed,
                'documents_classified': classified,
                'documents_skipped': skipped,
                'rules_applied': total_rules_applied
            }
            
        except Exception as e:
            logger.error(f"Batch processing failed: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    def _discover_documents(self, api_client: PaperlessAPIClient) -> List[Dict]:
        """
        Discover documents to process using tag-based filtering
        Returns documents with NEW tag but without POCO tag
        """
        # Get tag names from config
        tag_new = self.db.get_config('bg_tag_new') or 'NEW'
        tag_poco = self.db.get_config('bg_tag_poco') or 'POCO'
        
        # Get tag IDs
        new_tag_id = api_client.get_tag_id(tag_new)
        poco_tag_id = api_client.get_tag_id(tag_poco)
        
        if not new_tag_id:
            logger.warning(f"Tag '{tag_new}' not found, no documents to process")
            return []
        
        # Query documents with NEW tag
        all_docs = api_client.get_documents(ignore_tags=True)
        
        # Filter for documents with NEW tag but without POCO tag
        filtered_docs = []
        for doc in all_docs:
            doc_tags = doc.get('tags', [])
            has_new = new_tag_id in doc_tags
            has_poco = poco_tag_id and poco_tag_id in doc_tags
            
            if has_new and not has_poco:
                filtered_docs.append(doc)
        
        logger.info(f"Found {len(filtered_docs)} documents with '{tag_new}' tag (without '{tag_poco}' tag)")
        return filtered_docs
    
    def _process_document(self, doc: Dict, rules: List[Dict], api_client: PaperlessAPIClient) -> Dict[str, Any]:
        """
        Process a single document by applying all matching rules
        
        Returns:
            Dict with classified status and rules_applied count
        """
        doc_id = doc['id']
        doc_title = doc.get('title', 'Unknown')
        
        logger.info(f"Processing document {doc_id}: {doc_title}")
        
        # Get document content
        content = api_client.get_document_content(doc_id)
        if not content:
            logger.warning(f"No content for document {doc_id}, skipping")
            return {'classified': False, 'rules_applied': 0}
        
        # Create test engine
        test_engine = TestEngine(api_client, self.db)
        
        # Try each rule
        classified = False
        rules_applied = 0
        
        for rule in rules:
            try:
                # Evaluate rule
                result = test_engine.test_rule(rule, doc_id, content, doc.get('original_file_name', ''), doc)
                
                if result.get('match'):
                    logger.info(f"Document {doc_id} matched rule '{rule['rule_name']}' (POCO: {result.get('poco_score', 0):.1f}%, OCR: {result.get('poco_ocr', 0):.1f}%)")
                    
                    # Apply metadata updates
                    updates = self._build_metadata_updates(result, api_client)
                    
                    if updates:
                        # Add POCO custom fields
                        poco_score_field_id = api_client.get_custom_field_id('POCO Score')
                        poco_ocr_field_id = api_client.get_custom_field_id('POCO OCR')
                        
                        custom_fields = updates.get('custom_fields', [])
                        if poco_score_field_id:
                            custom_fields.append({
                                'field': poco_score_field_id,
                                'value': str(round(result.get('poco_score', 0), 1))
                            })
                        if poco_ocr_field_id:
                            custom_fields.append({
                                'field': poco_ocr_field_id,
                                'value': str(round(result.get('poco_ocr', 0), 1))
                            })
                        
                        if custom_fields:
                            updates['custom_fields'] = custom_fields
                        
                        # Update document
                        success = api_client.update_document(doc_id, updates)
                        if success:
                            classified = True
                            rules_applied += 1
                            
                            # Log the classification
                            self.db.add_log(
                                log_type='classification',
                                level='info',
                                message=f"Document classified by rule '{rule['rule_name']}'",
                                rule_name=rule['rule_name'],
                                rule_id=rule.get('rule_id'),
                                document_id=doc_id,
                                document_name=doc_title,
                                poco_score=result.get('poco_score'),
                                poco_ocr=result.get('poco_ocr'),
                                source='background_processor'
                            )
                        else:
                            logger.error(f"Failed to update document {doc_id} with rule '{rule['rule_name']}'")
                
            except Exception as e:
                logger.error(f"Error applying rule '{rule.get('rule_name', 'unknown')}' to document {doc_id}: {e}")
        
        # Add POCO tag to mark as processed
        if classified:
            tag_poco = self.db.get_config('bg_tag_poco') or 'POCO'
            poco_tag_id = api_client.get_tag_id(tag_poco)
            
            if poco_tag_id:
                current_tags = doc.get('tags', [])
                if poco_tag_id not in current_tags:
                    current_tags.append(poco_tag_id)
                    api_client.update_document(doc_id, {'tags': current_tags})
        
        return {'classified': classified, 'rules_applied': rules_applied}
    
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
