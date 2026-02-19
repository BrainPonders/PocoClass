"""
PocoClass - Paperless-ngx API Client

Handles all communication with the Paperless-ngx REST API for document management.
Provides methods for:
- Testing API connectivity
- CRUD operations on tags, correspondents, document types, and custom fields
- Document retrieval with flexible filtering (tags, dates, correspondents, etc.)
- Document content (OCR text) retrieval
- Document metadata updates (PATCH)

All entity lookups (tags, correspondents, etc.) use a local SQLite cache for
performance, falling back to the Paperless API when cache misses occur.
New entities are auto-created in Paperless if they don't exist (get-or-create pattern).

Key class:
    PaperlessAPIClient - Stateful client with session-based auth and caching
"""

import requests
import logging
from typing import Dict, List, Any, Optional
from backend.config import Config
from backend.database import Database

class PaperlessAPIClient:
    """Client for interacting with the Paperless-ngx REST API.
    
    Uses a persistent requests.Session with token-based authentication.
    All entity lookups are cached in the local Database for performance.
    """
    
    # Default timeout for all API requests (30 seconds)
    REQUEST_TIMEOUT = 30
    
    def __init__(self, config: Config, db: Optional[Database] = None):
        self.config = config
        self.db = db or Database()
        self.logger = logging.getLogger(__name__)
        self.session = requests.Session()
        
        # Set up authentication headers
        self.session.headers.update({
            'Authorization': f'Token {config.paperless_token}',
            'Content-Type': 'application/json'
        })
    
    def _fix_pagination_url(self, next_url: Optional[str]) -> Optional[str]:
        """Fix pagination URLs to use configured paperless_url instead of internal hostname.
        
        Paperless returns absolute URLs in 'next' field using its internal hostname,
        which may differ from the public URL we're configured to use. This method
        rewrites the URL to use our configured base URL.
        """
        if not next_url:
            return None
        
        try:
            from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
            
            parsed_next = urlparse(next_url)
            parsed_base = urlparse(self.config.paperless_url)
            
            fixed_url = urlunparse((
                parsed_base.scheme,
                parsed_base.netloc,
                parsed_next.path,
                parsed_next.params,
                parsed_next.query,
                parsed_next.fragment
            ))
            return fixed_url
        except Exception as e:
            self.logger.warning(f"Failed to fix pagination URL '{next_url}': {e}")
            return next_url
    
    def test_connection(self) -> bool:
        """Test connection to Paperless API"""
        try:
            response = self.session.get(f"{self.config.paperless_url}/api/", timeout=self.REQUEST_TIMEOUT)
            response.raise_for_status()
            self.logger.info("Successfully connected to Paperless API")
            return True
        except requests.RequestException as e:
            self.logger.error(f"Failed to connect to Paperless API: {e}")
            return False
    
    def check_tag_exists(self, tag_name: str) -> Optional[int]:
        """Check if tag exists WITHOUT creating it (for validation purposes)"""
        try:
            # Check cache first
            cached_id = self.db.get_tag_id_by_name(tag_name)
            if cached_id:
                self.logger.debug(f"Found tag '{tag_name}' in cache with ID {cached_id}")
                return cached_id
            
            # Not in cache - check Paperless API
            self.logger.debug(f"Tag '{tag_name}' not in cache, checking Paperless...")
            
            # Get all tags with pagination
            all_tags = []
            url = f"{self.config.paperless_url}/api/tags/"
            
            while url:
                response = self.session.get(url, timeout=self.REQUEST_TIMEOUT)
                response.raise_for_status()
                data = response.json()
                all_tags.extend(data.get('results', []))
                url = self._fix_pagination_url(data.get('next'))
            
            # Search for existing tag (case-sensitive exact match)
            for tag in all_tags:
                if tag['name'] == tag_name:
                    # Cache it for next time
                    self.db.sync_tags([tag])
                    self.logger.debug(f"Found existing tag '{tag_name}' with ID {tag['id']}")
                    return tag['id']
            
            # Tag not found - return None WITHOUT creating
            self.logger.debug(f"Tag '{tag_name}' does not exist in Paperless")
            return None
            
        except requests.RequestException as e:
            self.logger.error(f"Failed to check tag '{tag_name}': {e}")
            return None
    
    def get_tag_id(self, tag_name: str) -> Optional[int]:
        """Get tag ID by name, create if doesn't exist (uses cache for performance)"""
        try:
            # Check cache first
            cached_id = self.db.get_tag_id_by_name(tag_name)
            if cached_id:
                self.logger.debug(f"Found tag '{tag_name}' in cache with ID {cached_id}")
                return cached_id
            
            # Not in cache - check Paperless API
            self.logger.debug(f"Tag '{tag_name}' not in cache, checking Paperless...")
            
            # Get all tags with pagination and search by name
            all_tags = []
            url = f"{self.config.paperless_url}/api/tags/"
            
            while url:
                response = self.session.get(url, timeout=self.REQUEST_TIMEOUT)
                response.raise_for_status()
                data = response.json()
                all_tags.extend(data.get('results', []))
                url = self._fix_pagination_url(data.get('next'))
            
            # Search for existing tag
            for tag in all_tags:
                if tag['name'] == tag_name:
                    # Cache it for next time
                    self.db.sync_tags([tag])
                    return tag['id']
            
            # Create tag if it doesn't exist
            response = self.session.post(
                f"{self.config.paperless_url}/api/tags/",
                json={'name': tag_name},
                timeout=self.REQUEST_TIMEOUT
            )
            response.raise_for_status()
            
            tag_data = response.json()
            tag_id = tag_data['id']
            self.logger.info(f"Created new tag '{tag_name}' with ID {tag_id}")
            
            # Cache the new tag
            self.db.sync_tags([tag_data])
            
            return tag_id
            
        except requests.RequestException as e:
            self.logger.error(f"Failed to get/create tag '{tag_name}': {e}")
            return None
    
    def get_correspondent_id(self, correspondent_name: str) -> Optional[int]:
        """Get correspondent ID by name, create if doesn't exist (uses cache for performance)"""
        try:
            # Check cache first
            cached_id = self.db.get_correspondent_id_by_name(correspondent_name)
            if cached_id:
                self.logger.debug(f"Found correspondent '{correspondent_name}' in cache with ID {cached_id}")
                return cached_id
            
            # Not in cache - check Paperless API
            self.logger.debug(f"Correspondent '{correspondent_name}' not in cache, checking Paperless...")
            
            # First try to find existing correspondent
            response = self.session.get(
                f"{self.config.paperless_url}/api/correspondents/",
                params={'name': correspondent_name},
                timeout=self.REQUEST_TIMEOUT
            )
            response.raise_for_status()
            
            results = response.json().get('results', [])
            if results:
                # Cache it for next time
                self.db.sync_correspondents([results[0]])
                return results[0]['id']
            
            # Create correspondent if it doesn't exist
            response = self.session.post(
                f"{self.config.paperless_url}/api/correspondents/",
                json={'name': correspondent_name},
                timeout=self.REQUEST_TIMEOUT
            )
            response.raise_for_status()
            
            corr_data = response.json()
            correspondent_id = corr_data['id']
            self.logger.info(f"Created new correspondent '{correspondent_name}' with ID {correspondent_id}")
            
            # Cache the new correspondent
            self.db.sync_correspondents([corr_data])
            
            return correspondent_id
            
        except requests.RequestException as e:
            self.logger.error(f"Failed to get/create correspondent '{correspondent_name}': {e}")
            return None
    
    def get_document_type_id(self, document_type_name: str) -> Optional[int]:
        """Get document type ID by name, create if doesn't exist (uses cache for performance)"""
        try:
            # Check cache first
            cached_id = self.db.get_document_type_id_by_name(document_type_name)
            if cached_id:
                self.logger.debug(f"Found document type '{document_type_name}' in cache with ID {cached_id}")
                return cached_id
            
            # Not in cache - check Paperless API
            self.logger.debug(f"Document type '{document_type_name}' not in cache, checking Paperless...")
            
            # First try to find existing document type
            response = self.session.get(
                f"{self.config.paperless_url}/api/document_types/",
                params={'name': document_type_name},
                timeout=self.REQUEST_TIMEOUT
            )
            response.raise_for_status()
            
            results = response.json().get('results', [])
            if results:
                # Cache it for next time
                self.db.sync_document_types([results[0]])
                return results[0]['id']
            
            # Create document type if it doesn't exist
            response = self.session.post(
                f"{self.config.paperless_url}/api/document_types/",
                json={'name': document_type_name},
                timeout=self.REQUEST_TIMEOUT
            )
            response.raise_for_status()
            
            dt_data = response.json()
            document_type_id = dt_data['id']
            self.logger.info(f"Created new document type '{document_type_name}' with ID {document_type_id}")
            
            # Cache the new document type
            self.db.sync_document_types([dt_data])
            
            return document_type_id
            
        except requests.RequestException as e:
            self.logger.error(f"Failed to get/create document type '{document_type_name}': {e}")
            return None
    
    def check_custom_field_exists(self, field_name: str) -> Optional[int]:
        """Check if custom field exists WITHOUT creating it (for validation purposes)"""
        try:
            # Check cache first
            cached_id = self.db.get_custom_field_id_by_name(field_name)
            if cached_id:
                self.logger.debug(f"Found custom field '{field_name}' in cache with ID {cached_id}")
                return cached_id
            
            # Not in cache - check Paperless API
            self.logger.debug(f"Custom field '{field_name}' not in cache, checking Paperless...")
            
            # Get all custom fields with pagination (similar to tags)
            all_fields = []
            url = f"{self.config.paperless_url}/api/custom_fields/"
            
            while url:
                response = self.session.get(url, timeout=self.REQUEST_TIMEOUT)
                response.raise_for_status()
                data = response.json()
                all_fields.extend(data.get('results', []))
                url = self._fix_pagination_url(data.get('next'))
            
            # Search for existing custom field (case-sensitive exact match)
            for field in all_fields:
                if field['name'] == field_name:
                    # Cache it for next time
                    self.db.cache_custom_field(field)
                    self.logger.debug(f"Found existing custom field '{field_name}' with ID {field['id']}")
                    return field['id']
            
            # Field not found - return None WITHOUT creating
            self.logger.debug(f"Custom field '{field_name}' does not exist in Paperless")
            return None
            
        except requests.RequestException as e:
            self.logger.error(f"Failed to check custom field '{field_name}': {e}")
            return None
    
    def get_custom_field_id(self, field_name: str) -> Optional[int]:
        """Get custom field ID by name, create if doesn't exist (uses cache for performance)"""
        try:
            # Check cache first
            cached_id = self.db.get_custom_field_id_by_name(field_name)
            if cached_id:
                self.logger.debug(f"Found custom field '{field_name}' in cache with ID {cached_id}")
                return cached_id
            
            # Not in cache - check Paperless API with pagination
            self.logger.debug(f"Custom field '{field_name}' not in cache, checking Paperless...")
            
            # Get all custom fields with pagination (similar to tags and check method)
            all_fields = []
            url = f"{self.config.paperless_url}/api/custom_fields/"
            
            while url:
                response = self.session.get(url, timeout=self.REQUEST_TIMEOUT)
                response.raise_for_status()
                data = response.json()
                all_fields.extend(data.get('results', []))
                url = self._fix_pagination_url(data.get('next'))
            
            # Search for existing custom field (case-sensitive exact match)
            for field in all_fields:
                if field['name'] == field_name:
                    # Cache it for next time
                    self.db.cache_custom_field(field)
                    self.logger.debug(f"Found existing custom field '{field_name}' with ID {field['id']}")
                    return field['id']
            
            # Field not found - create it
            self.logger.info(f"Custom field '{field_name}' not found, creating...")
            response = self.session.post(
                f"{self.config.paperless_url}/api/custom_fields/",
                json={
                    'name': field_name,
                    'data_type': 'string'
                },
                timeout=self.REQUEST_TIMEOUT
            )
            response.raise_for_status()
            
            cf_data = response.json()
            field_id = cf_data['id']
            self.logger.info(f"Created new custom field '{field_name}' with ID {field_id}")
            
            # Cache the new custom field (without deleting other cached fields)
            self.db.cache_custom_field(cf_data)
            
            return field_id
            
        except requests.RequestException as e:
            self.logger.error(f"Failed to get/create custom field '{field_name}': {e}")
            return None
    
    def create_custom_field(self, field_name: str, data_type: str = 'string') -> int:
        """Create a custom field in Paperless-ngx and return its ID"""
        response = self.session.post(
            f"{self.config.paperless_url}/api/custom_fields/",
            json={
                'name': field_name,
                'data_type': data_type
            },
            timeout=self.REQUEST_TIMEOUT
        )
        response.raise_for_status()
        cf_data = response.json()
        field_id = cf_data['id']
        self.logger.info(f"Created new custom field '{field_name}' with ID {field_id}")
        self.db.cache_custom_field(cf_data)
        return field_id

    def get_custom_field_by_id(self, field_id: int) -> Optional[Dict]:
        """Get custom field definition by ID (cached, includes select options)"""
        try:
            # Check cache first
            cached_field = self.db.get_custom_field_by_id(field_id)
            if cached_field:
                self.logger.debug(f"Found custom field ID {field_id} in cache: {cached_field['name']}")
                return cached_field
            
            # Not in cache - should not happen if sync is working correctly
            self.logger.warning(f"Custom field ID {field_id} not found in cache")
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to get custom field by ID {field_id}: {e}")
            return None
    
    def get_documents(self, limit: Optional[int] = None, document_id: Optional[int] = None, ignore_tags: bool = False,
                     title: Optional[str] = None, tags: Optional[List[str]] = None, tags_mode: str = 'include',
                     exclude_tags: Optional[List[str]] = None,
                     correspondents: Optional[List[str]] = None, correspondents_mode: str = 'include',
                     doc_types: Optional[List[str]] = None, doc_types_mode: str = 'include',
                     date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve documents from Paperless with flexible filtering.
        
        Supports two modes:
        1. Single document fetch (when document_id is provided)
        2. Bulk fetch with pagination and query filters
        
        Filter parameters are translated to Paperless API query params
        (e.g., tags__id__in, correspondent__id__in, added__gte).
        
        Args:
            limit: Maximum number of documents to return
            document_id: Fetch a specific document by ID
            ignore_tags: If True, skip the default include/exclude tag filtering
            title: Filter by title (case-insensitive contains)
            tags: List of tag names to filter by
            tags_mode: 'include' or 'exclude' for tag filtering
            exclude_tags: Additional tag names to exclude (can combine with tags)
            correspondents: List of correspondent names to filter by
            correspondents_mode: 'include' or 'exclude' for correspondent filtering
            doc_types: List of document type names to filter by
            doc_types_mode: 'include' or 'exclude' for doc type filtering
            date_from: Filter documents added on or after this date
            date_to: Filter documents added on or before this date
            
        Returns:
            List of document dicts from Paperless API
        """
        try:
            # Skip tag filtering if ignore_tags is True
            if ignore_tags:
                include_tag_id = None
                exclude_tag_id = None
                self.logger.info("Ignoring tag filtering - retrieving all documents")
            else:
                # Get tag IDs for filtering
                include_tag_id = self.get_tag_id(self.config.filter_tag_include)
                exclude_tag_id = self.get_tag_id(self.config.filter_tag_exclude)
                
                if not include_tag_id:
                    self.logger.error(f"Cannot find or create tag '{self.config.filter_tag_include}'")
                    return []
            
            # Build query parameters
            params = {}
            
            # Add custom filters
            if title:
                params['title__icontains'] = title
            
            if tags and len(tags) > 0:
                tag_ids = []
                for tag_name in tags:
                    tag_id = self.get_tag_id(tag_name)
                    if tag_id:
                        tag_ids.append(tag_id)
                
                if tag_ids:
                    if tags_mode == 'exclude':
                        params['tags__id__none'] = ','.join(map(str, tag_ids))
                    elif tags_mode == 'all':
                        params['tags__id__all'] = ','.join(map(str, tag_ids))
                    else:
                        params['tags__id__in'] = ','.join(map(str, tag_ids))
            
            # Handle separate exclude_tags parameter (can be used alongside the tags param above)
            if exclude_tags and len(exclude_tags) > 0:
                exclude_tag_ids = []
                for tag_name in exclude_tags:
                    tag_id = self.get_tag_id(tag_name)
                    if tag_id:
                        exclude_tag_ids.append(tag_id)
                
                if exclude_tag_ids:
                    # Merge with any existing exclusions (e.g., from tags param in 'exclude' mode)
                    existing_none = params.get('tags__id__none', '')
                    if existing_none:
                        all_exclude_ids = existing_none + ',' + ','.join(map(str, exclude_tag_ids))
                        params['tags__id__none'] = all_exclude_ids
                    else:
                        params['tags__id__none'] = ','.join(map(str, exclude_tag_ids))
            
            if correspondents and len(correspondents) > 0:
                # Get correspondent IDs from names
                corr_ids = []
                cached_corrs = {c['name']: c['paperless_id'] for c in self.db.get_all_correspondents()}
                for corr_name in correspondents:
                    if corr_name in cached_corrs:
                        corr_ids.append(cached_corrs[corr_name])
                
                if corr_ids:
                    if correspondents_mode == 'include':
                        params['correspondent__id__in'] = ','.join(map(str, corr_ids))
                    else:  # exclude
                        params['correspondent__id__none'] = ','.join(map(str, corr_ids))
            
            if doc_types and len(doc_types) > 0:
                # Get document type IDs from names
                dt_ids = []
                cached_dts = {dt['name']: dt['paperless_id'] for dt in self.db.get_all_document_types()}
                for dt_name in doc_types:
                    if dt_name in cached_dts:
                        dt_ids.append(cached_dts[dt_name])
                
                if dt_ids:
                    if doc_types_mode == 'include':
                        params['document_type__id__in'] = ','.join(map(str, dt_ids))
                    else:  # exclude
                        params['document_type__id__none'] = ','.join(map(str, dt_ids))
            
            # Date filtering (use added date, not created date)
            if date_from:
                params['added__gte'] = date_from
            if date_to:
                params['added__lte'] = date_to
            
            if document_id:
                # Single-document fetch mode
                response = self.session.get(f"{self.config.paperless_url}/api/documents/{document_id}/", timeout=self.REQUEST_TIMEOUT)
                response.raise_for_status()
                doc = response.json()
                
                if ignore_tags:
                    return [doc]
                
                # Verify document passes include/exclude tag filters before returning
                doc_tag_ids = []
                for tag in doc.get('tags', []):
                    # Paperless may return tags as objects or raw IDs depending on context
                    if isinstance(tag, dict):
                        doc_tag_ids.append(tag['id'])
                    else:
                        doc_tag_ids.append(tag)
                
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
                if not ignore_tags:
                    # Apply legacy tag filters only when no user-selected tag filters exist
                    if 'tags__id__in' not in params and include_tag_id:
                        params['tags__id__in'] = include_tag_id
                    if 'tags__id__none' not in params and exclude_tag_id:
                        params['tags__id__none'] = exclude_tag_id
                
                # Handle pagination to get all documents
                all_documents = []
                page = 1
                page_size = 100  # Use larger page size for efficiency
                
                while True:
                    params['page'] = page
                    params['page_size'] = page_size
                    
                    response = self.session.get(
                        f"{self.config.paperless_url}/api/documents/",
                        params=params,
                        timeout=self.REQUEST_TIMEOUT
                    )
                    response.raise_for_status()
                    
                    data = response.json()
                    results = data.get('results', [])
                    all_documents.extend(results)
                    
                    # Check if we have more pages
                    if not data.get('next') or (limit and len(all_documents) >= limit):
                        break
                    
                    page += 1
                
                # Apply limit after getting all documents (for ignore_tags mode)
                if limit and len(all_documents) > limit:
                    all_documents = all_documents[:limit]
                
                return all_documents
                
        except requests.RequestException as e:
            self.logger.error(f"Failed to get documents: {e}")
            return []
    
    def get_document_content(self, document_id: int) -> Optional[str]:
        """Get OCR content for a document"""
        try:
            # Get document metadata which includes the content field
            response = self.session.get(f"{self.config.paperless_url}/api/documents/{document_id}/", timeout=self.REQUEST_TIMEOUT)
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
                json=updates,
                timeout=self.REQUEST_TIMEOUT
            )
            response.raise_for_status()
            self.logger.info(f"Successfully updated document {document_id}")
            return True
        except requests.RequestException as e:
            # Capture response body for debugging (truncated to 500 chars to avoid log bloat)
            response_body = ''
            if hasattr(e, 'response') and e.response is not None:
                try:
                    response_body = e.response.text[:500]
                except Exception:
                    pass
            self.logger.error(f"Failed to update document {document_id}: {e} | Response: {response_body} | Payload: {updates}")
            return False
    
    def get_all_correspondents(self) -> Dict[str, int]:
        """Get all correspondents as name -> ID mapping"""
        try:
            correspondents = {}
            url = f"{self.config.paperless_url}/api/correspondents/"
            
            while url:
                response = self.session.get(url, timeout=self.REQUEST_TIMEOUT)
                response.raise_for_status()
                data = response.json()
                
                for correspondent in data.get('results', []):
                    correspondents[correspondent['name']] = correspondent['id']
                
                url = self._fix_pagination_url(data.get('next'))  # Get next page URL or None
            
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
                response = self.session.get(url, timeout=self.REQUEST_TIMEOUT)
                response.raise_for_status()
                data = response.json()
                
                for doc_type in data.get('results', []):
                    document_types[doc_type['name']] = doc_type['id']
                
                url = self._fix_pagination_url(data.get('next'))  # Get next page URL or None
            
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
                response = self.session.get(url, timeout=self.REQUEST_TIMEOUT)
                response.raise_for_status()
                data = response.json()
                
                for tag in data.get('results', []):
                    tags[tag['name']] = tag['id']
                
                url = self._fix_pagination_url(data.get('next'))  # Get next page URL or None
            
            return tags
        except requests.RequestException as e:
            self.logger.error(f"Failed to get tags: {e}")
            return {}
    
    def get_all_custom_fields(self) -> Dict[str, int]:
        """Get all custom fields as name -> ID mapping"""
        try:
            response = self.session.get(f"{self.config.paperless_url}/api/custom_fields/", timeout=self.REQUEST_TIMEOUT)
            response.raise_for_status()
            
            custom_fields = {}
            for field in response.json().get('results', []):
                custom_fields[field['name']] = field['id']
            
            return custom_fields
        except requests.RequestException as e:
            self.logger.error(f"Failed to get custom fields: {e}")
            return {}
