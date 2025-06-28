"""
POCOmeta - Configuration Management
Handles settings from settings.py and environment variables (environment takes priority)
"""

import os
from typing import Dict, Any, List, Optional

try:
    # Try relative imports first (when run as module)
    from .settings import get_settings
    user_settings = get_settings()
except ImportError:
    try:
        # Fall back to absolute imports (when run directly)
        from settings import get_settings
        user_settings = get_settings()
    except ImportError:
        user_settings = {}

class Config:
    """Configuration class for the application"""
    
    def __init__(self):
        # Helper function to get setting with priority: env var > settings.py > default
        def get_setting(env_name: str, settings_name: str, default_value):
            return os.getenv(env_name, user_settings.get(settings_name, default_value))
        
        # Server connection
        self.paperless_url = get_setting('PAPERLESS_URL', 'PAPERLESS_URL', 'http://localhost:8000')
        self.paperless_token = get_setting('PAPERLESS_TOKEN', 'PAPERLESS_TOKEN', '')
        
        # Ensure URL doesn't end with slash
        if self.paperless_url.endswith('/'):
            self.paperless_url = self.paperless_url[:-1]
        
        # Document filtering
        self.filter_tag_include = get_setting('FILTER_TAG_INCLUDE', 'INCLUDE_TAG', 'NEW')
        self.filter_tag_exclude = get_setting('FILTER_TAG_EXCLUDE', 'EXCLUDE_TAG', 'POCO')
        self.poco_tag_name = get_setting('POCO_TAG_NAME', 'COMPLETION_TAG', 'POCO')
        
        # Processing behavior
        self.max_documents = int(get_setting('MAX_DOCUMENTS', 'MAX_DOCUMENTS', '0'))
        self.document_types_filter = self._parse_list(get_setting('DOCUMENT_TYPES_FILTER', 'DOCUMENT_TYPES_FILTER', ''))
        self.correspondents_filter = self._parse_list(get_setting('CORRESPONDENTS_FILTER', 'CORRESPONDENTS_FILTER', ''))
        
        # Rule configuration
        self.rules_directory = get_setting('RULES_DIRECTORY', 'RULES_DIRECTORY', 'rules')
        self.enable_filename_matching = self._parse_bool(get_setting('ENABLE_FILENAME_MATCHING', 'ENABLE_FILENAME_MATCHING', 'True'))
        self.enable_content_matching = self._parse_bool(get_setting('ENABLE_CONTENT_MATCHING', 'ENABLE_CONTENT_MATCHING', 'True'))
        self.enable_date_extraction = self._parse_bool(get_setting('ENABLE_DATE_EXTRACTION', 'ENABLE_DATE_EXTRACTION', 'True'))
        self.enable_amount_extraction = self._parse_bool(get_setting('ENABLE_AMOUNT_EXTRACTION', 'ENABLE_AMOUNT_EXTRACTION', 'True'))
        
        # Scoring configuration
        self.global_threshold = int(get_setting('GLOBAL_THRESHOLD', 'RULE_MATCH_THRESHOLD', '70'))
        self.poco_threshold = int(get_setting('POCO_THRESHOLD', 'CONFIDENCE_THRESHOLD', '60'))
        
        # Custom field names
        self.poco_score_field = get_setting('POCO_SCORE_FIELD', 'POCO_SCORE_FIELD_NAME', 'POCO Score')
        self.document_category_field = get_setting('DOCUMENT_CATEGORY_FIELD', 'DOCUMENT_CATEGORY_FIELD_NAME', 'Document Category')
        self.processing_date_field = get_setting('PROCESSING_DATE_FIELD', 'PROCESSING_DATE_FIELD_NAME', '')
        
        # Output and logging
        self.default_verbosity = get_setting('DEFAULT_VERBOSITY', 'DEFAULT_VERBOSITY', 'normal')
        self.enable_file_logging = self._parse_bool(get_setting('ENABLE_FILE_LOGGING', 'ENABLE_FILE_LOGGING', 'True'))
        self.log_file_name = get_setting('LOG_FILE_NAME', 'LOG_FILE_NAME', 'processing.log')
        self.enable_debug_logging = self._parse_bool(get_setting('ENABLE_DEBUG_LOGGING', 'ENABLE_DEBUG_LOGGING', 'False'))
        
        # Safety and backup
        self.default_dry_run = self._parse_bool(get_setting('DEFAULT_DRY_RUN', 'DEFAULT_DRY_RUN', 'False'))
        self.enable_metadata_backup = self._parse_bool(get_setting('ENABLE_METADATA_BACKUP', 'ENABLE_METADATA_BACKUP', 'True'))
        self.backup_file_name = get_setting('BACKUP_FILE_NAME', 'BACKUP_FILE_NAME', 'metadata_backup.json')
        
        # Advanced settings
        self.api_timeout = int(get_setting('API_TIMEOUT', 'API_TIMEOUT', '30'))
        self.api_retry_count = int(get_setting('API_RETRY_COUNT', 'API_RETRY_COUNT', '3'))
        self.api_delay = float(get_setting('API_DELAY', 'API_DELAY', '0.1'))
        self.max_file_size_mb = int(get_setting('MAX_FILE_SIZE_MB', 'MAX_FILE_SIZE_MB', '100'))
        
        # Rule development helpers
        self.show_pattern_details = self._parse_bool(get_setting('SHOW_PATTERN_DETAILS', 'SHOW_PATTERN_DETAILS', 'False'))
        self.highlight_matches = self._parse_bool(get_setting('HIGHLIGHT_MATCHES', 'HIGHLIGHT_MATCHES', 'True'))
        self.show_score_breakdown = self._parse_bool(get_setting('SHOW_SCORE_BREAKDOWN', 'SHOW_SCORE_BREAKDOWN', 'True'))
    
    def _parse_bool(self, value) -> bool:
        """Parse string to boolean"""
        if isinstance(value, bool):
            return value
        return str(value).lower() in ('true', '1', 'yes', 'on')
    
    def _parse_list(self, value) -> List[str]:
        """Parse string or list to list of strings"""
        if isinstance(value, list):
            return value
        if isinstance(value, str) and value:
            return [item.strip() for item in value.split(',') if item.strip()]
        return []
    
    def validate(self) -> bool:
        """Validate configuration settings"""
        if not self.paperless_url:
            raise ValueError("PAPERLESS_URL environment variable is required")
        
        if not self.paperless_token:
            raise ValueError("PAPERLESS_TOKEN environment variable is required")
        
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return {
            'paperless_url': self.paperless_url,
            'paperless_token': '[REDACTED]',
            'filter_tag_include': self.filter_tag_include,
            'filter_tag_exclude': self.filter_tag_exclude,
            'poco_tag_name': self.poco_tag_name,
            'rules_directory': self.rules_directory,
            'global_threshold': self.global_threshold,
            'poco_threshold': self.poco_threshold,
            'poco_score_field': self.poco_score_field,
            'document_category_field': self.document_category_field
        }
