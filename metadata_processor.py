"""
PocoClass - Metadata Processor
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
            'filename': {}
        }
        
        # Filename extraction should never prevent content-based processing
        try:
            metadata['filename'] = self.extract_filename_metadata(rule, filename)
        except Exception as e:
            self.logger.warning(f"Filename metadata extraction failed for rule {rule.get('rule_id', 'unknown')}: {e}")
            metadata['filename'] = {}
        
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
            # Legacy format: pattern_after only
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
            
            # New format: beforeAnchor and afterAnchor (v2)
            elif isinstance(field_config, dict) and ('beforeAnchor' in field_config or 'afterAnchor' in field_config or 'pattern_before' in field_config or 'pattern_after' in field_config):
                # Support both v2 (beforeAnchor/afterAnchor) and legacy (pattern_before/pattern_after) keys
                pattern_before = field_config.get('beforeAnchor', field_config.get('pattern_before', ''))
                pattern_after = field_config.get('afterAnchor', field_config.get('pattern_after', ''))
                value = self.extract_value_between_anchors(content, pattern_before, pattern_after)
                
                if value:
                    # Apply extraction type filtering if specified
                    extraction_type = field_config.get('extraction_type', '')
                    if extraction_type:
                        value = self.apply_extraction_type_filter(value, extraction_type, field_config.get('format', ''))
                    
                    # Apply formatting for dates if specified
                    if value and extraction_type == 'date' and 'format' in field_config:
                        formatted_value = self.parse_date_with_format(value, field_config['format'])
                        if formatted_value:
                            extracted[field_name] = formatted_value
                    elif value and field_name == 'date_created' and 'format' in field_config:
                        # Legacy support for date_created without extraction_type
                        formatted_value = self.parse_date(value, field_config['format'])
                        if formatted_value:
                            extracted[field_name] = formatted_value
                    elif value:
                        extracted[field_name] = value
        
        return extracted
    
    def extract_value_between_anchors(self, text: str, before_pattern: str, after_pattern: str) -> Optional[str]:
        """Extract value between two anchor patterns (v2 format)"""
        try:
            # Build combined pattern based on which anchors are provided
            if before_pattern and after_pattern:
                # Both anchors: extract between them
                # Pattern: {before}...VALUE...{after}
                pattern = f"{before_pattern}\\s*(.+?)\\s*{after_pattern}"
            elif after_pattern:
                # Only after anchor: extract value after it
                # Pattern: {after}...VALUE (capture until newline or reasonable boundary)
                pattern = f"{after_pattern}\\s*([^\\n]+)"
            elif before_pattern:
                # Only before anchor: extract value before it  
                # Pattern: VALUE...{before} (capture reasonable content before anchor)
                pattern = f"([^\\n]+?)\\s*{before_pattern}"
            else:
                return None
            
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                groups = match.groups()
                if groups:
                    return groups[0].strip()
            return None
        except Exception as e:
            self.logger.error(f"Error extracting value between anchors: {e}")
            return None
    
    def apply_extraction_type_filter(self, value: str, extraction_type: str, date_format: str = '') -> Optional[str]:
        """Apply extraction type filter to extract specific data from the raw extracted value
        
        Args:
            value: The raw extracted string from between anchors
            extraction_type: Type of data to extract ('date', 'text', 'dateFormat', etc.)
            date_format: Date format string (e.g., 'DD-MM-YYYY')
            
        Returns:
            Filtered value or None if extraction fails
        """
        if not value:
            return None
        
        try:
            if extraction_type == 'date' or extraction_type == 'dateFormat':
                # Extract date pattern from the string based on the format
                date_value = self.extract_date_from_text(value, date_format)
                if date_value:
                    return date_value
                # Fallback: try common date patterns if format-based extraction fails
                return self.extract_common_date_pattern(value)
            
            elif extraction_type == 'text':
                # Return as-is for text extraction
                return value.strip()
            
            else:
                # Unknown extraction type, return as-is
                return value.strip()
                
        except Exception as e:
            self.logger.error(f"Error applying extraction type filter '{extraction_type}' to value '{value}': {e}")
            return value.strip()
    
    def extract_date_from_text(self, text: str, date_format: str) -> Optional[str]:
        """Extract a date from text using the specified date format pattern
        
        Args:
            text: The text containing a date
            date_format: Format like 'DD-MM-YYYY', 'MM/DD/YYYY', etc.
            
        Returns:
            Extracted date string or None
        """
        if not date_format:
            return None
        
        try:
            # Convert date format to regex pattern
            # DD-MM-YYYY -> \d{2}-\d{2}-\d{4}
            # MM/DD/YYYY -> \d{2}/\d{2}/\d{4}
            # YYYY-MM-DD -> \d{4}-\d{2}-\d{2}
            
            pattern = date_format
            pattern = pattern.replace('YYYY', r'\d{4}')
            pattern = pattern.replace('YY', r'\d{2}')
            pattern = pattern.replace('MM', r'\d{2}')
            pattern = pattern.replace('DD', r'\d{2}')
            pattern = pattern.replace('M', r'\d{1,2}')
            pattern = pattern.replace('D', r'\d{1,2}')
            
            match = re.search(pattern, text)
            if match:
                return match.group(0)
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error extracting date with format '{date_format}' from '{text}': {e}")
            return None
    
    def extract_common_date_pattern(self, text: str) -> Optional[str]:
        """Extract common date patterns as fallback
        
        Supports: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY, etc.
        """
        common_patterns = [
            r'\d{2}-\d{2}-\d{4}',  # DD-MM-YYYY or MM-DD-YYYY
            r'\d{2}/\d{2}/\d{4}',  # DD/MM/YYYY or MM/DD/YYYY
            r'\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
            r'\d{2}\.\d{2}\.\d{4}', # DD.MM.YYYY
        ]
        
        for pattern in common_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(0)
        
        return None
    
    def parse_date_with_format(self, date_str: str, date_format: str) -> Optional[str]:
        """Parse a date string using the UI date format (DD-MM-YYYY style) and convert to ISO format
        
        Args:
            date_str: The date string (e.g., '27-12-2010')
            date_format: UI format like 'DD-MM-YYYY', 'MM/DD/YYYY', etc.
            
        Returns:
            ISO formatted date string (YYYY-MM-DD) or None
        """
        if not date_str or not date_format:
            return None
        
        try:
            # Convert UI format to strptime format
            # DD-MM-YYYY -> %d-%m-%Y
            # MM/DD/YYYY -> %m/%d/%Y
            strptime_format = date_format
            strptime_format = strptime_format.replace('YYYY', '%Y')
            strptime_format = strptime_format.replace('YY', '%y')
            strptime_format = strptime_format.replace('MM', '%m')
            strptime_format = strptime_format.replace('DD', '%d')
            strptime_format = strptime_format.replace('M', '%m')
            strptime_format = strptime_format.replace('D', '%d')
            
            parsed_date = datetime.strptime(date_str, strptime_format)
            return parsed_date.strftime('%Y-%m-%d')
            
        except ValueError as e:
            self.logger.warning(f"Failed to parse date '{date_str}' with format '{date_format}': {e}")
            return None
    
    def validate_and_sanitize_value(self, value: str, data_type: str) -> Optional[str]:
        """Validate and sanitize extracted value based on target field datatype
        
        Args:
            value: The extracted string value
            data_type: The Paperless-ngx field datatype (integer, float, monetary, etc.)
            
        Returns:
            Sanitized value or None if validation fails
        """
        if not value:
            return None
            
        value = value.strip()
        
        try:
            if data_type == 'integer':
                # Must be a whole number
                # Remove common separators (commas, spaces)
                cleaned = re.sub(r'[,\s]', '', value)
                # Extract first integer found
                match = re.search(r'-?\d+', cleaned)
                if match:
                    return str(int(match.group()))
                self.logger.warning(f"Integer validation failed for value: {value}")
                return None
                
            elif data_type == 'float':
                # Must be a decimal number, normalize decimal separator
                # Replace comma with period for decimal point
                cleaned = value.replace(',', '.')
                # Remove thousand separators (spaces)
                cleaned = re.sub(r'(?<=\d)\s(?=\d)', '', cleaned)
                # Extract first float found
                match = re.search(r'-?\d+\.?\d*', cleaned)
                if match:
                    float_val = float(match.group())
                    return str(float_val)
                self.logger.warning(f"Float validation failed for value: {value}")
                return None
                
            elif data_type == 'monetary':
                # Monetary format: must use . as decimal separator with exactly 2 decimal places
                # Replace comma with period
                cleaned = value.replace(',', '.')
                # Remove currency symbols and spaces
                cleaned = re.sub(r'[^\d.-]', '', cleaned)
                # Extract first number found
                match = re.search(r'-?\d+\.?\d*', cleaned)
                if match:
                    float_val = float(match.group())
                    # Format to exactly 2 decimal places
                    return f"{float_val:.2f}"
                self.logger.warning(f"Monetary validation failed for value: {value}")
                return None
                
            elif data_type in ['string', 'date']:
                # No validation needed for strings and dates (dates have their own parsing)
                return value
                
            else:
                # Unknown datatype, return as-is
                return value
                
        except Exception as e:
            self.logger.error(f"Error validating value '{value}' for datatype '{data_type}': {e}")
            return None
    
    def extract_filename_metadata(self, rule: Dict[str, Any], filename: str) -> Dict[str, Any]:
        """Extract metadata from filename using rule patterns
        
        Supports two pattern formats:
        1. Simple string: Just a regex pattern for basic matching
           Example: "Invoice.*\.pdf"
        2. Dict config: Pattern with metadata extraction options
           Example: {"pattern": "Invoice_(\d{4})", "date_group": 1, "date_format": "%Y"}
           
        Dict configs support: date_group, year_group, account_group for metadata extraction
        """
        filename_metadata = rule.get('filename_metadata', {})
        filename_patterns = rule.get('filename_patterns', [])
        
        extracted = {}
        has_pattern_match = False
        
        # Check all filename patterns to find matches (supports multiple patterns for flexibility)
        matched_patterns = []
        
        for i, pattern_config in enumerate(filename_patterns):
            # Support both simple string patterns and detailed dict configurations
            if isinstance(pattern_config, str):
                pattern = pattern_config
                pattern_options = {}
            elif isinstance(pattern_config, dict) and 'pattern' in pattern_config:
                pattern = pattern_config['pattern']
                pattern_options = pattern_config
            else:
                self.logger.warning(f"Skipping invalid pattern_config at index {i}: {type(pattern_config).__name__}")
                continue
                
            match = re.search(pattern, filename, re.IGNORECASE)
            
            if match:
                has_pattern_match = True
                matched_patterns.append(f"Pattern {i+1}: {pattern}")
                self.logger.debug(f"Filename pattern {i+1} matched: {pattern}")
                
                # Extract date if date_group is specified
                if 'date_group' in pattern_options:
                    date_group_config = pattern_options['date_group']
                    date_str = ""
                    
                    # Handle single group (e.g., "1") or group range (e.g., "1-2")
                    if '-' in str(date_group_config):
                        # Handle group range like "1-2" (concatenate groups 1 and 2)
                        start_group, end_group = str(date_group_config).split('-', 1)
                        start_group, end_group = int(start_group), int(end_group)
                        if len(match.groups()) >= end_group:
                            for group_num in range(start_group, end_group + 1):
                                date_str += match.group(group_num) or ""
                    else:
                        # Handle single group
                        date_group = int(date_group_config)
                        if len(match.groups()) >= date_group:
                            date_str = match.group(date_group)
                    
                    if date_str:
                        # Try to parse the date
                        date_format = pattern_options.get('date_format', '%Y-%m')
                        parsed_date = self.parse_date(date_str, date_format)
                        if parsed_date:
                            extracted['date_created'] = parsed_date
                            self.logger.debug(f"Extracted date from filename pattern {i+1}: {parsed_date}")
                
                # Extract year if year_group is specified
                if 'year_group' in pattern_options:
                    year_group_config = pattern_options['year_group']
                    year_str = ""
                    
                    # Handle single group (e.g., "1") or group range (e.g., "1-2")
                    if '-' in str(year_group_config):
                        # Handle group range like "1-2" (concatenate groups 1 and 2)
                        start_group, end_group = str(year_group_config).split('-', 1)
                        start_group, end_group = int(start_group), int(end_group)
                        if len(match.groups()) >= end_group:
                            for group_num in range(start_group, end_group + 1):
                                year_str += match.group(group_num) or ""
                    else:
                        # Handle single group
                        year_group = int(year_group_config)
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
                if 'account_group' in pattern_options:
                    account_group_config = pattern_options['account_group']
                    account_str = ""
                    
                    # Handle single group (e.g., "1") or group range (e.g., "1-2")
                    if '-' in str(account_group_config):
                        # Handle group range like "1-2" (concatenate groups 1 and 2)
                        start_group, end_group = str(account_group_config).split('-', 1)
                        start_group, end_group = int(start_group), int(end_group)
                        if len(match.groups()) >= end_group:
                            for group_num in range(start_group, end_group + 1):
                                account_str += match.group(group_num) or ""
                    else:
                        # Handle single group
                        account_group = int(account_group_config)
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
