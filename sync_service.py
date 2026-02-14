"""
PocoClass - Paperless-ngx Sync Service

Synchronises metadata entities (correspondents, tags, document types, custom
fields, and users) from a Paperless-ngx instance into the local PocoClass
database cache.  This cached data is used throughout the application for
dropdown options, rule verification, and background processing.

The service also auto-creates mandatory tags and custom fields in Paperless
when they are missing, ensuring the POCO workflow can function without manual
setup.

Key class:
    SyncService: Orchestrates full or partial syncs and exposes sync status.
"""

import logging
from typing import Dict, List, Optional
from api_client import PaperlessAPIClient
from database import Database
from config import Config

logger = logging.getLogger(__name__)

class SyncService:
    """Handles bidirectional data synchronisation with Paperless-ngx.

    Reads entity lists from Paperless via its REST API and upserts them
    into the local SQLite cache.  Also creates mandatory POCO infrastructure
    (tags, custom fields) in Paperless when they don't yet exist.
    """

    def __init__(self, db: Database):
        """Initialize the sync service.

        Args:
            db: Database instance used to store synced entities and logs.
        """
        self.db = db
    
    def sync_all(self, paperless_token: str, paperless_url: str, ensure_mandatory: bool = True) -> Dict[str, int]:
        """
        Perform a full sync of all Paperless entity types to local cache.
        
        Syncs correspondents, tags, document types, custom fields, and users
        in sequence.  Each entity type is fetched with pagination support and
        stored in the local database.
        
        Args:
            paperless_token: Paperless-ngx API authentication token.
            paperless_url: Base URL of the Paperless-ngx instance.
            ensure_mandatory: If True, auto-create missing mandatory tags and
                              custom fields.  Set to False for read-only checks.

        Returns:
            Dictionary with counts of synced items per entity type.
        """
        logger.info("Starting full sync of Paperless data")
        
        self.db.add_log(
            log_type='system',
            level='info',
            message='Starting data synchronization from Paperless-ngx',
            source='sync_service'
        )
        
        # Build a temporary config with the provided credentials
        config = Config()
        config.paperless_token = paperless_token
        config.paperless_url = paperless_url
        api_client = PaperlessAPIClient(config)
        
        results = {}
        
        # --- Sync correspondents ---
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
        
        # --- Sync tags ---
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
        
        # --- Sync document types ---
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
        
        # --- Sync custom fields + check for required POCO fields ---
        try:
            custom_fields_data = self._fetch_all_with_pagination(
                api_client, f"{paperless_url}/api/custom_fields/"
            )
            results['custom_fields'] = self.db.sync_custom_fields(custom_fields_data)
            
            # Refresh placeholder entries that mirror field availability
            self.db.sync_custom_field_placeholders()
            
            self.db.add_log(
                log_type='system',
                level='info',
                message=f'Synced {results["custom_fields"]} custom fields from Paperless-ngx',
                source='sync_service'
            )
            
            # Verify that the mandatory POCO Score and POCO OCR fields exist
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
        
        # --- Sync users ---
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
        
        # --- Auto-create mandatory POCO infrastructure in Paperless ---
        if ensure_mandatory:
            try:
                logger.info("Checking for mandatory custom fields and tags...")
                created_items = self._ensure_mandatory_data(api_client)
                results['mandatory_data_created'] = created_items
                
                # Re-sync affected entity types so the cache reflects new items
                if created_items['fields_created'] or created_items['tags_created']:
                    logger.info("Re-syncing after creating mandatory data...")
                    if created_items['fields_created']:
                        custom_fields_data = self._fetch_all_with_pagination(
                            api_client, f"{paperless_url}/api/custom_fields/"
                        )
                        results['custom_fields'] = self.db.sync_custom_fields(custom_fields_data)
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
        
        # Log a summary of the entire sync operation
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
        """Create mandatory custom fields and tags in Paperless if missing.

        POCO requires at least the 'POCO Score' custom field and the
        POCO+, POCO-, and NEW tags.  The 'POCO OCR' field is only created
        when the feature is enabled in the local config.

        Args:
            api_client: Authenticated Paperless API client.

        Returns:
            Dict with lists of created field names and tag names.
        """
        created_fields = []
        created_tags = []
        
        poco_ocr_enabled = self.db.get_config('poco_ocr_enabled') == 'true'
        
        # Build list of required custom fields
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
        
        # Build list of required tags with their display colours
        required_tags = [
            {'name': 'POCO+', 'color': '#10b981', 'is_inbox_tag': False},   # Green – passed classification
            {'name': 'POCO-', 'color': '#ef4444', 'is_inbox_tag': False},   # Red – failed classification
            {'name': 'NEW', 'color': '#3b82f6', 'is_inbox_tag': True}       # Blue – inbox tag auto-assigned by Paperless
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
        """Fetch all items from a Paperless API endpoint, handling pagination.
        
        Supports two response formats returned by different Paperless versions:
            - Paginated dict: {"results": [...], "next": "url"}
            - Bare list: [...]

        Args:
            api_client: Authenticated Paperless API client.
            url: Full API endpoint URL to start fetching from.

        Returns:
            Flat list of all entity dicts across all pages.

        Raises:
            ValueError: If the response format is unrecognised.
        """
        all_items = []
        
        while url:
            response = api_client.session.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if isinstance(data, list):
                # Bare list response – no pagination to follow
                all_items.extend(data)
                url = None
            elif isinstance(data, dict):
                # Standard paginated response
                results = data.get('results', [])
                if not isinstance(results, list):
                    raise ValueError(f"Invalid paginated response: 'results' is not a list (got {type(results).__name__})")
                all_items.extend(results)
                # Rewrite the 'next' URL to use the configured base URL
                # (avoids issues when Paperless returns internal hostnames)
                url = api_client._fix_pagination_url(data.get('next'))
            else:
                raise ValueError(f"Invalid response format: expected list or dict, got {type(data).__name__}")
        
        return all_items
    
    def check_poco_fields(self, custom_fields_data: List[Dict]) -> Dict:
        """Check whether the required POCO custom fields exist in Paperless.

        Args:
            custom_fields_data: List of custom field dicts from Paperless API.

        Returns:
            Dict with boolean flags for poco_score_exists and poco_ocr_exists.
        """
        field_names = [cf.get('name') for cf in custom_fields_data]
        
        return {
            'poco_score_exists': 'POCO Score' in field_names,
            'poco_ocr_exists': 'POCO OCR' in field_names,
            'checked': True
        }
    
    def get_sync_status(self) -> Dict:
        """Get the current sync status for all entity types.

        Queries the local database for last-sync timestamps and cached
        entity counts, plus validates that required POCO fields are present.

        Returns:
            Dict with per-entity-type sync info and POCO field validation.
        """
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
        
        # Validate POCO-specific custom fields from the local cache
        custom_fields = self.db.get_all_custom_fields()
        poco_status = self.check_poco_fields(custom_fields)
        status['poco_fields'] = poco_status
        
        return status
