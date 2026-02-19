"""
PocoClass - Configuration Management

Centralizes all application settings by reading from environment variables
with sensible defaults. Covers Paperless-ngx connection, document filtering,
scoring thresholds, custom field names, logging, and API behavior.

Key class:
    Config: Reads environment variables on instantiation and exposes them
            as typed attributes. Provides a safe to_dict() that redacts secrets.
"""

import os
import logging
from typing import Dict, Any, List

class Config:
    """Application configuration loaded from environment variables.

    All settings fall back to reasonable defaults so the application can run
    out-of-the-box in a development environment without any env vars set.
    """
    
    def __init__(self):
        """Initialize configuration by reading all environment variables."""

        # --- Paperless-ngx server connection ---
        self.paperless_url = os.getenv('PAPERLESS_URL', 'http://localhost:8000')
        self.paperless_token = os.getenv('PAPERLESS_TOKEN', '')
        
        # Strip trailing slash to avoid double-slash issues in URL construction
        if self.paperless_url.endswith('/'):
            self.paperless_url = self.paperless_url[:-1]
        
        # --- Document filtering ---
        # Tags used to select which documents to process and which to skip
        self.filter_tag_include = os.getenv('FILTER_TAG_INCLUDE', 'NEW')
        self.filter_tag_exclude = os.getenv('FILTER_TAG_EXCLUDE', 'POCO')
        self.poco_tag_name = os.getenv('POCO_TAG_NAME', 'POCO')
        
        # --- Processing behavior ---
        # max_documents=0 means no limit
        self.max_documents = int(os.getenv('MAX_DOCUMENTS', '0'))
        # Comma-separated lists parsed into Python lists
        self.document_types_filter = self._parse_list(os.getenv('DOCUMENT_TYPES_FILTER', ''))
        self.correspondents_filter = self._parse_list(os.getenv('CORRESPONDENTS_FILTER', ''))
        
        # --- Rule configuration ---
        self.rules_directory = os.getenv('RULES_DIRECTORY', 'rules')
        self.enable_filename_matching = self._parse_bool(os.getenv('ENABLE_FILENAME_MATCHING', 'True'))
        self.enable_content_matching = self._parse_bool(os.getenv('ENABLE_CONTENT_MATCHING', 'True'))
        self.enable_date_extraction = self._parse_bool(os.getenv('ENABLE_DATE_EXTRACTION', 'True'))
        self.enable_amount_extraction = self._parse_bool(os.getenv('ENABLE_AMOUNT_EXTRACTION', 'True'))
        
        # --- Scoring thresholds (percentage 0-100) ---
        self.global_threshold = int(os.getenv('GLOBAL_THRESHOLD', '70'))
        self.poco_threshold = int(os.getenv('POCO_THRESHOLD', '60'))
        
        # --- Custom field names in Paperless-ngx ---
        self.poco_score_field = os.getenv('POCO_SCORE_FIELD', 'POCO Score')
        self.document_category_field = os.getenv('DOCUMENT_CATEGORY_FIELD', 'Document Category')
        self.processing_date_field = os.getenv('PROCESSING_DATE_FIELD', '')
        
        # --- Output and logging ---
        self.default_verbosity = os.getenv('DEFAULT_VERBOSITY', 'normal')
        self.enable_file_logging = self._parse_bool(os.getenv('ENABLE_FILE_LOGGING', 'True'))
        self.log_file_name = os.getenv('LOG_FILE_NAME', 'processing.log')
        self.enable_debug_logging = self._parse_bool(os.getenv('ENABLE_DEBUG_LOGGING', 'False'))
        
        # --- Safety settings ---
        self.default_dry_run = self._parse_bool(os.getenv('DEFAULT_DRY_RUN', 'False'))
        
        # --- Advanced / API settings ---
        self.api_timeout = int(os.getenv('API_TIMEOUT', '30'))
        self.api_retry_count = int(os.getenv('API_RETRY_COUNT', '3'))
        self.api_delay = float(os.getenv('API_DELAY', '0.1'))
        self.max_file_size_mb = int(os.getenv('MAX_FILE_SIZE_MB', '100'))
        
        # --- Rule development helpers ---
        self.show_pattern_details = self._parse_bool(os.getenv('SHOW_PATTERN_DETAILS', 'False'))
        self.highlight_matches = self._parse_bool(os.getenv('HIGHLIGHT_MATCHES', 'True'))
        self.show_score_breakdown = self._parse_bool(os.getenv('SHOW_SCORE_BREAKDOWN', 'True'))
    
    def _parse_bool(self, value) -> bool:
        """Parse a string value into a boolean.

        Accepts common truthy strings: 'true', '1', 'yes', 'on' (case-insensitive).

        Args:
            value: String or bool to parse.

        Returns:
            Boolean interpretation of the value.
        """
        if isinstance(value, bool):
            return value
        return str(value).lower() in ('true', '1', 'yes', 'on')
    
    def _parse_list(self, value) -> List[str]:
        """Parse a comma-separated string into a list of trimmed, non-empty strings.

        Args:
            value: Comma-separated string or an existing list.

        Returns:
            List of strings (empty list if input is empty or None).
        """
        if isinstance(value, list):
            return value
        if isinstance(value, str) and value:
            return [item.strip() for item in value.split(',') if item.strip()]
        return []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to a dictionary safe for logging or API responses.

        The Paperless API token is redacted to prevent accidental exposure.

        Returns:
            Dictionary of key configuration values with the token masked.
        """
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
