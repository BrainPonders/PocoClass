#!/usr/bin/env python3
"""
Test Environment Setup for Post-Consumption Script
Creates a sample environment to demonstrate the workflow
"""

import os
import json
from pathlib import Path

def create_test_environment():
    """Create test environment variables and sample data"""
    
    # Set test environment variables
    os.environ['PAPERLESS_URL'] = 'http://localhost:8000'
    os.environ['PAPERLESS_TOKEN'] = 'test_token_12345'
    os.environ['FILTER_TAG_INCLUDE'] = 'NEW'
    os.environ['FILTER_TAG_EXCLUDE'] = 'POCO'
    os.environ['POCO_TAG_NAME'] = 'POCO'
    os.environ['RULES_DIRECTORY'] = 'rules'
    os.environ['GLOBAL_THRESHOLD'] = '70'
    os.environ['POCO_THRESHOLD'] = '60'
    os.environ['POCO_SCORE_FIELD'] = 'POCO Score'
    os.environ['DOCUMENT_CATEGORY_FIELD'] = 'Document Category'
    
    print("Test environment configured with:")
    print(f"  Paperless URL: {os.environ['PAPERLESS_URL']}")
    print(f"  Filter tags: Include '{os.environ['FILTER_TAG_INCLUDE']}', Exclude '{os.environ['FILTER_TAG_EXCLUDE']}'")
    print(f"  Rules directory: {os.environ['RULES_DIRECTORY']}")
    print(f"  Thresholds: Global {os.environ['GLOBAL_THRESHOLD']}%, POCO {os.environ['POCO_THRESHOLD']}%")
    print()
    
    # Create sample document content for testing
    sample_content = """
    Rabobank
    Rekeningafschrift
    
    Rekeningnummer: NL89 RABO 0123 4567 592
    
    TotaalRekening
    
    Datum tot en met
    25-12-2024
    
    Totaal Afgeschreven: €1,234.56
    Totaal Bijgeschreven: €2,345.67
    
    Transacties:
    23-12-2024  Storting           +€500.00
    24-12-2024  Betaling           -€123.45
    25-12-2024  Rente              +€12.34
    """
    
    # Save sample content
    Path('sample_document.txt').write_text(sample_content)
    print("Created sample document content in 'sample_document.txt'")
    print("This simulates OCR content from a Rabobank bank statement")
    print()
    
    # Display rule information
    rules_dir = Path('rules')
    if rules_dir.exists():
        rule_files = list(rules_dir.glob('*.yaml'))
        print(f"Available rules ({len(rule_files)}):")
        for rule_file in rule_files:
            if rule_file.name != 'template.yaml':
                print(f"  - {rule_file.name}")
    
    print()
    print("Test environment ready!")
    print("Note: This script requires actual Paperless-ngx API access to run fully.")
    print("The current setup demonstrates the modular architecture and CLI interface.")

if __name__ == '__main__':
    create_test_environment()