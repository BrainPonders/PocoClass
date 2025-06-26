#!/usr/bin/env python3
"""
Complete Workflow Demonstration
Shows each step of the modular document processing pipeline
"""

import sys
import json
from pathlib import Path
from config import Config
from document_dict import create_document_dict
from rule_loader import RuleLoader
from pattern_matcher import PatternMatcher
from metadata_processor import MetadataProcessor
from scoring_calculator import ScoringCalculator
from output_generator import OutputGenerator

def demonstrate_modular_workflow():
    """Demonstrate the complete step-by-step workflow"""
    
    print("="*80)
    print("POST-CONSUMPTION SCRIPT - MODULAR WORKFLOW DEMONSTRATION")
    print("="*80)
    
    # Initialize configuration
    print("\n🔧 STEP 1: CONFIGURATION INITIALIZATION")
    print("-" * 50)
    config = Config()
    print(f"✓ Paperless URL: {config.paperless_url}")
    print(f"✓ Filter tags: Include '{config.filter_tag_include}', Exclude '{config.filter_tag_exclude}'")
    print(f"✓ Rules directory: {config.rules_directory}")
    print(f"✓ Thresholds: Global {config.global_threshold}%, POCO {config.poco_threshold}%")
    
    # Load rules
    print("\n📋 STEP 2: RULE LOADING AND VALIDATION")
    print("-" * 50)
    rule_loader = RuleLoader(config.rules_directory)
    rules = rule_loader.load_all_rules()
    
    for rule_id, rule in rules.items():
        print(f"✓ Loaded rule: {rule_id} - {rule.get('rule_name', 'Unknown')}")
        print(f"  Threshold: {rule.get('threshold', 0)}%")
        print(f"  Core identifiers: {len(rule.get('core_identifiers', {}).get('logic_groups', []))} groups")
        print(f"  Bonus identifiers: {len(rule.get('bonus_identifiers', {}).get('logic_groups', []))} groups")
    
    # Create sample document for demonstration
    print("\n📄 STEP 3: DOCUMENT INITIALIZATION")
    print("-" * 50)
    
    # Sample document content that matches ExampleBank rule
    sample_content = """
    ExampleBank
    Rekeningafschrift
    
    Rekeningnummer: NL89 RABO 0123 4567 592
    
    TotaalRekening: €5,678.90
    
    Datum tot en met
    25-12-2024
    
    Totaal Afgeschreven: €1,234.56
    Totaal Bijgeschreven: €2,345.67
    
    Nieuw Afschrift vanaf 01-01-2025
    """
    
    # Create document dictionary
    doc_dict = create_document_dict()
    doc_dict['id'] = 999  # Demo document ID
    doc_dict['title'] = "Demo Bank Statement"
    doc_dict['filename'] = "2024-12-25-NL89RABO0123456592-EUR.pdf"
    doc_dict['content'] = sample_content
    
    # Simulate paperless metadata
    doc_dict['paperless_metadata'] = {
        'date_created': {'raw': '2024-12-25', 'parsed': '2024-12-25'},
        'correspondent': {'id': None, 'name': None},
        'document_type': {'id': None, 'name': None},
        'tags': [],
        'custom_fields': []
    }
    
    print(f"✓ Document ID: {doc_dict['id']}")
    print(f"✓ Title: {doc_dict['title']}")
    print(f"✓ Filename: {doc_dict['filename']}")
    print(f"✓ Content length: {len(doc_dict['content'])} characters")
    
    # Pattern matching and rule evaluation
    print("\n🔍 STEP 4: RULE EVALUATION AND PATTERN MATCHING")
    print("-" * 50)
    
    pattern_matcher = PatternMatcher()
    rule_evaluations = []
    
    for rule_id, rule in rules.items():
        evaluation = pattern_matcher.evaluate_rule(rule, doc_dict['content'], doc_dict['filename'])
        rule_evaluations.append(evaluation)
        
        print(f"✓ Rule: {rule_id}")
        print(f"  Core score: {evaluation['core_score']}")
        print(f"  Bonus score: {evaluation['bonus_score']}")
        print(f"  Total score: {evaluation['total_score']}/{evaluation['threshold']}")
        print(f"  Result: {'PASS' if evaluation['pass'] else 'FAIL'}")
        print()
    
    doc_dict['rule_evaluations'] = rule_evaluations
    
    # Select winning rule
    print("\n🏆 STEP 5: WINNING RULE SELECTION")
    print("-" * 50)
    
    winning_rule_eval = pattern_matcher.find_best_rule(rule_evaluations)
    if winning_rule_eval:
        doc_dict['selected_rule'] = winning_rule_eval
        winning_rule = rules[winning_rule_eval['rule_id']]
        
        print(f"✓ Selected rule: {winning_rule_eval['rule_id']}")
        print(f"✓ Rule name: {winning_rule_eval['rule_name']}")
        print(f"✓ Final score: {winning_rule_eval['total_score']}/{winning_rule_eval['threshold']}")
    else:
        print("✗ No matching rule found")
        return
    
    # Metadata extraction
    print("\n📊 STEP 6: METADATA EXTRACTION")
    print("-" * 50)
    
    metadata_processor = MetadataProcessor()
    rule_metadata = metadata_processor.extract_metadata_from_rule(
        winning_rule, doc_dict['content'], doc_dict['filename']
    )
    
    print("✓ Static metadata:")
    for field, value in rule_metadata['static'].items():
        print(f"  {field}: {value}")
    
    print("\n✓ Dynamic metadata:")
    for field, value in rule_metadata['dynamic'].items():
        print(f"  {field}: {value}")
    
    print("\n✓ Filename metadata:")
    for field, value in rule_metadata['filename'].items():
        print(f"  {field}: {value}")
    
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
    
    # POCO scoring
    print("\n🎯 STEP 7: POCO SCORE CALCULATION")
    print("-" * 50)
    
    scoring_calculator = ScoringCalculator()
    poco_result = scoring_calculator.calculate_poco_score(doc_dict, winning_rule)
    
    print(f"✓ Final POCO score: {poco_result['final_score']}%")
    print(f"✓ Pass threshold: {'PASS' if poco_result['pass'] else 'FAIL'}")
    print(f"✓ Total points: {poco_result['total_score']}/{poco_result['max_possible_score']}")
    
    # Output generation
    print("\n📋 STEP 8: OUTPUT GENERATION")
    print("-" * 50)
    
    output_generator = OutputGenerator(verbose=True, debug=False)
    output_generator.generate_document_output(doc_dict, dry_run=True)
    
    # Final summary
    print("\n📈 STEP 9: PROCESSING SUMMARY")
    print("-" * 50)
    print("✓ Document successfully processed through all 9 steps")
    print("✓ Modular architecture allows easy extension and maintenance")
    print("✓ Each step writes data to the document dictionary")
    print("✓ Comprehensive scoring system ensures metadata quality")
    print("✓ Flexible rule system supports any document type")
    
    print("\n" + "="*80)
    print("WORKFLOW DEMONSTRATION COMPLETE")
    print("="*80)

if __name__ == '__main__':
    demonstrate_modular_workflow()