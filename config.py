"""
Configuration module for Post-Consumption Script
Handles environment variables and default settings
"""

import os
from typing import Dict, Any

class Config:
    """Configuration class for the application"""
    
    def __init__(self):
        self.paperless_url = os.getenv('PAPERLESS_URL', 'http://localhost:8000')
        self.paperless_token = os.getenv('PAPERLESS_TOKEN', '')
        
        # Ensure URL doesn't end with slash
        if self.paperless_url.endswith('/'):
            self.paperless_url = self.paperless_url[:-1]
        
        # Tag configuration
        self.filter_tag_include = os.getenv('FILTER_TAG_INCLUDE', 'NEW')
        self.filter_tag_exclude = os.getenv('FILTER_TAG_EXCLUDE', 'POCO')
        self.poco_tag_name = os.getenv('POCO_TAG_NAME', 'POCO')
        
        # Rule configuration
        self.rules_directory = os.getenv('RULES_DIRECTORY', 'rules')
        
        # Scoring configuration
        self.global_threshold = int(os.getenv('GLOBAL_THRESHOLD', '70'))
        self.poco_threshold = int(os.getenv('POCO_THRESHOLD', '60'))
        
        # Custom field names
        self.poco_score_field = os.getenv('POCO_SCORE_FIELD', 'POCO Score')
        self.document_category_field = os.getenv('DOCUMENT_CATEGORY_FIELD', 'Document Category')
    
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
