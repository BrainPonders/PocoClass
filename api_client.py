"""
POCOmeta - Paperless-ngx API Client
Handles all communication with the Paperless-ngx API for document retrieval and metadata updates
"""

import requests
import logging
from typing import Dict, List, Any, Optional
try:
    from .config import Config
except ImportError:
    from config import Config

class PaperlessAPIClient:
    """Client for interacting with Paperless-ngx API"""
    
    def __init__(self, config: Config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.session = requests.Session()
        
        # Set up authentication headers
        self.session.headers.update({
            'Authorization': f'Token {config.paperless_token}',
            'Content-Type': 'application/json'
        })
    
    def test_connection(self) -> bool:
        """Test connection to Paperless API"""
        try:
            response = self.session.get(f"{self.config.paperless_url}/api/")
            response.raise_for_status()
            self.logger.info("Successfully connected to Paperless API")
            return True
        except requests.RequestException as e:
            self.logger.error(f"Failed to connect to Paperless API: {e}")
            return False
    
    def get_tag_id(self, tag_name: str) -> Optional[int]:
        """Get tag ID by name, create if doesn't exist"""
        try:
            # Get all tags with pagination and search by name
            all_tags = []
            url = f"{self.config.paperless_url}/api/tags/"
            
            while url:
                response = self.session.get(url)
                response.raise_for_status()
                data = response.json()
                all_tags.extend(data.get('results', []))
                url = data.get('next')
            
            # Search for existing tag
            for tag in all_tags:
                if tag['name'] == tag_name:
                    return tag['id']
            
            # Create tag if it doesn't exist
            response = self.session.post(
                f"{self.config.paperless_url}/api/tags/",
                json={'name': tag_name}
            )
            response.raise_for_status()
            
            tag_id = response.json()['id']
            self.logger.info(f"Created new tag '{tag_name}' with ID {tag_id}")
            return tag_id
            
        except requests.RequestException as e:
            self.logger.error(f"Failed to get/create tag '{tag_name}': {e}")
            return None
    
    def get_correspondent_id(self, correspondent_name: str) -> Optional[int]:
        """Get correspondent ID by name, create if doesn't exist"""
        try:
            # First try to find existing correspondent
            response = self.session.get(
                f"{self.config.paperless_url}/api/correspondents/",
                params={'name': correspondent_name}
            )
            response.raise_for_status()
            
            results = response.json().get('results', [])
            if results:
                return results[0]['id']
            
            # Create correspondent if it doesn't exist
            response = self.session.post(
                f"{self.config.paperless_url}/api/correspondents/",
                json={'name': correspondent_name}
            )
            response.raise_for_status()
            
            correspondent_id = response.json()['id']
            self.logger.info(f"Created new correspondent '{correspondent_name}' with ID {correspondent_id}")
            return correspondent_id
            
        except requests.RequestException as e:
            self.logger.error(f"Failed to get/create correspondent '{correspondent_name}': {e}")
            return None
    
    def get_document_type_id(self, document_type_name: str) -> Optional[int]:
        """Get document type ID by name, create if doesn't exist"""
        try:
            # First try to find existing document type
            response = self.session.get(
                f"{self.config.paperless_url}/api/document_types/",
                params={'name': document_type_name}
            )
            response.raise_for_status()
            
            results = response.json().get('results', [])
            if results:
                return results[0]['id']
            
            # Create document type if it doesn't exist
            response = self.session.post(
                f"{self.config.paperless_url}/api/document_types/",
                json={'name': document_type_name}
            )
            response.raise_for_status()
            
            document_type_id = response.json()['id']
            self.logger.info(f"Created new document type '{document_type_name}' with ID {document_type_id}")
            return document_type_id
            
        except requests.RequestException as e:
            self.logger.error(f"Failed to get/create document type '{document_type_name}': {e}")
            return None
    
    def get_custom_field_id(self, field_name: str) -> Optional[int]:
        """Get custom field ID by name, create if doesn't exist"""
        try:
            # First try to find existing custom field
            response = self.session.get(
                f"{self.config.paperless_url}/api/custom_fields/",
                params={'name': field_name}
            )
            response.raise_for_status()
            
            results = response.json().get('results', [])
            if results:
                return results[0]['id']
            
            # Create custom field if it doesn't exist
            response = self.session.post(
                f"{self.config.paperless_url}/api/custom_fields/",
                json={
                    'name': field_name,
                    'data_type': 'string'
                }
            )
            response.raise_for_status()
            
            field_id = response.json()['id']
            self.logger.info(f"Created new custom field '{field_name}' with ID {field_id}")
            return field_id
            
        except requests.RequestException as e:
            self.logger.error(f"Failed to get/create custom field '{field_name}': {e}")
            return None
    
    def get_documents(self, limit: Optional[int] = None, document_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get documents matching filter criteria"""
        try:
            # Get tag IDs for filtering
            include_tag_id = self.get_tag_id(self.config.filter_tag_include)
            exclude_tag_id = self.get_tag_id(self.config.filter_tag_exclude)
            
            if not include_tag_id:
                self.logger.error(f"Cannot find or create tag '{self.config.filter_tag_include}'")
                return []
            
            # Build query parameters
            params = {}
            
            if document_id:
                # Get specific document
                response = self.session.get(f"{self.config.paperless_url}/api/documents/{document_id}/")
                response.raise_for_status()
                doc = response.json()
                
                # Check if document matches filter criteria
                doc_tag_ids = []
                for tag in doc.get('tags', []):
                    if isinstance(tag, dict):
                        doc_tag_ids.append(tag['id'])
                    else:
                        doc_tag_ids.append(tag)  # Tag is already an ID
                
                # Debug logging
                self.logger.debug(f"Document {document_id} tags: {doc_tag_ids}")
                self.logger.debug(f"Include tag ID: {include_tag_id}, Exclude tag ID: {exclude_tag_id}")
                has_include = include_tag_id in doc_tag_ids
                has_exclude = exclude_tag_id and exclude_tag_id in doc_tag_ids
                should_process = has_include and not has_exclude
                self.logger.debug(f"Has include: {has_include}, Has exclude: {has_exclude}, Should process: {should_process}")
                
                if should_process:
                    return [doc]
                else:
                    self.logger.warning(f"Document {document_id} does not match filter criteria")
                    return []
            else:
                # Get documents with tag filters
                params['tags__id__in'] = include_tag_id
                if exclude_tag_id:
                    params['tags__id__none'] = exclude_tag_id
                
                if limit:
                    params['page_size'] = limit
                
                response = self.session.get(
                    f"{self.config.paperless_url}/api/documents/",
                    params=params
                )
                response.raise_for_status()
                
                return response.json().get('results', [])
                
        except requests.RequestException as e:
            self.logger.error(f"Failed to get documents: {e}")
            return []
    
    def get_document_content(self, document_id: int) -> Optional[str]:
        """Get OCR content for a document"""
        try:
            # Get document metadata which includes the content field
            response = self.session.get(f"{self.config.paperless_url}/api/documents/{document_id}/")
            response.raise_for_status()
            doc_data = response.json()
            return doc_data.get('content', '')
        except requests.RequestException as e:
            self.logger.error(f"Failed to get content for document {document_id}: {e}")
            return None
    
    def update_document(self, document_id: int, updates: Dict[str, Any]) -> bool:
        """Update document metadata"""
        try:
            response = self.session.patch(
                f"{self.config.paperless_url}/api/documents/{document_id}/",
                json=updates
            )
            response.raise_for_status()
            self.logger.info(f"Successfully updated document {document_id}")
            return True
        except requests.RequestException as e:
            self.logger.error(f"Failed to update document {document_id}: {e}")
            return False
    
    def get_all_correspondents(self) -> Dict[str, int]:
        """Get all correspondents as name -> ID mapping"""
        try:
            correspondents = {}
            url = f"{self.config.paperless_url}/api/correspondents/"
            
            while url:
                response = self.session.get(url)
                response.raise_for_status()
                data = response.json()
                
                for correspondent in data.get('results', []):
                    correspondents[correspondent['name']] = correspondent['id']
                
                url = data.get('next')  # Get next page URL or None
            
            return correspondents
        except requests.RequestException as e:
            self.logger.error(f"Failed to get correspondents: {e}")
            return {}
    
    def get_all_document_types(self) -> Dict[str, int]:
        """Get all document types as name -> ID mapping"""
        try:
            document_types = {}
            url = f"{self.config.paperless_url}/api/document_types/"
            
            while url:
                response = self.session.get(url)
                response.raise_for_status()
                data = response.json()
                
                for doc_type in data.get('results', []):
                    document_types[doc_type['name']] = doc_type['id']
                
                url = data.get('next')  # Get next page URL or None
            
            return document_types
        except requests.RequestException as e:
            self.logger.error(f"Failed to get document types: {e}")
            return {}
    
    def get_all_tags(self) -> Dict[str, int]:
        """Get all tags as name -> ID mapping"""
        try:
            tags = {}
            url = f"{self.config.paperless_url}/api/tags/"
            
            while url:
                response = self.session.get(url)
                response.raise_for_status()
                data = response.json()
                
                for tag in data.get('results', []):
                    tags[tag['name']] = tag['id']
                
                url = data.get('next')  # Get next page URL or None
            
            return tags
        except requests.RequestException as e:
            self.logger.error(f"Failed to get tags: {e}")
            return {}
    
    def get_all_custom_fields(self) -> Dict[str, int]:
        """Get all custom fields as name -> ID mapping"""
        try:
            response = self.session.get(f"{self.config.paperless_url}/api/custom_fields/")
            response.raise_for_status()
            
            custom_fields = {}
            for field in response.json().get('results', []):
                custom_fields[field['name']] = field['id']
            
            return custom_fields
        except requests.RequestException as e:
            self.logger.error(f"Failed to get custom fields: {e}")
            return {}
