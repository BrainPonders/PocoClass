"""
Processor Pipeline
Main processing pipeline that orchestrates all steps
"""

import logging
import time
import json
from typing import Dict, List, Any, Optional
from datetime import datetime

from config import Config
from document_dict import create_document_dict
from api_client import PaperlessAPIClient
from rule_loader import RuleLoader
from pattern_matcher import PatternMatcher
from metadata_processor import MetadataProcessor
from scoring_calculator import ScoringCalculator
from output_generator import OutputGenerator

class ProcessorPipeline:
    """Main processing pipeline for document classification"""
    
    def __init__(self, config: Config, args):
        self.config = config
        self.args = args
        self.logger = logging.getLogger(__name__)
        
        # Initialize components
        self.api_client = PaperlessAPIClient(config)
        self.rule_loader = RuleLoader(config.rules_directory)
        self.pattern_matcher = PatternMatcher()
        self.metadata_processor = MetadataProcessor()
        self.scoring_calculator = ScoringCalculator()
        self.output_generator = OutputGenerator(args.verbose, args.debug)
        
        # Initialize results tracking
        self.results = {
            'total_documents': 0,
            'processed_documents': 0,
            'matched_documents': 0,
            'poco_passed': 0,
            'rule_usage': {},
            'rule_names': {},
            'processing_time': 0,
            'errors': []
        }
        
    def print_debug_dict(self, step_name: str, doc_dict: Dict[str, Any]) -> None:
        """Print only new/changed data for debug mode"""
        if not self.args.debug:
            return
            
        print(f"\n{'='*80}")
        print(f"DEBUG: {step_name.upper()}")
        print(f"Document ID: {doc_dict.get('id', 'Unknown')}")
        print(f"{'='*80}")
        
        # Show only relevant data for each step
        if "STEP 4" in step_name:
            self._debug_step_4(doc_dict)
        elif "STEP 5" in step_name:
            self._debug_step_5(doc_dict)
        elif "STEP 6" in step_name:
            self._debug_step_6(doc_dict)
        elif "STEP 7" in step_name:
            self._debug_step_7(doc_dict)
        elif "STEP 8" in step_name:
            self._debug_step_8(doc_dict)
        elif "STEP 9" in step_name:
            self._debug_step_9(doc_dict)
        
        print(f"{'='*80}\n")
    
    def print_debug_raw(self, step_name: str, doc_dict: Dict[str, Any]) -> None:
        """Print raw dictionary structure with clean formatting"""
        print(f"{'='*80}")
        print(f"DEBUG RAW: {step_name.upper()}")
        print(f"Document ID: {doc_dict.get('id', 'Unknown')}")
        print(f"{'='*80}")
        
        # Format dictionary with clean indentation
        self._print_dict_clean(doc_dict, indent=0)
        print(f"{'='*80}\n")
    
    def _print_dict_clean(self, obj: Any, indent: int = 0, printed_keys: set = None) -> None:
        """Print dictionary structure with clean formatting, avoiding duplicate keys"""
        if printed_keys is None:
            printed_keys = set()
        
        spaces = "  " * indent
        
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key in printed_keys:
                    continue
                printed_keys.add(key)
                
                if isinstance(value, (dict, list)):
                    print(f'{spaces}"{key}": {{' if isinstance(value, dict) else f'{spaces}"{key}": [')
                    self._print_dict_clean(value, indent + 1, printed_keys)
                    print(f'{spaces}}}' if isinstance(value, dict) else f'{spaces}]')
                elif isinstance(value, str):
                    print(f'{spaces}"{key}": "{value}"')
                elif isinstance(value, bool):
                    print(f'{spaces}"{key}": {str(value).lower()}')
                elif value is None:
                    print(f'{spaces}"{key}": null')
                else:
                    print(f'{spaces}"{key}": {value}')
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                if isinstance(item, (dict, list)):
                    print(f'{spaces}{{' if isinstance(item, dict) else f'{spaces}[')
                    self._print_dict_clean(item, indent + 1, printed_keys)
                    print(f'{spaces}}}' if isinstance(item, dict) else f'{spaces}]')
                else:
                    print(f'{spaces}{item}')
    
    def _debug_step_4(self, doc_dict: Dict[str, Any]) -> None:
        """Show initial document structure"""
        print("Basic Document Info:")
        print(f"  ID: {doc_dict.get('id')}")
        print(f"  Title: {doc_dict.get('title')}")
        print(f"  Filename: {doc_dict.get('filename')}")
        print(f"  Content Length: {len(doc_dict.get('content', ''))} characters")
        
        print("\nPaperless Metadata:")
        pm = doc_dict.get('paperless_metadata', {})
        print(f"  Date Created: {pm.get('date_created', {}).get('parsed')}")
        print(f"  Correspondent: ID {pm.get('correspondent', {}).get('id')}")
        print(f"  Document Type: ID {pm.get('document_type', {}).get('id')}")
        print(f"  Tags: {[tag.get('id') for tag in pm.get('tags', [])]}")
    
    def _debug_step_5(self, doc_dict: Dict[str, Any]) -> None:
        """Show rule evaluation results"""
        print("Rule Evaluation Results:")
        evaluations = doc_dict.get('rule_evaluations', [])
        for eval_data in evaluations:
            status = "PASS" if eval_data.get('pass') else "FAIL"
            print(f"  {eval_data.get('rule_id')}: {eval_data.get('total_score')}/{eval_data.get('threshold')} ({status})")
    
    def _debug_step_6(self, doc_dict: Dict[str, Any]) -> None:
        """Show selected winning rule"""
        print("Selected Winning Rule:")
        selected = doc_dict.get('selected_rule', {})
        if selected.get('rule_id'):
            print(f"  Rule: {selected.get('rule_name')} ({selected.get('rule_id')})")
            print(f"  Score: {selected.get('total_score')}/{selected.get('threshold')}")
            print(f"  Core Matches: {len(selected.get('core_matches', []))}")
            print(f"  Bonus Matches: {len(selected.get('bonus_matches', []))}")
        else:
            print("  No rule selected")
    
    def _debug_step_7(self, doc_dict: Dict[str, Any]) -> None:
        """Show extracted metadata"""
        print("Extracted Metadata:")
        content_meta = doc_dict.get('content_metadata', {})
        filename_meta = doc_dict.get('filename_metadata', {})
        
        for field in ['correspondent', 'document_type', 'date_created', 'tags', 'custom_fields']:
            content_val = content_meta.get(field, {}).get('value')
            filename_val = filename_meta.get(field, {}).get('value')
            if content_val or filename_val:
                print(f"  {field.title()}:")
                if content_val:
                    print(f"    Content: {content_val}")
                if filename_val:
                    print(f"    Filename: {filename_val}")
    
    def _debug_step_8(self, doc_dict: Dict[str, Any]) -> None:
        """Show POCO scoring results"""
        print("POCO Scoring Summary:")
        poco_summary = doc_dict.get('poco_summary', {})
        if poco_summary:
            print(f"  Final POCO Score: {poco_summary.get('final_score', 'N/A')}")
            print(f"  Processing Status: {poco_summary.get('status', 'Unknown')}")
            
            # Show field scores in a clean format
            field_scores = poco_summary.get('field_scores', {})
            if field_scores:
                print("  Field Confidence Scores:")
                for field, scores in field_scores.items():
                    if isinstance(scores, dict):
                        final = scores.get('final_score', 0)
                        print(f"    {field.title()}: {final}")
    
    def _debug_step_9(self, doc_dict: Dict[str, Any]) -> None:
        """Show final application results"""
        print("Metadata Application:")
        if self.args.dry_run:
            print("  Mode: DRY RUN (simulated)")
        else:
            print("  Mode: LIVE (applied to Paperless)")
        
        print(f"  Document ID: {doc_dict.get('id')}")
        print(f"  Processing Phase: {doc_dict.get('processing_info', {}).get('phase', 'Unknown')}")
        
        # Show flags
        flags = doc_dict.get('flags', {})
        print("  Processing Flags:")
        for flag, value in flags.items():
            status = "YES" if value else "NO"
            print(f"    {flag}: {status}")
    
    def _prepare_dict_for_debug(self, obj: Any) -> Any:
        """Prepare dictionary for JSON serialization by handling non-serializable objects"""
        if isinstance(obj, dict):
            return {key: self._prepare_dict_for_debug(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._prepare_dict_for_debug(item) for item in obj]
        elif hasattr(obj, 'isoformat'):  # datetime objects
            return obj.isoformat()
        elif isinstance(obj, (str, int, float, bool, type(None))):
            return obj
        else:
            return str(obj)
    

    
    def execute(self) -> Dict[str, Any]:
        """Execute the complete processing pipeline"""
        start_time = time.time()
        
        try:
            # Step 1: Validate configuration and test connection
            self.logger.info("Step 1: Validating configuration and testing connection")
            if not self.validate_setup():
                raise RuntimeError("Setup validation failed")
            
            # Step 2: Load and validate rules
            self.logger.info("Step 2: Loading and validating rules")
            rules = self.load_rules()
            if not rules:
                raise RuntimeError("No valid rules loaded")
            
            # Step 3: Retrieve documents
            self.logger.info("Step 3: Retrieving documents from Paperless")
            documents = self.retrieve_documents()
            if not documents:
                self.logger.warning("No documents found matching criteria")
                return self.results
            
            self.results['total_documents'] = len(documents)
            
            # Handle special cases
            if self.args.id_only:
                self.output_generator.print_document_ids(documents)
                return self.results
            
            if self.args.show_content:
                content = self.api_client.get_document_content(self.args.show_content)
                if content:
                    self.output_generator.print_document_content(self.args.show_content, content)
                return self.results
            
            # Step 4-9: Process each document
            self.logger.info(f"Step 4-9: Processing {len(documents)} documents")
            for doc in documents:
                try:
                    self.process_document(doc, rules)
                except Exception as e:
                    self.logger.error(f"Error processing document {doc.get('id', 'Unknown')}: {e}")
                    self.results['errors'].append(f"Document {doc.get('id', 'Unknown')}: {str(e)}")
            
            # Calculate processing time
            self.results['processing_time'] = time.time() - start_time
            
            return self.results
            
        except Exception as e:
            self.logger.error(f"Pipeline execution failed: {e}")
            self.results['processing_time'] = time.time() - start_time
            raise
    
    def validate_setup(self) -> bool:
        """Step 1: Validate configuration and test API connection"""
        try:
            self.config.validate()
            return self.api_client.test_connection()
        except Exception as e:
            self.logger.error(f"Setup validation failed: {e}")
            return False
    
    def load_rules(self) -> Dict[str, Dict[str, Any]]:
        """Step 2: Load and validate all rules"""
        rules = self.rule_loader.load_all_rules()
        
        # Store rule names for summary
        for rule_id, rule in rules.items():
            self.results['rule_names'][rule_id] = rule.get('rule_name', rule_id)
        
        return rules
    
    def retrieve_documents(self) -> List[Dict[str, Any]]:
        """Step 3: Retrieve documents from Paperless API"""
        return self.api_client.get_documents(
            limit=self.args.limit,
            document_id=self.args.limit_id
        )
    
    def process_document(self, raw_doc: Dict[str, Any], rules: Dict[str, Dict[str, Any]]) -> None:
        """Process a single document through steps 4-9"""
        doc_id = raw_doc.get('id')
        title = raw_doc.get('title', 'Unknown')
        
        self.logger.info(f"Processing document {doc_id}: {title}")
        
        # Step 4: Initialize document dictionary and fetch data
        doc_dict = self.initialize_document_dict(raw_doc)
        if not doc_dict:
            return
        if self.args.debug:
            self.print_debug_dict("STEP 4 - DOCUMENT DICTIONARY INITIALIZED", doc_dict)
        elif self.args.debug_raw:
            self.print_debug_raw("STEP 4 - DOCUMENT DICTIONARY INITIALIZED", doc_dict)
        
        # Step 5: Evaluate rules
        self.evaluate_rules(doc_dict, rules)
        if self.args.debug:
            self.print_debug_dict("STEP 5 - RULE EVALUATIONS COMPLETED", doc_dict)
        elif self.args.debug_raw:
            self.print_debug_raw("STEP 5 - RULE EVALUATIONS COMPLETED", doc_dict)
        
        # Step 6: Select winning rule
        winning_rule = self.select_winning_rule(doc_dict)
        if not winning_rule:
            self.logger.info(f"Document {doc_id}: No matching rule found")
            self.output_generator.generate_document_output(doc_dict, self.args.dry_run)
            self.output_generator.log_document_processing(doc_dict, self.args.dry_run)
            return
        if self.args.debug:
            self.print_debug_dict("STEP 6 - WINNING RULE SELECTED", doc_dict)
        elif self.args.debug_raw:
            self.print_debug_raw("STEP 6 - WINNING RULE SELECTED", doc_dict)
        
        # Step 7: Extract metadata from winning rule
        self.extract_metadata(doc_dict, winning_rule)
        if self.args.debug:
            self.print_debug_dict("STEP 7 - METADATA EXTRACTED", doc_dict)
        elif self.args.debug_raw:
            self.print_debug_raw("STEP 7 - METADATA EXTRACTED", doc_dict)
        
        # Step 8: Calculate POCO score
        self.calculate_poco_score(doc_dict, winning_rule)
        if self.args.debug:
            self.print_debug_dict("STEP 8 - POCO SCORES CALCULATED", doc_dict)
        elif self.args.debug_raw:
            self.print_debug_raw("STEP 8 - POCO SCORES CALCULATED", doc_dict)
        
        # Step 9: Apply metadata (or simulate)
        self.apply_metadata(doc_dict, winning_rule)
        if self.args.debug:
            self.print_debug_dict("STEP 9 - METADATA APPLIED", doc_dict)
        elif self.args.debug_raw:
            self.print_debug_raw("STEP 9 - METADATA APPLIED", doc_dict)
        
        # Update results
        self.results['processed_documents'] += 1
        self.results['matched_documents'] += 1
        
        if doc_dict.get('poco_summary', {}).get('pass', False):
            self.results['poco_passed'] += 1
        
        rule_id = winning_rule.get('rule_id', 'unknown')
        self.results['rule_usage'][rule_id] = self.results['rule_usage'].get(rule_id, 0) + 1
        
        # Generate output - always show verbose tables when verbose is enabled
        self.output_generator.generate_document_output(doc_dict, self.args.dry_run)
        self.output_generator.log_document_processing(doc_dict, self.args.dry_run)
    
    def initialize_document_dict(self, raw_doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Step 4: Initialize document dictionary and fetch all required data"""
        doc_dict = create_document_dict()
        
        # Basic document info
        doc_dict['id'] = raw_doc.get('id')
        doc_dict['title'] = raw_doc.get('title', raw_doc.get('original_file_name', 'Unknown'))
        doc_dict['filename'] = raw_doc.get('original_file_name', raw_doc.get('title', 'Unknown'))
        doc_dict['raw_api_doc'] = raw_doc
        doc_dict['processing_info']['fetched_at'] = datetime.now().isoformat()
        doc_dict['processing_info']['phase'] = 'data_fetching'
        
        # Fetch OCR content
        document_id = doc_dict.get('id')
        if document_id is None:
            self.logger.error("Document ID is None, cannot fetch content")
            return None
            
        content = self.api_client.get_document_content(int(document_id))
        if content is None:
            self.logger.error(f"Failed to fetch content for document {document_id}")
            return None
        
        doc_dict['content'] = content
        
        # Process Paperless metadata
        doc_dict['paperless_metadata'] = self.metadata_processor.process_paperless_metadata(raw_doc, self.api_client)
        doc_dict['flags']['is_paperless_data_available'] = True
        
        # Debug output after Step 4
        self.print_debug_dict("Step 4 - Document Dictionary Initialized", doc_dict)
        
        return doc_dict
    
    def evaluate_rules(self, doc_dict: Dict[str, Any], rules: Dict[str, Dict[str, Any]]) -> None:
        """Step 5: Evaluate all rules against the document"""
        doc_dict['processing_info']['phase'] = 'rule_evaluation'
        
        content = doc_dict.get('content', '')
        filename = doc_dict.get('filename', '')
        
        rule_evaluations = []
        
        for rule_id, rule in rules.items():
            evaluation = self.pattern_matcher.evaluate_rule(rule, content, filename)
            rule_evaluations.append(evaluation)
        
        doc_dict['rule_evaluations'] = rule_evaluations
        
        # Debug output after Step 5
        self.print_debug_dict("Step 5 - Rules Evaluated", doc_dict)
    
    def select_winning_rule(self, doc_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Step 6: Select the best matching rule"""
        doc_dict['processing_info']['phase'] = 'rule_selection'
        
        rule_evaluations = doc_dict.get('rule_evaluations', [])
        best_rule_eval = self.pattern_matcher.find_best_rule(rule_evaluations)
        
        if best_rule_eval:
            # Update selected_rule with the evaluation data
            doc_dict['selected_rule'].update(best_rule_eval)
            doc_dict['flags']['is_content_match'] = True
            
            # Get the full rule definition
            rule_id = best_rule_eval['rule_id']
            rule = self.rule_loader.get_rule(rule_id)
            
            # Debug output after Step 6
            self.print_debug_dict("Step 6 - Winning Rule Selected", doc_dict)
            
            return rule
        
        # Debug output for no rule found
        self.print_debug_dict("Step 6 - No Winning Rule Found", doc_dict)
        return None
    
    def extract_metadata(self, doc_dict: Dict[str, Any], rule: Dict[str, Any]) -> None:
        """Step 7: Extract metadata from the winning rule"""
        doc_dict['processing_info']['phase'] = 'metadata_extraction'
        
        content = doc_dict.get('content', '')
        filename = doc_dict.get('filename', '')
        
        # Extract metadata from rule
        rule_metadata = self.metadata_processor.extract_metadata_from_rule(rule, content, filename)
        
        # Update content metadata with static values from rule
        static_metadata = rule_metadata['static']
        for field, value in static_metadata.items():
            if field in doc_dict['content_metadata'] and value is not None:
                doc_dict['content_metadata'][field]['value'] = value
                doc_dict['content_metadata'][field]['score'] = 10  # Content weight
        
        # Add dynamic metadata
        dynamic_metadata = rule_metadata['dynamic']
        for field, value in dynamic_metadata.items():
            if field in doc_dict['content_metadata'] and value is not None:
                doc_dict['content_metadata'][field]['value'] = value
                doc_dict['content_metadata'][field]['score'] = 10  # Content weight
        
        # Update filename metadata
        filename_metadata = rule_metadata['filename']
        for field, value in filename_metadata.items():
            if field in doc_dict['filename_metadata'] and value is not None:
                doc_dict['filename_metadata'][field]['value'] = value
                doc_dict['filename_metadata'][field]['score'] = 5  # Filename weight
        
        # Store weights from rule configuration
        poco_weights = rule.get('poco_weights', {})
        for field in doc_dict['filename_scores']:
            doc_dict['filename_scores'][field] = poco_weights.get('filename', 5)
        
        for field in doc_dict['paperless_scores']:
            doc_dict['paperless_scores'][field] = poco_weights.get('paperless', 3)
        
        # Debug output after Step 7
        self.print_debug_dict("Step 7 - Metadata Extracted", doc_dict)
    
    def convert_metadata_to_dict_format(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Convert metadata to the document dictionary format"""
        converted = {}
        
        fields = ['correspondent', 'document_type', 'tags', 'custom_fields', 'date_created']
        
        for field in fields:
            if field in metadata:
                converted[field] = {
                    'value': metadata[field],
                    'score': 10 if metadata[field] else 0  # Content weight
                }
            else:
                converted[field] = {'value': None, 'score': 0}
        
        return converted
    
    def calculate_poco_score(self, doc_dict: Dict[str, Any], rule: Dict[str, Any]) -> None:
        """Step 8: Calculate POCO score"""
        doc_dict['processing_info']['phase'] = 'poco_scoring'
        
        poco_result = self.scoring_calculator.calculate_poco_score(doc_dict, rule)
        
        # Store overall scores
        doc_dict['scores'] = {
            'content': doc_dict.get('selected_rule', {}).get('total_score', 0),
            'filename': sum(doc_dict.get('filename_scores', {}).values()),
            'paperless': sum(doc_dict.get('paperless_scores', {}).values()),
        }
        
        # Store POCO results
        doc_dict['poco_summary'] = poco_result
        
        # Debug output after Step 8
        self.print_debug_dict("Step 8 - POCO Score Calculated", doc_dict)
    
    def apply_metadata(self, doc_dict: Dict[str, Any], rule: Dict[str, Any]) -> None:
        """Step 9: Apply metadata to Paperless (or simulate)"""
        doc_dict['processing_info']['phase'] = 'metadata_application'
        
        if self.args.dry_run:
            self.logger.info(f"DRY RUN: Would apply metadata to document {doc_dict['id']}")
            return
        
        # Prepare metadata for application
        metadata_to_apply = self.prepare_final_metadata(doc_dict, rule)
        
        # Get API mappings
        api_mappings = {
            'correspondents': self.api_client.get_all_correspondents(),
            'document_types': self.api_client.get_all_document_types(),
            'tags': self.api_client.get_all_tags(),
            'custom_fields': self.api_client.get_all_custom_fields()
        }
        
        # Prepare update payload
        update_payload = self.metadata_processor.prepare_update_payload(
            doc_dict['id'], metadata_to_apply, api_mappings
        )
        
        # Add POCO score as custom field
        poco_score = doc_dict.get('poco_summary', {}).get('final_score', 0)
        poco_field_id = self.api_client.get_custom_field_id(self.config.poco_score_field)
        if poco_field_id:
            if 'custom_fields' not in update_payload:
                update_payload['custom_fields'] = []
            update_payload['custom_fields'].append({
                'field': poco_field_id,
                'value': str(poco_score)
            })
        
        # Add POCO tag
        poco_tag_id = self.api_client.get_tag_id(self.config.poco_tag_name)
        if poco_tag_id:
            if 'tags' not in update_payload:
                update_payload['tags'] = []
            if poco_tag_id not in update_payload['tags']:
                update_payload['tags'].append(poco_tag_id)
        
        # Apply update
        success = self.api_client.update_document(doc_dict['id'], update_payload)
        if success:
            self.logger.info(f"Successfully updated document {doc_dict['id']}")
        else:
            self.logger.error(f"Failed to update document {doc_dict['id']}")
        
        # Debug output after Step 9
        self.print_debug_dict("Step 9 - Metadata Applied (or Simulated)", doc_dict)
    
    def prepare_final_metadata(self, doc_dict: Dict[str, Any], rule: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare final metadata for application based on POCO scoring"""
        final_metadata = {}
        
        # Use content metadata as primary source
        content_metadata = doc_dict.get('content_metadata', {})
        
        for field, field_data in content_metadata.items():
            if field_data.get('value'):
                final_metadata[field] = field_data['value']
        
        return final_metadata
