"""
POCOclass - Test/Execute Engine
Orchestrates rule testing and execution with JSON output for frontend
"""

import logging
from typing import Dict, List, Any, Optional
from pattern_matcher import PatternMatcher
from metadata_processor import MetadataProcessor
from scoring_calculator_v2 import POCOScoringV2

class TestEngine:
    """
    Test and execute rules against documents
    Returns JSON-formatted results for frontend consumption
    """
    
    def __init__(self):
        self.pattern_matcher = PatternMatcher()
        self.metadata_processor = MetadataProcessor()
        self.scorer = POCOScoringV2()
        self.logger = logging.getLogger(__name__)
    
    def test_rule(self, 
                  rule: Dict[str, Any], 
                  document_content: str, 
                  document_filename: str,
                  paperless_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Test a rule against a document
        
        Args:
            rule: Rule configuration (YAML parsed to dict)
            document_content: Document OCR text content
            document_filename: Document filename
            paperless_metadata: Existing Paperless metadata for verification
        
        Returns:
            Comprehensive test results with scores and extracted data
        """
        
        try:
            # 1. Pattern matching evaluation (v2)
            match_result = self.pattern_matcher.evaluate_rule_v2(
                rule, document_content, document_filename
            )
            
            # 2. Extract metadata
            metadata = self.metadata_processor.extract_metadata_from_rule(
                rule, document_content, document_filename
            )
            
            # 3. Paperless verification (if metadata provided)
            verification_result = self.verify_paperless_metadata(
                rule, metadata, paperless_metadata
            ) if paperless_metadata else {'matched': 0, 'total': 0, 'matches': []}
            
            # 4. Calculate POCO scores
            ocr_multiplier = rule.get('ocr_multiplier', 3.0)
            filename_multiplier = rule.get('filename_multiplier', 1.0)
            ocr_threshold = rule.get('ocr_threshold', 75.0)
            poco_threshold = rule.get('threshold', 80.0)
            
            score_result = self.scorer.calculate_full_evaluation(
                ocr_matches=match_result['ocr']['matched'],
                ocr_total=match_result['ocr']['total'],
                filename_matches=match_result['filename']['matched'],
                filename_total=match_result['filename']['total'],
                paperless_matches=verification_result['matched'],
                paperless_total=verification_result['total'],
                ocr_multiplier=ocr_multiplier,
                filename_multiplier=filename_multiplier,
                ocr_threshold=ocr_threshold,
                poco_threshold=poco_threshold
            )
            
            # 5. Build comprehensive result
            return {
                'success': True,
                'rule_id': rule.get('rule_id'),
                'rule_name': rule.get('rule_name'),
                'classification_allowed': score_result['summary']['classification_allowed'],
                'status': score_result['evaluation']['status'],
                'threshold': poco_threshold,
                'ocr_threshold': ocr_threshold,
                'scores': {
                    'poco_ocr_score': score_result['summary']['poco_ocr_score'],
                    'poco_score': score_result['summary']['poco_score'],
                    'ocr_threshold': ocr_threshold,
                    'poco_threshold': poco_threshold
                },
                'breakdown': {
                    'ocr': {
                        'matched': match_result['ocr']['matched'],
                        'total': match_result['ocr']['total'],
                        'weighted': score_result['scores']['ocr']['weighted'],
                        'max_weight': score_result['scores']['ocr']['max_weight'],
                        'percentage': score_result['scores']['ocr']['percentage'],
                        'matches': match_result['ocr']['matches'],
                        'groups': match_result['ocr']['matches']  # Frontend compatibility
                    },
                    'filename': {
                        'matched': match_result['filename']['matched'],
                        'total': match_result['filename']['total'],
                        'weighted': score_result['scores']['filename']['weighted'],
                        'max_weight': score_result['scores']['filename']['max_weight'],
                        'percentage': score_result['scores']['filename']['percentage'],
                        'matches': match_result['filename']['matches'],
                        'patterns': match_result['filename']['matches']  # Frontend compatibility
                    },
                    'paperless': {
                        'matched': verification_result['matched'],
                        'total': verification_result['total'],
                        'weighted': score_result['scores']['paperless']['weighted'],
                        'max_weight': score_result['scores']['paperless']['max_weight'],
                        'percentage': score_result['scores']['paperless']['percentage'],
                        'matches': verification_result['matches']
                    },
                    'verification': {
                        'matched': verification_result['matched'],
                        'total': verification_result['total'],
                        'matches': verification_result['matches']  # Frontend compatibility
                    }
                },
                'extracted_metadata': {
                    'static': metadata.get('static', {}),
                    'dynamic': metadata.get('dynamic', {}),
                    'filename': metadata.get('filename', {})
                },
                'evaluation': {
                    'message': score_result['evaluation']['reason'],
                    'ocr_passes': score_result['evaluation']['ocr_passes'],
                    'poco_passes': score_result['evaluation']['poco_passes']
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error testing rule: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'rule_id': rule.get('rule_id'),
                'rule_name': rule.get('rule_name')
            }
    
    def verify_paperless_metadata(self, 
                                  rule: Dict[str, Any],
                                  extracted_metadata: Dict[str, Any],
                                  paperless_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify extracted metadata against Paperless metadata
        
        Returns:
            Match counts for scoring
        """
        
        verification_fields = rule.get('verification_fields', [])
        if not verification_fields:
            # Default fields to verify
            verification_fields = ['correspondent', 'document_type', 'date_created', 'tags']
        
        matched = 0
        matches = []
        
        # Combine all extracted metadata sources
        all_extracted = {}
        all_extracted.update(extracted_metadata.get('static', {}))
        all_extracted.update(extracted_metadata.get('dynamic', {}))
        all_extracted.update(extracted_metadata.get('filename', {}))
        
        for field in verification_fields:
            # Resolve field values (handles custom fields and field name mapping)
            extracted_value = self._resolve_field_value(field, all_extracted)
            paperless_value = self._resolve_field_value(field, paperless_metadata)
            
            # Debug logging
            self.logger.info(f"Verification field '{field}': extracted='{extracted_value}' (type={type(extracted_value).__name__}), paperless='{paperless_value}' (type={type(paperless_value).__name__})")
            
            # Only verify fields where BOTH extracted AND Paperless have values
            # If Paperless is empty, there's nothing to verify against (skip)
            if extracted_value is not None and paperless_value is not None:
                # Compare values (handle different types)
                match_result = self._values_match(extracted_value, paperless_value)
                self.logger.info(f"  Comparison result for '{field}': {match_result}")
                
                if match_result:
                    matched += 1
                    matches.append({
                        'field': field,
                        'extracted': extracted_value,
                        'paperless': paperless_value,
                        'match': True
                    })
                else:
                    matches.append({
                        'field': field,
                        'extracted': extracted_value,
                        'paperless': paperless_value,
                        'match': False
                    })
            else:
                self.logger.info(f"  Skipped (one or both values are None)")
        
        # Recalculate total based on fields actually extracted
        total = len(matches)
        
        return {
            'matched': matched,
            'total': total,
            'matches': matches
        }
    
    def _resolve_field_value(self, field_name: str, metadata: Dict[str, Any]) -> Any:
        """Resolve field value from metadata, handling custom fields and field name mapping.
        
        Handles:
        - Custom fields (documentCategory → custom_fields['Document Category'])
        - Field name mapping (documentType → document_type)
        - Paperless nested structure ({"id": X, "name": Y} → Y)
        - Tags as list of objects ([{"id": X, "name": Y}] → ["Y"])
        - Direct field access (correspondent, tags)
        
        Args:
            field_name: Field name from verification_fields (may be camelCase)
            metadata: Metadata dict to search in
            
        Returns:
            Field value or None if not found
        """
        if not metadata:
            self.logger.debug(f"_resolve_field_value('{field_name}'): metadata is None/empty")
            return None
        
        self.logger.debug(f"_resolve_field_value('{field_name}'): metadata keys = {list(metadata.keys())}")
        
        # Field name mapping: camelCase → snake_case
        field_mapping = {
            'documentType': 'document_type',
            'documentDate': 'date_created',
            'dateCreated': 'date_created',
        }
        
        # Map field name if needed
        mapped_field = field_mapping.get(field_name, field_name)
        
        # Try direct lookup first
        if mapped_field in metadata:
            value = metadata[mapped_field]
            
            # Handle Paperless nested structure for correspondent and document_type
            if mapped_field in ['correspondent', 'document_type']:
                if isinstance(value, dict) and 'name' in value:
                    return value['name']
                # Already a string (from extracted metadata)
                return value
            
            # Handle tags - may be list of strings or list of objects
            elif mapped_field == 'tags':
                if isinstance(value, list):
                    # If list of objects with 'name' key, extract names
                    if value and isinstance(value[0], dict) and 'name' in value[0]:
                        return [tag['name'] for tag in value]
                    # Already list of strings
                    return value
                return value
            
            # Other fields return as-is
            return value
        
        # Check if it's a custom field (camelCase like documentCategory)
        # Convert camelCase to "Title Case" for custom field lookup
        if 'custom_fields' in metadata:
            custom_field_name = self._camel_to_title_case(field_name)
            custom_fields = metadata['custom_fields']
            
            # Handle both list and dict formats
            if isinstance(custom_fields, list):
                for cf in custom_fields:
                    # Handle both 'name' and 'field' keys (different Paperless API responses)
                    cf_name = cf.get('name') or cf.get('field')
                    if cf_name == custom_field_name:
                        return cf.get('value')
            elif isinstance(custom_fields, dict):
                return custom_fields.get(custom_field_name)
        
        return None
    
    def _camel_to_title_case(self, camel_str: str) -> str:
        """Convert camelCase to Title Case (e.g., documentCategory → Document Category)"""
        # Insert space before capital letters
        import re
        result = re.sub(r'([A-Z])', r' \1', camel_str)
        # Capitalize first letter and strip extra spaces
        return result.strip().title()
    
    def _values_match(self, extracted: Any, paperless: Any) -> bool:
        """Compare extracted value with Paperless value"""
        
        # Handle tags (list comparison)
        if isinstance(extracted, list) and isinstance(paperless, list):
            # Filter out the NEW tag from Paperless tags before comparison
            # The NEW tag is typically present on new documents but not in rule definitions
            paperless_filtered = [tag for tag in paperless if tag.upper() != 'NEW']
            return set(extracted) == set(paperless_filtered)
        
        # Handle strings (case-insensitive)
        if isinstance(extracted, str) and isinstance(paperless, str):
            return extracted.lower().strip() == paperless.lower().strip()
        
        # Handle dates (compare as strings)
        extracted_str = str(extracted).strip()
        paperless_str = str(paperless).strip()
        return extracted_str == paperless_str
    
    def execute_rule(self,
                    rule: Dict[str, Any],
                    document_id: int,
                    document_content: str,
                    document_filename: str,
                    paperless_metadata: Optional[Dict[str, Any]] = None,
                    dry_run: bool = True) -> Dict[str, Any]:
        """
        Execute a rule and optionally apply changes to Paperless
        
        Args:
            rule: Rule configuration
            document_id: Paperless document ID
            document_content: Document content
            document_filename: Document filename
            paperless_metadata: Current Paperless metadata
            dry_run: If True, don't actually update Paperless
        
        Returns:
            Execution results with proposed/applied changes
        """
        
        # First test the rule
        test_result = self.test_rule(rule, document_content, document_filename, paperless_metadata)
        
        if not test_result['success']:
            return test_result
        
        # Determine if classification is allowed
        if not test_result['classification_allowed']:
            return {
                **test_result,
                'execution': {
                    'applied': False,
                    'reason': 'Classification not allowed - scores below threshold',
                    'changes': {}
                }
            }
        
        # Build proposed changes
        proposed_changes = self._build_proposed_changes(test_result['extracted_metadata'])
        
        # Apply changes if not dry run
        if not dry_run:
            # TODO: Integrate with api_client.py to update Paperless
            # For now, just return proposed changes
            pass
        
        return {
            **test_result,
            'execution': {
                'applied': not dry_run,
                'reason': 'Dry run - changes not applied' if dry_run else 'Changes applied successfully',
                'changes': proposed_changes
            }
        }
    
    def _build_proposed_changes(self, extracted_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Build proposed changes from extracted metadata"""
        
        changes = {}
        
        # Combine all metadata sources (dynamic overrides static)
        all_metadata = {}
        all_metadata.update(extracted_metadata.get('static', {}))
        all_metadata.update(extracted_metadata.get('dynamic', {}))
        
        # Map to Paperless fields
        if 'correspondent' in all_metadata:
            changes['correspondent'] = all_metadata['correspondent']
        
        if 'document_type' in all_metadata:
            changes['document_type'] = all_metadata['document_type']
        
        if 'date_created' in all_metadata:
            changes['date_created'] = all_metadata['date_created']
        
        if 'tags' in all_metadata:
            changes['tags'] = all_metadata['tags']
        
        if 'custom_fields' in all_metadata:
            changes['custom_fields'] = all_metadata['custom_fields']
        
        return changes


# Example usage and testing
if __name__ == '__main__':
    import yaml
    
    # Load example rule
    with open('rules/template_v2.yaml', 'r') as f:
        rule = yaml.safe_load(f)
    
    # Example document
    document_content = """
    Company Name Inc
    Invoice #12345
    
    Invoice Date: 15-03-2024
    Account Number: ACC-99887
    
    Total Amount: $1,250.00
    """
    
    document_filename = "invoice-2024-03-company-12345.pdf"
    
    # Test the rule
    engine = TestEngine()
    result = engine.test_rule(rule, document_content, document_filename)
    
    print("Test Result:")
    print(f"POCO OCR Score: {result['scores']['poco_ocr_score']}%")
    print(f"POCO Score: {result['scores']['poco_score']}%")
    print(f"Classification Allowed: {result['classification_allowed']}")
    print(f"Status: {result['status']}")
    print(f"\nOCR Matches: {result['breakdown']['ocr']['matched']}/{result['breakdown']['ocr']['total']}")
    print(f"Filename Matches: {result['breakdown']['filename']['matched']}/{result['breakdown']['filename']['total']}")
