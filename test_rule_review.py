#!/usr/bin/env python3
"""
Test script for the new rule review scoring system
"""

import sys
from document_dict import create_document_dict
from rule_loader import RuleLoader
from pattern_matcher import PatternMatcher
from metadata_processor import MetadataProcessor
from scoring_calculator import ScoringCalculator
from output_generator import OutputGenerator

def test_rule_review_output():
    """Test the new rule review table output"""
    
    print("Testing Rule Review Scoring System")
    print("=" * 50)
    
    # Load rules
    rule_loader = RuleLoader("rules")
    rules = rule_loader.load_all_rules()
    
    if not rules:
        print("No rules found. Exiting.")
        return
    
    # Create test document that matches ExampleBank rule
    doc_dict = create_document_dict()
    doc_dict['id'] = 888
    doc_dict['title'] = "Test Rule Review"
    doc_dict['filename'] = "2024-12-25-NL89RABO0123456592-EUR.pdf"
    doc_dict['content'] = """
    ExampleBank
    Rekeningafschrift
    
    Rekeningnummer: NL89 RABO 0123 4567 592
    TotaalRekening: €5,678.90
    
    Datum tot en met
    25-12-2024
    
    Totaal Afgeschreven: €1,234.56
    Totaal Bijgeschreven: €2,345.67
    """
    
    # Add some paperless metadata for comparison
    doc_dict['paperless_metadata'] = {
        'date_created': {'raw': '2024-12-20', 'parsed': '2024-12-20'},  # Different date
        'correspondent': {'id': 1, 'name': 'Different Bank'},  # Different correspondent
        'document_type': {'id': 2, 'name': 'Bank Statement'},  # Same type
        'tags': [],
        'custom_fields': []
    }
    
    # Evaluate rules
    pattern_matcher = PatternMatcher()
    rule_evaluations = []
    
    for rule_id, rule in rules.items():
        evaluation = pattern_matcher.evaluate_rule(rule, doc_dict['content'], doc_dict['filename'])
        rule_evaluations.append(evaluation)
    
    doc_dict['rule_evaluations'] = rule_evaluations
    
    # Select best rule
    winning_rule_eval = pattern_matcher.find_best_rule(rule_evaluations)
    if not winning_rule_eval:
        print("No matching rule found")
        return
    
    doc_dict['selected_rule'] = winning_rule_eval
    winning_rule = rules[winning_rule_eval['rule_id']]
    
    # Extract metadata
    metadata_processor = MetadataProcessor()
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
    
    # Calculate POCO score with new system
    scoring_calculator = ScoringCalculator()
    poco_result = scoring_calculator.calculate_poco_score(doc_dict, winning_rule)
    
    print(f"Rule selected: {winning_rule_eval['rule_id']}")
    print(f"Rule score: {winning_rule_eval['total_score']}")
    print(f"Rule threshold: {winning_rule.get('threshold', 70)}")
    print()
    
    # Generate output with verbose mode
    output_generator = OutputGenerator(verbose=True, debug=False)
    output_generator.generate_document_output(doc_dict, dry_run=True)

if __name__ == '__main__':
    test_rule_review_output()