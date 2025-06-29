"""
POCOmeta - Metadata Processor
Handles extraction and processing of metadata from various sources including content, filename, and API data
"""

import re
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

class MetadataProcessor:
    """Processes metadata from different sources"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def extract_metadata_from_rule(self, rule: Dict[str, Any], content: str, filename: str) -> Dict[str, Any]:
        """Extract metadata from a rule, combining static and dynamic metadata"""
        metadata = {
            'static': self.extract_static_metadata(rule),
            'dynamic': self.extract_dynamic_metadata(rule, content),
            'filename': self.extract_filename_metadata(rule, filename)
        }
        
        return metadata
    
    def extract_static_metadata(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Extract static metadata from rule"""
        static_metadata = rule.get('static_metadata', {})
        
        # Process static metadata
        processed = {}
        for field, value in static_metadata.items():
            if field == 'custom_fields' and isinstance(value, dict):
                # Convert custom fields dict to list format
                processed[field] = [{'name': k, 'value': v} for k, v in value.items()]
            elif field == 'tags' and isinstance(value, list):
                processed[field] = value
            else:
                processed[field] = value
        
        return processed
    
    def extract_dynamic_metadata(self, rule: Dict[str, Any], content: str) -> Dict[str, Any]:
        """Extract dynamic metadata from content using rule patterns"""
        dynamic_metadata = rule.get('dynamic_metadata', {})
        extracted = {}
        
        for field_name, field_config in dynamic_metadata.items():
            if isinstance(field_config, dict) and 'pattern_after' in field_config:
                pattern = field_config['pattern_after']
                value = self.extract_value_from_pattern(content, pattern)
                
                if value:
                    # Apply formatting if specified
                    if field_name == 'date_created' and 'format' in field_config:
                        formatted_value = self.parse_date(value, field_config['format'])
                        if formatted_value:
                            extracted[field_name] = formatted_value
                    else:
                        extracted[field_name] = value
        
        return extracted
    
    def extract_filename_metadata(self, rule: Dict[str, Any], filename: str) -> Dict[str, Any]:
        """Extract metadata from filename using rule patterns"""
        filename_metadata = rule.get('filename_metadata', {})
        filename_patterns = rule.get('filename_patterns', [])
        
        extracted = {}
        has_pattern_match = False
        
        # Check all filename patterns to find matches (supports multiple patterns for flexibility)
        matched_patterns = []
        
        for i, pattern_config in enumerate(filename_patterns):
            if isinstance(pattern_config, dict) and 'pattern' in pattern_config:
                pattern = pattern_config['pattern']
                match = re.search(pattern, filename, re.IGNORECASE)
                
                if match:
                    has_pattern_match = True
                    matched_patterns.append(f"Pattern {i+1}: {pattern}")
                    self.logger.debug(f"Filename pattern {i+1} matched: {pattern}")
                    
                    # Extract date if date_group is specified
                    if 'date_group' in pattern_config:
                        date_group = pattern_config['date_group']
                        if len(match.groups()) >= date_group:
                            date_str = match.group(date_group)
                            if date_str:
                                # Try to parse the date
                                date_format = pattern_config.get('date_format', '%Y-%m')
                                parsed_date = self.parse_date(date_str, date_format)
                                if parsed_date:
                                    extracted['date_created'] = parsed_date
                                    self.logger.debug(f"Extracted date from filename pattern {i+1}: {parsed_date}")
                    
                    # Extract year if year_group is specified
                    if 'year_group' in pattern_config:
                        year_group = pattern_config['year_group']
                        if len(match.groups()) >= year_group:
                            year_str = match.group(year_group)
                            if year_str:
                                # Add year tag if not already present
                                if 'tags' not in extracted:
                                    extracted['tags'] = []
                                year_tag = f"FY{year_str}"
                                if year_tag not in extracted['tags']:
                                    extracted['tags'].append(year_tag)
                                self.logger.debug(f"Extracted year tag from filename: {year_tag}")
                    
                    # Extract account info if account_group is specified
                    if 'account_group' in pattern_config:
                        account_group = pattern_config['account_group']
                        if len(match.groups()) >= account_group:
                            account_str = match.group(account_group)
                            if account_str:
                                # Could be used for account-specific tagging
                                self.logger.debug(f"Extracted account info from filename: {account_str}")
                    
                    # Use first matching pattern for primary extraction
                    break
        
        if matched_patterns:
            self.logger.debug(f"Matched filename patterns: {', '.join(matched_patterns)}")
        
        # Only apply static filename metadata if a pattern matched
        if has_pattern_match:
            self.logger.debug("Applying static filename metadata due to pattern match")
            for field, value in filename_metadata.items():
                if field == 'custom_fields' and isinstance(value, dict):
                    extracted[field] = [{'name': k, 'value': v} for k, v in value.items()]
                elif field == 'tags' and isinstance(value, list):
                    extracted[field] = value
                else:
                    extracted[field] = value
        else:
            self.logger.debug("No filename patterns matched - no filename metadata applied")
        
        return extracted
    
    def extract_value_from_pattern(self, text: str, pattern: str) -> Optional[str]:
        """Extract a value from text using a regex pattern"""
        try:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                groups = match.groups()
                if groups:
                    return groups[-1]
                else:
                    return match.group(0)
            return None
        except re.error as e:
            self.logger.error(f"Invalid regex pattern '{pattern}': {e}")
            return None
    
    def parse_date(self, date_str: str, date_format: str) -> Optional[str]:
        """Parse a date string using the specified format"""
        try:
            parsed_date = datetime.strptime(date_str, date_format)
            # Return in ISO format (YYYY-MM-DD)
            return parsed_date.strftime('%Y-%m-%d')
        except ValueError as e:
            self.logger.warning(f"Failed to parse date '{date_str}' with format '{date_format}': {e}")
            return None
    
    def process_paperless_metadata(self, raw_doc: Dict[str, Any], api_client=None) -> Dict[str, Any]:
        """Process raw Paperless metadata into structured format"""
        processed = {
            'date_created': {
                'raw': raw_doc.get('created'),
                'parsed': self.parse_paperless_date(raw_doc.get('created'))
            },
            'correspondent': None,
            'document_type': None,
            'tags': [],
            'custom_fields': []
        }
        
        # Process correspondent
        if raw_doc.get('correspondent'):
            if raw_doc.get('correspondent__name'):
                processed['correspondent'] = raw_doc.get('correspondent__name')
            elif api_client:
                # Fetch correspondent name from API
                all_correspondents = api_client.get_all_correspondents()
                for name, id_val in all_correspondents.items():
                    if id_val == raw_doc.get('correspondent'):
                        processed['correspondent'] = name
                        break
        
        # Process document type
        if raw_doc.get('document_type'):
            if raw_doc.get('document_type__name'):
                processed['document_type'] = raw_doc.get('document_type__name')
            elif api_client:
                # Fetch document type name from API
                all_doc_types = api_client.get_all_document_types()
                for name, id_val in all_doc_types.items():
                    if id_val == raw_doc.get('document_type'):
                        processed['document_type'] = name
                        break
        
        # Process tags
        if 'tags' in raw_doc and isinstance(raw_doc['tags'], list) and api_client:
            all_tags = api_client.get_all_tags()
            tag_names = []
            for tag_id in raw_doc['tags']:
                for name, id_val in all_tags.items():
                    if id_val == tag_id:
                        tag_names.append(name)
                        break
            processed['tags'] = tag_names
        
        # Process custom fields
        if 'custom_fields' in raw_doc and isinstance(raw_doc['custom_fields'], list) and api_client:
            all_custom_fields = api_client.get_all_custom_fields()
            # Create reverse mapping from ID to name
            id_to_name = {id_val: name for name, id_val in all_custom_fields.items()}
            
            for field in raw_doc['custom_fields']:
                if isinstance(field, dict) and field.get('value') is not None:
                    field_id = field.get('field')
                    field_name = id_to_name.get(field_id, f"Field_{field_id}")
                    processed['custom_fields'].append({
                        'name': field_name,
                        'value': field.get('value')
                    })
        
        return processed
    
    def parse_paperless_date(self, date_str: Optional[str]) -> Optional[str]:
        """Parse Paperless date format to ISO date"""
        if not date_str:
            return None
        
        try:
            # Try different date formats that Paperless might use
            formats = [
                '%Y-%m-%d',           # ISO format
                '%Y-%m-%dT%H:%M:%S',  # ISO datetime
                '%Y-%m-%dT%H:%M:%S.%f', # ISO datetime with microseconds
                '%Y-%m-%dT%H:%M:%S.%fZ', # ISO datetime with timezone
                '%Y-%m-%dT%H:%M:%SZ',  # ISO datetime with timezone
            ]
            
            for fmt in formats:
                try:
                    parsed = datetime.strptime(date_str, fmt)
                    return parsed.strftime('%Y-%m-%d')
                except ValueError:
                    continue
            
            # If no format worked, try to extract just the date part
            if 'T' in date_str:
                date_part = date_str.split('T')[0]
                return self.parse_paperless_date(date_part)
            
            return None
            
        except Exception as e:
            self.logger.warning(f"Failed to parse Paperless date '{date_str}': {e}")
            return None
    
    def normalize_metadata_for_comparison(self, metadata: Dict[str, Any], source: str) -> Dict[str, Any]:
        """Normalize metadata for comparison across sources"""
        normalized = {}
        
        # Normalize correspondent
        if 'correspondent' in metadata:
            if isinstance(metadata['correspondent'], str):
                normalized['correspondent'] = metadata['correspondent']
            elif isinstance(metadata['correspondent'], dict):
                normalized['correspondent'] = metadata['correspondent'].get('name')
        
        # Normalize document_type
        if 'document_type' in metadata:
            if isinstance(metadata['document_type'], str):
                normalized['document_type'] = metadata['document_type']
            elif isinstance(metadata['document_type'], dict):
                normalized['document_type'] = metadata['document_type'].get('name')
        
        # Normalize date_created
        if 'date_created' in metadata:
            if isinstance(metadata['date_created'], str):
                normalized['date_created'] = metadata['date_created']
            elif isinstance(metadata['date_created'], dict):
                normalized['date_created'] = metadata['date_created'].get('parsed')
        
        # Normalize tags
        if 'tags' in metadata:
            if isinstance(metadata['tags'], list):
                if metadata['tags'] and isinstance(metadata['tags'][0], dict):
                    # List of tag objects
                    normalized['tags'] = [tag.get('name', '') for tag in metadata['tags']]
                else:
                    # List of tag names
                    normalized['tags'] = metadata['tags']
            else:
                normalized['tags'] = []
        
        # Normalize custom_fields
        if 'custom_fields' in metadata:
            if isinstance(metadata['custom_fields'], list):
                custom_fields_dict = {}
                for field in metadata['custom_fields']:
                    if isinstance(field, dict):
                        name = field.get('name', '')
                        value = field.get('value', '')
                        if name:
                            custom_fields_dict[name] = value
                normalized['custom_fields'] = custom_fields_dict
            else:
                normalized['custom_fields'] = {}
        
        return normalized
    
    def prepare_update_payload(self, document_id: int, metadata: Dict[str, Any], 
                              api_mappings: Dict[str, Dict[str, int]]) -> Dict[str, Any]:
        """Prepare metadata update payload for Paperless API"""
        payload = {}
        
        # Handle correspondent
        if 'correspondent' in metadata and metadata['correspondent']:
            correspondent_name = metadata['correspondent']
            if correspondent_name in api_mappings.get('correspondents', {}):
                payload['correspondent'] = api_mappings['correspondents'][correspondent_name]
        
        # Handle document_type
        if 'document_type' in metadata and metadata['document_type']:
            doc_type_name = metadata['document_type']
            if doc_type_name in api_mappings.get('document_types', {}):
                payload['document_type'] = api_mappings['document_types'][doc_type_name]
        
        # Handle date_created
        if 'date_created' in metadata and metadata['date_created']:
            payload['created'] = metadata['date_created']
        
        # Handle tags
        if 'tags' in metadata and metadata['tags']:
            tag_ids = []
            for tag_name in metadata['tags']:
                if tag_name in api_mappings.get('tags', {}):
                    tag_ids.append(api_mappings['tags'][tag_name])
            if tag_ids:
                payload['tags'] = tag_ids
        
        # Handle custom fields
        if 'custom_fields' in metadata and metadata['custom_fields']:
            custom_fields = []
            custom_field_data = metadata['custom_fields']
            
            # Handle both dictionary and list formats for custom fields
            if isinstance(custom_field_data, dict):
                # Dictionary format: {field_name: field_value}
                for field_name, field_value in custom_field_data.items():
                    if field_name in api_mappings.get('custom_fields', {}):
                        custom_fields.append({
                            'field': api_mappings['custom_fields'][field_name],
                            'value': str(field_value)
                        })
            elif isinstance(custom_field_data, list):
                # List format: [{name: field_name, value: field_value}]
                for field_item in custom_field_data:
                    if isinstance(field_item, dict) and 'name' in field_item:
                        field_name = field_item['name']
                        field_value = field_item.get('value', '')
                        if field_name in api_mappings.get('custom_fields', {}):
                            custom_fields.append({
                                'field': api_mappings['custom_fields'][field_name],
                                'value': str(field_value)
                            })
            
            if custom_fields:
                payload['custom_fields'] = custom_fields
        
        return payload
