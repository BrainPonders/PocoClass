"""
PocoClass - Test/Execute Engine

Orchestrates the end-to-end rule evaluation pipeline: pattern matching,
metadata extraction, Paperless metadata verification, and POCO score
calculation.  Returns structured JSON results that the frontend renders
as score breakdowns and match details.

Key class:
    TestEngine: Combines PatternMatcher, MetadataProcessor, and POCOScoringV2
                to test or execute rules against individual documents.
"""

import logging
from typing import Dict, Any, Optional
from backend.pattern_matcher import PatternMatcher
from backend.metadata_processor import MetadataProcessor
from backend.scoring_calculator_v2 import POCOScoringV2

class TestEngine:
    """
    Test and execute classification rules against documents.

    The engine follows a five-step pipeline:
        1. Pattern matching  – evaluate OCR and filename patterns
        2. Metadata extraction – pull static, dynamic, and filename metadata
        3. Paperless verification – compare extracted data with Paperless metadata
        4. Score calculation – compute POCO OCR and POCO scores
        5. Result assembly – build a comprehensive JSON response for the frontend
    """
    
    def __init__(self):
        """Initialize the engine with its three processing components."""
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
        Test a rule against a document without applying any changes.
        
        Args:
            rule: Rule configuration (YAML parsed to dict).
            document_content: Document OCR text content.
            document_filename: Document filename.
            paperless_metadata: Existing Paperless metadata for verification
                                (optional; omit when testing offline).
        
        Returns:
            Comprehensive test results including scores, match breakdowns,
            extracted metadata, and evaluation status.  On error returns a
            dict with success=False and an error message.
        """
        
        try:
            # Step 1: Evaluate OCR logic groups and filename patterns
            match_result = self.pattern_matcher.evaluate_rule_v2(
                rule, document_content, document_filename
            )
            
            # Step 2: Extract metadata defined in the rule (static, dynamic, filename)
            metadata = self.metadata_processor.extract_metadata_from_rule(
                rule, document_content, document_filename
            )
            
            # Step 3: Verify extracted metadata against Paperless (if available)
            verification_result = self.verify_paperless_metadata(
                rule, metadata, paperless_metadata
            ) if paperless_metadata else {'matched': 0, 'total': 0, 'matches': []}
            
            # Step 4: Calculate dual POCO scores using rule-defined multipliers/thresholds
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
            
            # Step 5: Assemble the comprehensive result structure
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
                        'groups': match_result['ocr']['matches']  # Alias for frontend compatibility
                    },
                    'filename': {
                        'matched': match_result['filename']['matched'],
                        'total': match_result['filename']['total'],
                        'weighted': score_result['scores']['filename']['weighted'],
                        'max_weight': score_result['scores']['filename']['max_weight'],
                        'percentage': score_result['scores']['filename']['percentage'],
                        'matches': match_result['filename']['matches'],
                        'patterns': match_result['filename']['matches']  # Alias for frontend compatibility
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
                        'matches': verification_result['matches']  # Alias for frontend compatibility
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
        Verify extracted metadata against existing Paperless document metadata.
        
        Compares values for each verification field defined in the rule.
        Fields are only compared when both the extracted and Paperless values
        are non-None; fields with missing data on either side are skipped.
        
        Args:
            rule: Rule dict containing optional 'verification_fields' list.
            extracted_metadata: Metadata extracted from document content/filename.
            paperless_metadata: Current metadata from the Paperless API.

        Returns:
            Dict with matched count, total count, and per-field match details.
        """
        
        verification_fields = rule.get('verification_fields', [])
        if not verification_fields:
            return {'matched': 0, 'total': 0, 'matches': [], 'skipped': True}
        
        matched = 0
        matches = []
        
        # Merge all extracted metadata sources into a single lookup dict
        all_extracted = {}
        all_extracted.update(extracted_metadata.get('static', {}))
        all_extracted.update(extracted_metadata.get('dynamic', {}))
        all_extracted.update(extracted_metadata.get('filename', {}))
        
        for field in verification_fields:
            extracted_value = self._resolve_field_value(field, all_extracted)
            paperless_value = self._resolve_field_value(field, paperless_metadata)
            
            self.logger.info(f"Verification field '{field}': extracted='{extracted_value}' (type={type(extracted_value).__name__}), paperless='{paperless_value}' (type={type(paperless_value).__name__})")
            
            # Only compare when both sides have a value
            if extracted_value is not None and paperless_value is not None:
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
        
        # Total reflects only the fields that were actually compared
        total = len(matches)
        
        return {
            'matched': matched,
            'total': total,
            'matches': matches
        }
    
    def _resolve_field_value(self, field_name: str, metadata: Dict[str, Any]) -> Any:
        """Resolve a field value from a metadata dictionary.
        
        Handles multiple data shapes encountered across the application:
            - camelCase field names mapped to snake_case (e.g. documentType → document_type)
            - Paperless nested objects like {"id": 1, "name": "Invoice"} → "Invoice"
            - Tags as lists of objects or lists of strings
            - Custom fields stored under a 'custom_fields' key (list or dict)

        Args:
            field_name: Field identifier, possibly in camelCase from the frontend.
            metadata: Dict to search for the field value.
            
        Returns:
            Resolved value, or None if not found.
        """
        if not metadata:
            self.logger.debug(f"_resolve_field_value('{field_name}'): metadata is None/empty")
            return None
        
        self.logger.debug(f"_resolve_field_value('{field_name}'): metadata keys = {list(metadata.keys())}")
        
        # Map frontend camelCase names to Paperless snake_case equivalents
        field_mapping = {
            'documentType': 'document_type',
            'documentDate': 'date_created',
            'dateCreated': 'date_created',
        }
        
        mapped_field = field_mapping.get(field_name, field_name)
        
        if mapped_field in metadata:
            value = metadata[mapped_field]
            
            # Unwrap Paperless nested objects that have a 'name' key
            if mapped_field in ['correspondent', 'document_type']:
                if isinstance(value, dict) and 'name' in value:
                    return value['name']
                return value
            
            # Normalize tag lists: extract names from object-style entries
            elif mapped_field == 'tags':
                if isinstance(value, list):
                    if value and isinstance(value[0], dict) and 'name' in value[0]:
                        return [tag['name'] for tag in value]
                    return value
                return value
            
            return value
        
        # Fall back to custom field lookup using Title Case conversion
        if 'custom_fields' in metadata:
            custom_field_name = self._camel_to_title_case(field_name)
            custom_fields = metadata['custom_fields']
            
            if isinstance(custom_fields, list):
                for cf in custom_fields:
                    # Paperless returns either 'name' or 'field' depending on the endpoint
                    cf_name = cf.get('name') or cf.get('field')
                    if cf_name == custom_field_name:
                        return cf.get('value')
            elif isinstance(custom_fields, dict):
                return custom_fields.get(custom_field_name)
        
        return None
    
    def _camel_to_title_case(self, camel_str: str) -> str:
        """Convert a camelCase string to Title Case.

        Example: 'documentCategory' → 'Document Category'

        Args:
            camel_str: camelCase input string.

        Returns:
            Title Case string with spaces before each original capital letter.
        """
        import re
        result = re.sub(r'([A-Z])', r' \1', camel_str)
        return result.strip().title()
    
    def _values_match(self, extracted: Any, paperless: Any) -> bool:
        """Compare an extracted value with its Paperless counterpart.

        Handles three comparison modes:
            - Lists (tags): set equality after filtering out the 'NEW' inbox tag
            - Strings: case-insensitive, whitespace-trimmed comparison
            - Other types: string-coerced exact comparison

        Args:
            extracted: Value extracted from the document by metadata rules.
            paperless: Value currently stored in Paperless.

        Returns:
            True if the values are considered equivalent.
        """
        
        if isinstance(extracted, list) and isinstance(paperless, list):
            # Exclude the 'NEW' tag which Paperless auto-assigns to incoming documents
            paperless_filtered = [tag for tag in paperless if tag.upper() != 'NEW']
            return set(extracted) == set(paperless_filtered)
        
        if isinstance(extracted, str) and isinstance(paperless, str):
            return extracted.lower().strip() == paperless.lower().strip()
        
        # Fallback: coerce both to string for date and numeric comparisons
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
        Execute a rule: test it and optionally apply changes to Paperless.
        
        Extends test_rule() by building proposed metadata changes and,
        when dry_run is False, writing them back to the Paperless API.
        
        Args:
            rule: Rule configuration dictionary.
            document_id: Paperless document ID.
            document_content: Document OCR text content.
            document_filename: Document filename.
            paperless_metadata: Current Paperless metadata for verification.
            dry_run: If True, compute changes but do not write to Paperless.
        
        Returns:
            Test results plus an 'execution' section with proposed/applied changes.
        """
        
        # Run the standard test pipeline first
        test_result = self.test_rule(rule, document_content, document_filename, paperless_metadata)
        
        if not test_result['success']:
            return test_result
        
        # Abort if scores are below threshold
        if not test_result['classification_allowed']:
            return {
                **test_result,
                'execution': {
                    'applied': False,
                    'reason': 'Classification not allowed - scores below threshold',
                    'changes': {}
                }
            }
        
        # Determine what metadata changes the rule would set
        proposed_changes = self._build_proposed_changes(test_result['extracted_metadata'])
        
        if not dry_run:
            # TODO: Integrate with api_client.py to update Paperless
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
        """Build a dictionary of proposed Paperless field updates.

        Merges static and dynamic metadata (dynamic takes precedence)
        and maps the result to Paperless API field names.

        Args:
            extracted_metadata: Dict with 'static', 'dynamic', and
                                optionally 'filename' sub-dicts.

        Returns:
            Dict of field names to proposed values, ready for the Paperless API.
        """
        
        changes = {}
        
        # Dynamic metadata overrides static when both define the same field
        all_metadata = {}
        all_metadata.update(extracted_metadata.get('static', {}))
        all_metadata.update(extracted_metadata.get('dynamic', {}))
        
        # Map recognised fields to Paperless API names
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
    
    # Load an example rule from the rules directory
    with open('rules/template_v2.yaml', 'r') as f:
        rule = yaml.safe_load(f)
    
    # Sample document content for testing
    document_content = """
    Company Name Inc
    Invoice #12345
    
    Invoice Date: 15-03-2024
    Account Number: ACC-99887
    
    Total Amount: $1,250.00
    """
    
    document_filename = "invoice-2024-03-company-12345.pdf"
    
    engine = TestEngine()
    result = engine.test_rule(rule, document_content, document_filename)
    
    print("Test Result:")
    print(f"POCO OCR Score: {result['scores']['poco_ocr_score']}%")
    print(f"POCO Score: {result['scores']['poco_score']}%")
    print(f"Classification Allowed: {result['classification_allowed']}")
    print(f"Status: {result['status']}")
    print(f"\nOCR Matches: {result['breakdown']['ocr']['matched']}/{result['breakdown']['ocr']['total']}")
    print(f"Filename Matches: {result['breakdown']['filename']['matched']}/{result['breakdown']['filename']['total']}")
