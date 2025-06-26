"""
Processor Pipeline
Main processing pipeline that orchestrates all steps
"""

import logging
import time
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
        
        # Results tracking
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
        
        # Step 5: Evaluate rules
        self.evaluate_rules(doc_dict, rules)
        
        # Step 6: Select winning rule
        winning_rule = self.select_winning_rule(doc_dict)
        if not winning_rule:
            self.logger.info(f"Document {doc_id}: No matching rule found")
            self.output_generator.generate_document_output(doc_dict, self.args.dry_run)
            self.output_generator.log_document_processing(doc_dict, self.args.dry_run)
            return
        
        # Step 7: Extract metadata from winning rule
        self.extract_metadata(doc_dict, winning_rule)
        
        # Step 8: Calculate POCO score
        self.calculate_poco_score(doc_dict, winning_rule)
        
        # Step 9: Apply metadata (or simulate)
        self.apply_metadata(doc_dict, winning_rule)
        
        # Update results
        self.results['processed_documents'] += 1
        self.results['matched_documents'] += 1
        
        if doc_dict.get('poco_summary', {}).get('pass', False):
            self.results['poco_passed'] += 1
        
        rule_id = winning_rule.get('rule_id', 'unknown')
        self.results['rule_usage'][rule_id] = self.results['rule_usage'].get(rule_id, 0) + 1
        
        # Generate output
        self.output_generator.generate_document_output(doc_dict, self.args.dry_run)
        self.output_generator.log_document_processing(doc_dict, self.args.dry_run)
    
    def initialize_document_dict(self, raw_doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Step 4: Initialize document dictionary and fetch all required data"""
        doc_dict = create_document_dict()
        
        # Basic document info
        doc_dict['id'] = raw_doc.get('id')
        doc_dict['title'] = raw_doc.get('title', 'Unknown')
        doc_dict['filename'] = raw_doc.get('original_filename', 'Unknown')
        doc_dict['raw_api_doc'] = raw_doc
        doc_dict['processing_info']['fetched_at'] = datetime.now().isoformat()
        doc_dict['processing_info']['phase'] = 'data_fetching'
        
        # Fetch OCR content
        content = self.api_client.get_document_content(doc_dict['id'])
        if content is None:
            self.logger.error(f"Failed to fetch content for document {doc_dict['id']}")
            return None
        
        doc_dict['content'] = content
        
        # Process Paperless metadata
        doc_dict['paperless_metadata'] = self.metadata_processor.process_paperless_metadata(raw_doc)
        doc_dict['flags']['is_paperless_data_available'] = True
        
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
    
    def select_winning_rule(self, doc_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Step 6: Select the best matching rule"""
        doc_dict['processing_info']['phase'] = 'rule_selection'
        
        rule_evaluations = doc_dict.get('rule_evaluations', [])
        best_rule_eval = self.pattern_matcher.find_best_rule(rule_evaluations)
        
        if best_rule_eval:
            doc_dict['selected_rule'] = best_rule_eval
            doc_dict['flags']['is_content_match'] = True
            
            # Get the full rule definition
            rule_id = best_rule_eval['rule_id']
            return self.rule_loader.get_rule(rule_id)
        
        return None
    
    def extract_metadata(self, doc_dict: Dict[str, Any], rule: Dict[str, Any]) -> None:
        """Step 7: Extract metadata from the winning rule"""
        doc_dict['processing_info']['phase'] = 'metadata_extraction'
        
        content = doc_dict.get('content', '')
        filename = doc_dict.get('filename', '')
        
        # Extract metadata from rule
        rule_metadata = self.metadata_processor.extract_metadata_from_rule(rule, content, filename)
        
        # Store in document dictionary
        doc_dict['content_metadata'] = self.convert_metadata_to_dict_format(rule_metadata['static'])
        
        # Add dynamic metadata
        dynamic_metadata = rule_metadata['dynamic']
        for field, value in dynamic_metadata.items():
            if field in doc_dict['content_metadata']:
                doc_dict['content_metadata'][field]['value'] = value
                doc_dict['content_metadata'][field]['score'] = 10  # Content weight
        
        # Store filename metadata
        doc_dict['filename_metadata'] = self.convert_metadata_to_dict_format(rule_metadata['filename'])
        
        # Store weights
        poco_weights = rule.get('poco_weights', {})
        doc_dict['filename_scores'] = {
            'correspondent': poco_weights.get('filename', 5),
            'document_type': poco_weights.get('filename', 5),
            'tags': poco_weights.get('filename', 5),
            'custom_fields': poco_weights.get('filename', 5),
            'date_created': poco_weights.get('filename', 5),
        }
        doc_dict['paperless_scores'] = {
            'correspondent': poco_weights.get('paperless', 3),
            'document_type': poco_weights.get('paperless', 3),
            'tags': poco_weights.get('paperless', 3),
            'custom_fields': poco_weights.get('paperless', 3),
            'date_created': poco_weights.get('paperless', 3),
        }
    
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
    
    def prepare_final_metadata(self, doc_dict: Dict[str, Any], rule: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare final metadata for application based on POCO scoring"""
        final_metadata = {}
        
        # Use content metadata as primary source
        content_metadata = doc_dict.get('content_metadata', {})
        
        for field, field_data in content_metadata.items():
            if field_data.get('value'):
                final_metadata[field] = field_data['value']
        
        return final_metadata
