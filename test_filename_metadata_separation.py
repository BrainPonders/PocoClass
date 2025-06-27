#!/usr/bin/env python3
"""
Test Filename Metadata Separation
Demonstrates the corrected architecture where content and filename metadata are properly separated
"""

import sys
from pathlib import Path
from config import Config
from metadata_processor import MetadataProcessor
from rule_loader import RuleLoader
import yaml

def test_filename_metadata_separation():
    """Test the corrected filename metadata processing"""
    
    print("🔧 TESTING FILENAME METADATA SEPARATION")
    print("=" * 60)
    
    # Initialize components
    config = Config()
    metadata_processor = MetadataProcessor()
    rule_loader = RuleLoader("rules")
    
    # Test scenarios
    test_cases = [
        {
            'name': 'Rabobank Check Account - Pattern Match',
            'rule_id': 'rabobank_check_592',
            'filename': '2025-05-19-NL89RABO0330689592',
            'content': 'Datum tot en met\n19-05-2025\nTotaal Afgeschreven\nRabobank',
            'expected_filename_metadata': True,
            'expected_content_metadata': True
        },
        {
            'name': 'Rabobank Check Account - No Pattern Match',
            'rule_id': 'rabobank_check_592', 
            'filename': 'random-document-name.pdf',
            'content': 'Datum tot en met\n19-05-2025\nTotaal Afgeschreven\nRabobank',
            'expected_filename_metadata': False,
            'expected_content_metadata': True
        },
        {
            'name': 'Rabobank Year Statement - Multiple Patterns',
            'rule_id': 'rabobank_year_statement',
            'filename': '2024-12-31_NL89RABO0330689592-EUR_Financieel_Jaaroverzicht_2024',
            'content': 'Rabobank\nJaaroverzicht 2024\nTotaalRekening\nNL74 RABO 0330689 592',
            'expected_filename_metadata': True,
            'expected_content_metadata': True
        }
    ]
    
    # Load rules
    rules = rule_loader.load_all_rules()
    print(f"Loaded {len(rules)} rules")
    print()
    
    for test_case in test_cases:
        print(f"📋 TEST CASE: {test_case['name']}")
        print("-" * 40)
        
        rule_id = test_case['rule_id']
        if rule_id not in rules:
            print(f"❌ Rule {rule_id} not found")
            continue
            
        rule = rules[rule_id]
        filename = test_case['filename']
        content = test_case['content']
        
        print(f"Filename: {filename}")
        print(f"Content excerpt: {content[:50]}...")
        print()
        
        # Test filename metadata extraction
        print("🗂️ FILENAME METADATA EXTRACTION:")
        filename_metadata = metadata_processor.extract_filename_metadata(rule, filename)
        
        if filename_metadata:
            print("✅ Filename metadata extracted:")
            for field, value in filename_metadata.items():
                print(f"  {field}: {value}")
        else:
            print("❌ No filename metadata extracted")
        
        # Verify expectation
        has_filename_metadata = bool(filename_metadata)
        expected = test_case['expected_filename_metadata']
        
        if has_filename_metadata == expected:
            print(f"✅ Expected filename metadata result: {expected}")
        else:
            print(f"❌ Unexpected result - Expected: {expected}, Got: {has_filename_metadata}")
        
        print()
        
        # Test content metadata extraction  
        print("📄 CONTENT METADATA EXTRACTION:")
        static_metadata = metadata_processor.extract_static_metadata(rule)
        dynamic_metadata = metadata_processor.extract_dynamic_metadata(rule, content)
        
        print("Static metadata:")
        for field, value in static_metadata.items():
            print(f"  {field}: {value}")
            
        print("Dynamic metadata:")
        for field, value in dynamic_metadata.items():
            print(f"  {field}: {value}")
        
        print()
        print("=" * 60)
        print()

def demonstrate_pattern_flexibility():
    """Show how multiple filename patterns work"""
    
    print("🎨 MULTIPLE FILENAME PATTERN DEMONSTRATION")
    print("=" * 60)
    
    # Load the year statement rule with multiple patterns
    rule_file = Path("rules/rabobank_year_statement.yaml")
    if not rule_file.exists():
        print("❌ Year statement rule file not found")
        return
        
    with open(rule_file, 'r') as f:
        rule = yaml.safe_load(f)
    
    # Test different filename formats
    test_filenames = [
        "2024-12-31_NL89RABO0330689592-EUR_Financieel_Jaaroverzicht_2024",
        "Rabobank_Year_Statement_2024_NL89RABO592", 
        "2024_Jaaroverzicht_NL89RABO592",
        "some-random-filename.pdf"  # Should not match
    ]
    
    metadata_processor = MetadataProcessor()
    
    for filename in test_filenames:
        print(f"Testing: {filename}")
        result = metadata_processor.extract_filename_metadata(rule, filename)
        
        if result:
            print("✅ Pattern matched - Metadata extracted:")
            for field, value in result.items():
                print(f"  {field}: {value}")
        else:
            print("❌ No pattern match - No metadata extracted")
        
        print("-" * 40)

if __name__ == "__main__":
    test_filename_metadata_separation()
    demonstrate_pattern_flexibility()