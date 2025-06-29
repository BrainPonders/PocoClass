"""
POCOmeta - POCO Scoring Calculator
Calculates confidence scores for metadata across different sources to ensure data quality
"""

import logging
from typing import Dict, List, Any, Optional, Tuple

class ScoringCalculator:
    """Calculates POCO scores for metadata confidence"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def calculate_poco_score(self, doc_dict: Dict[str, Any], rule: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate POCO score based on rule confidence with filename/paperless modifiers"""
        
        # Get the rule's base score (core + bonus from selected rule)
        selected_rule = doc_dict.get('selected_rule', {})
        rule_score = selected_rule.get('total_score', 0)  # This is core + bonus
        rule_threshold = rule.get('threshold', 70)
        
        # Get weights from rule for filename and paperless
        poco_weights = rule.get('poco_weights', {})
        filename_weight = poco_weights.get('filename', 5)
        paperless_weight = poco_weights.get('paperless', 3)
        
        # Fields to score including specific custom fields
        fields_to_score = ['correspondent', 'document_type', 'date_created', 'tags', 'Document Category']
        
        poco_details = {}
        final_scores = []
        process_should_continue = True
        
        for field in fields_to_score:
            field_score = self.calculate_field_score_with_rule_base(
                doc_dict, field, rule_score, filename_weight, paperless_weight, rule_threshold
            )
            poco_details[field] = field_score
            final_scores.append(field_score['final_score'])
            
            # Check if any field falls below threshold
            if field_score['final_score'] < rule_threshold:
                process_should_continue = False
        
        # Final POCO score is the lowest final score
        final_poco_score = min(final_scores) if final_scores else 0
        
        # Determine if processing should continue
        passes = process_should_continue and final_poco_score >= rule_threshold
        
        # Update document dictionary
        doc_dict['poco_score_details'] = poco_details
        doc_dict['poco_summary'] = {
            'final_score': final_poco_score,
            'pass': passes,
            'should_continue_processing': process_should_continue,
            'winner_rule_id': rule.get('rule_id'),
            'winner_rule_name': rule.get('rule_name'),
            'rule_threshold': rule_threshold
        }
        
        return {
            'final_score': final_poco_score,
            'pass': passes,
            'should_continue_processing': process_should_continue,
            'details': poco_details,
            'rule_score': rule_score,
            'rule_threshold': rule_threshold
        }
    
    def calculate_field_score_with_rule_base(self, doc_dict: Dict[str, Any], field: str, 
                            rule_score: int, filename_weight: int, paperless_weight: int, rule_threshold: int) -> Dict[str, Any]:
        """Calculate field score using rule score as base with filename/paperless modifiers"""
        
        # Get values from different sources
        content_value = self.get_field_value(doc_dict.get('content_metadata', {}), field)
        filename_value = self.get_field_value(doc_dict.get('filename_metadata', {}), field)
        paperless_value = self.get_field_value(doc_dict.get('paperless_metadata', {}), field)
        
        # Rule score is the base - it's the "truth"
        base_rule_score = rule_score
        
        # Filename score modifier
        filename_modifier = 0
        if filename_value and content_value:
            if self.values_match(content_value, filename_value, field):
                filename_modifier = filename_weight  # Positive modifier for agreement
            else:
                filename_modifier = -filename_weight  # Negative modifier for disagreement
        
        # Paperless score modifier  
        paperless_modifier = 0
        if paperless_value and content_value:
            if self.values_match(content_value, paperless_value, field):
                paperless_modifier = paperless_weight  # Positive modifier for agreement
            else:
                paperless_modifier = -paperless_weight  # Negative modifier for disagreement
        
        # Final score = rule_score + modifiers
        final_score = base_rule_score + filename_modifier + paperless_modifier
        
        return {
            'field': field,
            'rule_score': base_rule_score,
            'filename_score': filename_modifier,
            'paperless_score': paperless_modifier,
            'final_score': final_score,
            'content_value': content_value,
            'filename_value': filename_value,
            'paperless_value': paperless_value,
            'passes_threshold': final_score >= rule_threshold
        }
    
    def calculate_field_score(self, doc_dict: Dict[str, Any], field: str, 
                            content_weight: int, filename_weight: int, paperless_weight: int) -> Dict[str, Any]:
        """Calculate score for a specific metadata field"""
        
        # Get values from different sources
        content_value = self.get_field_value(doc_dict.get('content_metadata', {}), field)
        filename_value = self.get_field_value(doc_dict.get('filename_metadata', {}), field)
        paperless_value = self.get_field_value(doc_dict.get('paperless_metadata', {}), field)
        
        # Initialize scores
        content_score = content_weight if content_value else 0
        filename_score = 0
        paperless_score = 0
        
        # Calculate filename score based on match with content
        if filename_value:
            if self.values_match(content_value, filename_value, field):
                filename_score = filename_weight
        
        # Calculate paperless score based on match with content
        if paperless_value:
            if self.values_match(content_value, paperless_value, field):
                paperless_score = paperless_weight
        
        # Determine best match and reason
        total_score = content_score + filename_score + paperless_score
        match_reason = self.determine_match_reason(
            content_value, filename_value, paperless_value, 
            content_score, filename_score, paperless_score
        )
        
        return {
            'content': {
                'value': content_value,
                'score': content_score
            },
            'filename': {
                'value': filename_value,
                'score': filename_score,
                'match': self.values_match(content_value, filename_value, field) if filename_value else None
            },
            'paperless': {
                'value': paperless_value,
                'score': paperless_score,
                'match': self.values_match(content_value, paperless_value, field) if paperless_value else None
            },
            'total': total_score,
            'match_reason': match_reason
        }
    
    def get_field_value(self, metadata: Dict[str, Any], field: str) -> Any:
        """Extract field value from metadata structure"""
        if field not in metadata:
            return None
        
        field_data = metadata[field]
        
        if isinstance(field_data, dict):
            # For structured data like {'value': ..., 'score': ...}
            if 'value' in field_data:
                value = field_data['value']
                # Handle tags that might be stored as string representations of lists
                if field == 'tags' and isinstance(value, str) and value.startswith('[') and value.endswith(']'):
                    try:
                        # Convert string representation back to list
                        import ast
                        return ast.literal_eval(value)
                    except:
                        # If conversion fails, treat as a single tag
                        return [value.strip("[]'\"")]
                return value
            # For data like {'name': ..., 'id': ...}
            elif 'name' in field_data:
                return field_data['name']
            # For parsed date data
            elif 'parsed' in field_data:
                return field_data['parsed']
        
        return field_data
    
    def values_match(self, value1: Any, value2: Any, field: str) -> bool:
        """Check if two values match for a specific field"""
        if value1 is None or value2 is None:
            return False
        
        # Handle different field types
        if field in ['correspondent', 'document_type', 'date_created']:
            # Simple string comparison
            return str(value1).lower() == str(value2).lower()
        
        elif field == 'tags':
            # For tags, check if lists have common elements (excluding workflow tags)
            if isinstance(value1, list) and isinstance(value2, list):
                workflow_tags = {'new', 'poco'}
                
                # Extract tag names and filter out workflow tags
                set1 = set()
                for tag in value1:
                    tag_name = tag['name'].lower() if isinstance(tag, dict) and 'name' in tag else str(tag).lower()
                    if tag_name not in workflow_tags:
                        set1.add(tag_name)
                
                set2 = set()
                for tag in value2:
                    tag_name = tag['name'].lower() if isinstance(tag, dict) and 'name' in tag else str(tag).lower()
                    if tag_name not in workflow_tags:
                        set2.add(tag_name)
                
                return len(set1.intersection(set2)) > 0
            return False
        
        elif field == 'custom_fields':
            # For custom fields, check if dictionaries have common key-value pairs
            if isinstance(value1, list) and isinstance(value2, list):
                # Convert to dictionaries for comparison
                dict1 = self.custom_fields_to_dict(value1)
                dict2 = self.custom_fields_to_dict(value2)
                
                if not dict1 or not dict2:
                    return False
                
                # Check for common key-value pairs
                for key, val in dict1.items():
                    if key in dict2 and str(val).lower() == str(dict2[key]).lower():
                        return True
                return False
            elif isinstance(value1, dict) and isinstance(value2, dict):
                # Direct dictionary comparison
                for key, val in value1.items():
                    if key in value2 and str(val).lower() == str(value2[key]).lower():
                        return True
                return False
            return False
        
        # Default comparison
        return str(value1).lower() == str(value2).lower()
    
    def custom_fields_to_dict(self, custom_fields: List[Dict[str, Any]]) -> Dict[str, str]:
        """Convert custom fields list to dictionary"""
        result = {}
        for field in custom_fields:
            if isinstance(field, dict):
                name = field.get('name', '')
                value = field.get('value', '')
                if name:
                    result[name] = value
        return result
    
    def determine_match_reason(self, content_value: Any, filename_value: Any, paperless_value: Any,
                              content_score: int, filename_score: int, paperless_score: int) -> str:
        """Determine the reason for the match/score"""
        reasons = []
        
        if content_score > 0:
            reasons.append("content")
        
        if filename_score > 0:
            reasons.append("filename_match")
        
        if paperless_score > 0:
            reasons.append("paperless_match")
        
        if not reasons:
            return "no_match"
        
        return "+".join(reasons)
    
    def create_score_summary(self, doc_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Create a summary of all scores for the document"""
        poco_summary = doc_dict.get('poco_summary', {})
        selected_rule = doc_dict.get('selected_rule', {})
        
        return {
            'document_id': doc_dict.get('id'),
            'document_title': doc_dict.get('title'),
            'rule_match': {
                'rule_id': selected_rule.get('rule_id'),
                'rule_name': selected_rule.get('rule_name'),
                'core_score': selected_rule.get('core_score', 0),
                'bonus_score': selected_rule.get('bonus_score', 0),
                'total_score': selected_rule.get('total_score', 0),
                'threshold': selected_rule.get('threshold', 0),
                'pass': selected_rule.get('pass', False)
            },
            'poco_score': {
                'final_score': poco_summary.get('final_score', 0),
                'pass': poco_summary.get('pass', False)
            },
            'metadata_confidence': self.calculate_metadata_confidence(doc_dict)
        }
    
    def calculate_metadata_confidence(self, doc_dict: Dict[str, Any]) -> Dict[str, str]:
        """Calculate confidence level for each metadata field"""
        poco_details = doc_dict.get('poco_score_details', {})
        confidence = {}
        
        for field, details in poco_details.items():
            total_score = details.get('total', 0)
            max_score = 18  # 10 (content) + 5 (filename) + 3 (paperless) - default weights
            
            if total_score >= max_score * 0.8:
                confidence[field] = "high"
            elif total_score >= max_score * 0.5:
                confidence[field] = "medium"
            elif total_score > 0:
                confidence[field] = "low"
            else:
                confidence[field] = "none"
        
        return confidence
