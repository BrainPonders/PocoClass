#!/usr/bin/env python3
"""
Filename Decoding Mechanism Demonstration
Shows exactly how the system processes filenames to extract metadata
"""

import re
import yaml
from datetime import datetime
from pathlib import Path

def demonstrate_filename_decoding():
    """Show complete filename decoding process"""
    
    # Example filename from the real system
    filename = "2025-05-19-NL89RABO0330689592"
    print(f"🎯 FILENAME DECODING DEMONSTRATION")
    print(f"=" * 60)
    print(f"Input filename: {filename}")
    print()
    
    # Load the actual rule configuration
    rule_file = Path("rules/rabobank_check_592.yaml")
    if rule_file.exists():
        with open(rule_file, 'r') as f:
            rule = yaml.safe_load(f)
    else:
        print("❌ Rule file not found, using example configuration")
        rule = {
            'filename_metadata': {
                'correspondent': 'Rabobank',
                'document_type': 'Bank Statement',
                'tags': ['Check Account'],
                'custom_fields': {'Document Category': 'FINANCE'}
            },
            'filename_patterns': [
                {
                    'pattern': r'(\d{4}-\d{2}-\d{2})-NL89RABO\d{10}',
                    'date_group': 1,
                    'date_format': '%Y-%m-%d'
                }
            ]
        }
    
    print("📋 STEP 1: STATIC METADATA EXTRACTION")
    print("-" * 40)
    
    # Step 1: Extract static metadata
    filename_metadata = rule.get('filename_metadata', {})
    extracted = {}
    
    for field, value in filename_metadata.items():
        print(f"  {field}: {value}")
        if field == 'custom_fields' and isinstance(value, dict):
            extracted[field] = [{'name': k, 'value': v} for k, v in value.items()]
        elif field == 'tags' and isinstance(value, list):
            extracted[field] = value
        else:
            extracted[field] = value
    
    print()
    print("🔍 STEP 2: DYNAMIC PATTERN MATCHING")
    print("-" * 40)
    
    # Step 2: Process filename patterns
    filename_patterns = rule.get('filename_patterns', [])
    
    for i, pattern_config in enumerate(filename_patterns, 1):
        print(f"  Pattern {i}:")
        pattern = pattern_config['pattern']
        print(f"    Regex: {pattern}")
        
        # Apply the pattern
        match = re.search(pattern, filename, re.IGNORECASE)
        
        if match:
            print(f"    ✅ Match found!")
            print(f"    Full match: '{match.group(0)}'")
            
            if match.groups():
                for group_num, group_value in enumerate(match.groups(), 1):
                    print(f"    Group {group_num}: '{group_value}'")
            
            # Extract date if specified
            if 'date_group' in pattern_config:
                date_group = pattern_config['date_group']
                print(f"    Date extraction from group {date_group}:")
                
                if len(match.groups()) >= date_group:
                    date_str = match.group(date_group)
                    date_format = pattern_config.get('date_format', '%Y-%m')
                    print(f"      Raw date: '{date_str}'")
                    print(f"      Date format: '{date_format}'")
                    
                    try:
                        parsed_date = datetime.strptime(date_str, date_format)
                        iso_date = parsed_date.strftime('%Y-%m-%d')
                        extracted['date_created'] = iso_date
                        print(f"      ✅ Parsed to ISO: '{iso_date}'")
                    except ValueError as e:
                        print(f"      ❌ Date parsing failed: {e}")
        else:
            print(f"    ❌ No match")
        
        print()
    
    print("📊 STEP 3: FINAL EXTRACTED METADATA")
    print("-" * 40)
    
    for field, value in extracted.items():
        print(f"  {field}: {value}")
    
    print()
    print("🏗️ WHERE THIS HAPPENS IN THE CODE")
    print("-" * 40)
    print("1. Rule Loading: rule_loader.py loads YAML configuration")
    print("2. Pattern Processing: metadata_processor.py extract_filename_metadata()")
    print("3. Date Parsing: metadata_processor.py parse_date()")
    print("4. Integration: processor_pipeline.py orchestrates the workflow")
    
    return extracted

def show_code_locations():
    """Show where filename decoding happens in the codebase"""
    
    print()
    print("🗂️ CODE STRUCTURE FOR FILENAME DECODING")
    print("=" * 60)
    
    locations = [
        {
            'file': 'metadata_processor.py',
            'method': 'extract_filename_metadata()',
            'lines': '65-100',
            'purpose': 'Main filename processing logic'
        },
        {
            'file': 'metadata_processor.py', 
            'method': 'parse_date()',
            'lines': '117-125',
            'purpose': 'Date string parsing with format validation'
        },
        {
            'file': 'processor_pipeline.py',
            'method': 'extract_metadata()',
            'lines': '~350-400',
            'purpose': 'Orchestrates filename metadata extraction'
        },
        {
            'file': 'rules/*.yaml',
            'method': 'filename_metadata + filename_patterns',
            'lines': 'varies',
            'purpose': 'Configuration defining extraction rules'
        }
    ]
    
    for location in locations:
        print(f"📁 {location['file']}")
        print(f"   Method: {location['method']}")
        print(f"   Lines: {location['lines']}")
        print(f"   Purpose: {location['purpose']}")
        print()

def show_pattern_examples():
    """Show different pattern examples for various filename formats"""
    
    print("🎨 PATTERN EXAMPLES FOR DIFFERENT FILENAME FORMATS")
    print("=" * 60)
    
    examples = [
        {
            'filename': '2025-05-19-NL89RABO0330689592',
            'pattern': r'(\d{4}-\d{2}-\d{2})-NL89RABO\d{10}',
            'extracts': 'Date: 2025-05-19, Bank: RABO, Account: validated'
        },
        {
            'filename': 'Invoice_2024-12-25_Company-ABC_EUR-1234.pdf',
            'pattern': r'Invoice_(\d{4}-\d{2}-\d{2})_([^_]+)_EUR-(\d+)',
            'extracts': 'Date: 2024-12-25, Company: Company-ABC, Amount: 1234'
        },
        {
            'filename': 'Statement-Q4-2024-Rabobank.pdf',
            'pattern': r'Statement-Q(\d)-(\d{4})-([^.]+)',
            'extracts': 'Quarter: 4, Year: 2024, Bank: Rabobank'
        }
    ]
    
    for example in examples:
        print(f"Filename: {example['filename']}")
        print(f"Pattern:  {example['pattern']}")
        print(f"Extracts: {example['extracts']}")
        
        # Test the pattern
        match = re.search(example['pattern'], example['filename'])
        if match:
            print(f"Groups:   {match.groups()}")
        print("-" * 40)

if __name__ == "__main__":
    demonstrate_filename_decoding()
    show_code_locations()
    show_pattern_examples()