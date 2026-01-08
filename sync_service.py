"""
PocoClass Sync Service
Handles synchronization of Paperless data to local cache
"""

import logging
from typing import Dict, List, Optional
from api_client import PaperlessAPIClient
from database import Database
from config import Config

logger = logging.getLogger(__name__)

class SyncService:
    def __init__(self, db: Database):
        self.db = db
    
    def sync_all(self, paperless_token: str, paperless_url: str, ensure_mandatory: bool = True) -> Dict[str, int]:
        """
        Sync all Paperless data to cache
        
        Args:
            paperless_token: Paperless API token
            paperless_url: Paperless URL
            ensure_mandatory: If True, auto-create missing mandatory tags/fields. Set to False for validation checks.
        """
        logger.info("Starting full sync of Paperless data")
        
        # Log sync start
        self.db.add_log(
            log_type='system',
            level='info',
            message='Starting data synchronization from Paperless-ngx',
            source='sync_service'
        )
        
        config = Config()
        config.paperless_token = paperless_token
        config.paperless_url = paperless_url
        api_client = PaperlessAPIClient(config)
        
        results = {}
        
        try:
            correspondents_data = self._fetch_all_with_pagination(
                api_client, f"{paperless_url}/api/correspondents/"
            )
            results['correspondents'] = self.db.sync_correspondents(correspondents_data)
            self.db.add_log(
                log_type='system',
                level='info',
                message=f'Synced {results["correspondents"]} correspondents from Paperless-ngx',
                source='sync_service'
            )
        except Exception as e:
            logger.error(f"Failed to sync correspondents: {e}")
            results['correspondents'] = 0
            self.db.add_log(
                log_type='error',
                level='error',
                message=f'Failed to sync correspondents: {str(e)}',
                source='sync_service'
            )
        
        try:
            tags_data = self._fetch_all_with_pagination(
                api_client, f"{paperless_url}/api/tags/"
            )
            results['tags'] = self.db.sync_tags(tags_data)
            self.db.add_log(
                log_type='system',
                level='info',
                message=f'Synced {results["tags"]} tags from Paperless-ngx',
                source='sync_service'
            )
        except Exception as e:
            logger.error(f"Failed to sync tags: {e}")
            results['tags'] = 0
            self.db.add_log(
                log_type='error',
                level='error',
                message=f'Failed to sync tags: {str(e)}',
                source='sync_service'
            )
        
        try:
            doc_types_data = self._fetch_all_with_pagination(
                api_client, f"{paperless_url}/api/document_types/"
            )
            results['document_types'] = self.db.sync_document_types(doc_types_data)
            self.db.add_log(
                log_type='system',
                level='info',
                message=f'Synced {results["document_types"]} document types from Paperless-ngx',
                source='sync_service'
            )
        except Exception as e:
            logger.error(f"Failed to sync document types: {e}")
            results['document_types'] = 0
            self.db.add_log(
                log_type='error',
                level='error',
                message=f'Failed to sync document types: {str(e)}',
                source='sync_service'
            )
        
        try:
            custom_fields_data = self._fetch_all_with_pagination(
                api_client, f"{paperless_url}/api/custom_fields/"
            )
            results['custom_fields'] = self.db.sync_custom_fields(custom_fields_data)
            
            # Sync custom field placeholders to reflect current state
            self.db.sync_custom_field_placeholders()
            
            self.db.add_log(
                log_type='system',
                level='info',
                message=f'Synced {results["custom_fields"]} custom fields from Paperless-ngx',
                source='sync_service'
            )
            
            # Check for POCO Score and POCO OCR fields
            poco_status = self.check_poco_fields(custom_fields_data)
            results['poco_fields_status'] = poco_status
            
            if not poco_status['poco_score_exists'] or not poco_status['poco_ocr_exists']:
                missing = []
                if not poco_status['poco_score_exists']:
                    missing.append('POCO Score')
                if not poco_status['poco_ocr_exists']:
                    missing.append('POCO OCR')
                logger.warning(f"Missing required custom fields: {', '.join(missing)}")
                self.db.add_log(
                    log_type='system',
                    level='warning',
                    message=f'Missing required custom fields: {", ".join(missing)}',
                    source='sync_service'
                )
        except Exception as e:
            logger.error(f"Failed to sync custom fields: {e}")
            results['custom_fields'] = 0
            results['poco_fields_status'] = {
                'poco_score_exists': False,
                'poco_ocr_exists': False,
                'error': str(e)
            }
            self.db.add_log(
                log_type='error',
                level='error',
                message=f'Failed to sync custom fields: {str(e)}',
                source='sync_service'
            )
        
        try:
            users_data = self._fetch_all_with_pagination(
                api_client, f"{paperless_url}/api/users/"
            )
            results['users'] = self.db.sync_users(users_data)
            self.db.add_log(
                log_type='system',
                level='info',
                message=f'Synced {results["users"]} users from Paperless-ngx',
                source='sync_service'
            )
        except Exception as e:
            logger.error(f"Failed to sync users: {e}")
            results['users'] = 0
            self.db.add_log(
                log_type='error',
                level='error',
                message=f'Failed to sync users: {str(e)}',
                source='sync_service'
            )
        
        # Auto-create mandatory custom fields and tags if missing (unless explicitly disabled)
        if ensure_mandatory:
            try:
                logger.info("Checking for mandatory custom fields and tags...")
                created_items = self._ensure_mandatory_data(api_client)
                results['mandatory_data_created'] = created_items
                
                # Re-sync custom fields and tags if we created any
                if created_items['fields_created'] or created_items['tags_created']:
                    logger.info("Re-syncing after creating mandatory data...")
                    if created_items['fields_created']:
                        custom_fields_data = self._fetch_all_with_pagination(
                            api_client, f"{paperless_url}/api/custom_fields/"
                        )
                        results['custom_fields'] = self.db.sync_custom_fields(custom_fields_data)
                        
                        # Sync custom field placeholders to reflect current state
                        self.db.sync_custom_field_placeholders()
                    
                    if created_items['tags_created']:
                        tags_data = self._fetch_all_with_pagination(
                            api_client, f"{paperless_url}/api/tags/"
                        )
                        results['tags'] = self.db.sync_tags(tags_data)
            except Exception as e:
                logger.error(f"Failed to ensure mandatory data: {e}")
                results['mandatory_data_error'] = str(e)
        else:
            logger.info("Skipping mandatory data creation (ensure_mandatory=False)")
        
        logger.info(f"Sync completed: {results}")
        
        # Log sync completion
        total_synced = sum([
            results.get('correspondents', 0),
            results.get('tags', 0),
            results.get('document_types', 0),
            results.get('custom_fields', 0),
            results.get('users', 0)
        ])
        self.db.add_log(
            log_type='system',
            level='info',
            message=f'Data synchronization completed: {total_synced} total items synced',
            source='sync_service'
        )
        
        return results
    
    def _ensure_mandatory_data(self, api_client: PaperlessAPIClient) -> Dict:
        """Ensure mandatory custom fields and tags exist, create if missing"""
        created_fields = []
        created_tags = []
        
        # Check if POCO OCR is enabled
        poco_ocr_enabled = self.db.get_config('poco_ocr_enabled') == 'true'
        
        # POCO Score is always required; POCO OCR only if enabled
        required_fields = [{'name': 'POCO Score', 'data_type': 'string'}]
        if poco_ocr_enabled:
            required_fields.append({'name': 'POCO OCR', 'data_type': 'string'})
        
        for field_spec in required_fields:
            field_name = field_spec['name']
            if not api_client.get_custom_field_id(field_name):
                try:
                    logger.info(f"Creating mandatory custom field: {field_name}")
                    success = api_client.create_custom_field(field_name, field_spec['data_type'])
                    if success:
                        created_fields.append(field_name)
                        logger.info(f"Successfully created custom field: {field_name}")
                except Exception as e:
                    logger.error(f"Failed to create custom field {field_name}: {e}")
        
        # Check and create mandatory tags
        required_tags = [
            {'name': 'POCO+', 'color': '#10b981', 'is_inbox_tag': False},  # Green
            {'name': 'POCO-', 'color': '#ef4444', 'is_inbox_tag': False},  # Red
            {'name': 'NEW', 'color': '#3b82f6', 'is_inbox_tag': True}       # Blue - inbox tag so Paperless auto-assigns to new documents
        ]
        
        for tag_spec in required_tags:
            tag_name = tag_spec['name']
            if not api_client.get_tag_id(tag_name):
                try:
                    logger.info(f"Creating mandatory tag: {tag_name}")
                    success = api_client.create_tag(tag_name, tag_spec['color'], tag_spec['is_inbox_tag'])
                    if success:
                        created_tags.append(tag_name)
                        logger.info(f"Successfully created tag: {tag_name}")
                except Exception as e:
                    logger.error(f"Failed to create tag {tag_name}: {e}")
        
        return {
            'fields_created': created_fields,
            'tags_created': created_tags
        }
    
    def _fetch_all_with_pagination(self, api_client: PaperlessAPIClient, url: str) -> List[Dict]:
        """Fetch all items from a paginated or bare-list endpoint
        
        Handles both Paperless response formats:
        - Paginated: {"results": [...], "next": "url"}
        - Bare list: [...]
        """
        all_items = []
        
        while url:
            response = api_client.session.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            # Handle both paginated and bare-list responses
            if isinstance(data, list):
                # Bare list response (some self-hosted/compatibility endpoints)
                all_items.extend(data)
                url = None  # No pagination for bare lists
            elif isinstance(data, dict):
                # Paginated response (standard Paperless format)
                results = data.get('results', [])
                if not isinstance(results, list):
                    raise ValueError(f"Invalid paginated response: 'results' is not a list (got {type(results).__name__})")
                all_items.extend(results)
                # Fix pagination URL to use configured base URL (not internal hostname)
                url = api_client._fix_pagination_url(data.get('next'))
            else:
                raise ValueError(f"Invalid response format: expected list or dict, got {type(data).__name__}")
        
        return all_items
    
    def check_poco_fields(self, custom_fields_data: List[Dict]) -> Dict:
        """Check if POCO Score and POCO OCR custom fields exist"""
        field_names = [cf.get('name') for cf in custom_fields_data]
        
        return {
            'poco_score_exists': 'POCO Score' in field_names,
            'poco_ocr_exists': 'POCO OCR' in field_names,
            'checked': True
        }
    
    def get_sync_status(self) -> Dict:
        """Get the current sync status"""
        status = {
            'correspondents': {
                'last_sync': self.db.get_last_sync_time('correspondents'),
                'count': len(self.db.get_all_correspondents())
            },
            'tags': {
                'last_sync': self.db.get_last_sync_time('tags'),
                'count': len(self.db.get_all_tags())
            },
            'document_types': {
                'last_sync': self.db.get_last_sync_time('document_types'),
                'count': len(self.db.get_all_document_types())
            },
            'custom_fields': {
                'last_sync': self.db.get_last_sync_time('custom_fields'),
                'count': len(self.db.get_all_custom_fields())
            },
            'users': {
                'last_sync': self.db.get_last_sync_time('users'),
                'count': len(self.db.get_all_paperless_users())
            }
        }
        
        # Add POCO fields validation
        custom_fields = self.db.get_all_custom_fields()
        poco_status = self.check_poco_fields(custom_fields)
        status['poco_fields'] = poco_status
        
        return status
