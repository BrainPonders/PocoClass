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
    
    def sync_all(self, paperless_token: str, paperless_url: str) -> Dict[str, int]:
        """Sync all Paperless data to cache"""
        logger.info("Starting full sync of Paperless data")
        
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
        except Exception as e:
            logger.error(f"Failed to sync correspondents: {e}")
            results['correspondents'] = 0
        
        try:
            tags_data = self._fetch_all_with_pagination(
                api_client, f"{paperless_url}/api/tags/"
            )
            results['tags'] = self.db.sync_tags(tags_data)
        except Exception as e:
            logger.error(f"Failed to sync tags: {e}")
            results['tags'] = 0
        
        try:
            doc_types_data = self._fetch_all_with_pagination(
                api_client, f"{paperless_url}/api/document_types/"
            )
            results['document_types'] = self.db.sync_document_types(doc_types_data)
        except Exception as e:
            logger.error(f"Failed to sync document types: {e}")
            results['document_types'] = 0
        
        try:
            custom_fields_data = self._fetch_all_with_pagination(
                api_client, f"{paperless_url}/api/custom_fields/"
            )
            results['custom_fields'] = self.db.sync_custom_fields(custom_fields_data)
            
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
        except Exception as e:
            logger.error(f"Failed to sync custom fields: {e}")
            results['custom_fields'] = 0
            results['poco_fields_status'] = {
                'poco_score_exists': False,
                'poco_ocr_exists': False,
                'error': str(e)
            }
        
        try:
            users_data = self._fetch_all_with_pagination(
                api_client, f"{paperless_url}/api/users/"
            )
            results['users'] = self.db.sync_users(users_data)
        except Exception as e:
            logger.error(f"Failed to sync users: {e}")
            results['users'] = 0
        
        logger.info(f"Sync completed: {results}")
        return results
    
    def _fetch_all_with_pagination(self, api_client: PaperlessAPIClient, url: str) -> List[Dict]:
        """Fetch all items from a paginated endpoint"""
        all_items = []
        
        while url:
            response = api_client.session.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            all_items.extend(data.get('results', []))
            url = data.get('next')
        
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
