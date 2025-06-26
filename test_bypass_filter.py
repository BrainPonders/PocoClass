#!/usr/bin/env python3
"""
Test rule review system by bypassing tag filters
"""

import sys
from config import Config
from api_client import PaperlessAPIClient
from document_dict import create_document_dict
from rule_loader import RuleLoader
from pattern_matcher import PatternMatcher
from metadata_processor import MetadataProcessor
from scoring_calculator import ScoringCalculator
from output_generator import OutputGenerator

def test_document_683():
    """Test the rule review system with document 683 (ExampleBank statement)"""
    
    print("Testing Rule Review System with Real ExampleBank Document (ID: 683)")
    print("=" * 70)
    
    # Initialize components
    config = Config()
    api_client = PaperlessAPIClient(config)
    rule_loader = RuleLoader(config.rules_directory)
    pattern_matcher = PatternMatcher()
    metadata_processor = MetadataProcessor()
    scoring_calculator = ScoringCalculator()
    output_generator = OutputGenerator(verbose=True, debug=False)
    
    # Test API connection
    if not api_client.test_connection():
        print("Failed to connect to API")
        return
    
    # Load rules
    rules = rule_loader.load_all_rules()
    print(f"Loaded {len(rules)} rules")
    
    # Get the specific document (bypass tag filter)
    try:
        import requests
        headers = {'Authorization': f'Token {config.paperless_token}'}
        response = requests.get(f"{config.paperless_url}/api/documents/683/", headers=headers)
        response.raise_for_status()
        raw_doc = response.json()
        
        print(f"Retrieved document: {raw_doc['title']}")
        print(f"Filename: {raw_doc.get('original_file_name', 'N/A')}")
        
        # Get document content
        content = api_client.get_document_content(683)
        if not content:
            print("Could not retrieve document content")
            return
        
        print(f"Content length: {len(content)} characters")
        print(f"Content preview: {content[:200]}...")
        print()
        
    except Exception as e:
        print(f"Error retrieving document: {e}")
        return
    
    # Initialize document dictionary
    doc_dict = create_document_dict()
    doc_dict['id'] = raw_doc['id']
    doc_dict['title'] = raw_doc['title']
    doc_dict['filename'] = raw_doc.get('original_file_name', '')
    doc_dict['content'] = content
    
    # Process paperless metadata
    doc_dict['paperless_metadata'] = metadata_processor.process_paperless_metadata(raw_doc)
    
    # Evaluate rules
    rule_evaluations = []
    for rule_id, rule in rules.items():
        evaluation = pattern_matcher.evaluate_rule(rule, doc_dict['content'], doc_dict['filename'])
        rule_evaluations.append(evaluation)
    
    doc_dict['rule_evaluations'] = rule_evaluations
    
    # Select winning rule
    winning_rule_eval = pattern_matcher.find_best_rule(rule_evaluations)
    if not winning_rule_eval:
        print("No matching rule found")
        return
    
    doc_dict['selected_rule'] = winning_rule_eval
    winning_rule = rules[winning_rule_eval['rule_id']]
    
    print(f"Winning rule: {winning_rule_eval['rule_id']} ({winning_rule_eval['total_score']}/{winning_rule_eval['threshold']})")
    
    # Extract metadata from rule
    rule_metadata = metadata_processor.extract_metadata_from_rule(
        winning_rule, doc_dict['content'], doc_dict['filename']
    )
    
    # Convert to document dict format
    def convert_metadata_to_dict_format(metadata):
        converted = {}
        fields = ['correspondent', 'document_type', 'tags', 'custom_fields', 'date_created']
        for field in fields:
            if field in metadata:
                converted[field] = {'value': metadata[field], 'score': 10}
            else:
                converted[field] = {'value': None, 'score': 0}
        return converted
    
    doc_dict['content_metadata'] = convert_metadata_to_dict_format(rule_metadata['static'])
    doc_dict['filename_metadata'] = convert_metadata_to_dict_format(rule_metadata['filename'])
    
    # Add dynamic metadata
    for field, value in rule_metadata['dynamic'].items():
        if field in doc_dict['content_metadata']:
            doc_dict['content_metadata'][field]['value'] = value
    
    # Calculate POCO score
    poco_result = scoring_calculator.calculate_poco_score(doc_dict, winning_rule)
    
    print(f"POCO Score: {poco_result['final_score']}")
    print(f"Should continue processing: {poco_result['should_continue_processing']}")
    print()
    
    # Generate verbose output with rule review table
    output_generator.generate_document_output(doc_dict, dry_run=True)

if __name__ == '__main__':
    test_document_683()