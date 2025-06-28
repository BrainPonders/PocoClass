#!/usr/bin/env python3
"""
Debug Filename Metadata Extraction
Test if the original filename is being used correctly for metadata extraction
"""

from config import Config
from api_client import PaperlessAPIClient
from metadata_processor import MetadataProcessor
from rule_loader import RuleLoader
import yaml

def debug_filename_metadata():
    """Debug filename metadata extraction for document 683"""
    
    # Setup components
    config = Config()
    api_client = PaperlessAPIClient(config)
    rule_loader = RuleLoader(config.rules_directory)
    metadata_processor = MetadataProcessor()
    
    print("🔍 FILENAME METADATA EXTRACTION DEBUG")
    print("=" * 60)
    
    # Get document 683
    documents = api_client.get_documents(document_id=683)
    if not documents:
        print("❌ Document 683 not found")
        return
    
    raw_doc = documents[0]
    
    # Show filenames
    current_title = raw_doc.get('title', 'Unknown')
    original_filename = raw_doc.get('original_file_name', 'Unknown')
    
    print(f"📄 DOCUMENT FILENAMES:")
    print(f"  Current Title: {current_title}")
    print(f"  Original Filename: {original_filename}")
    print()
    
    # Load the ExampleBank rule
    rule = rule_loader.get_rule('examplebank_check_592')
    if not rule:
        print("❌ ExampleBank rule not found")
        return
    
    print("📋 FILENAME PATTERN IN RULE:")
    filename_patterns = rule.get('filename_patterns', [])
    for i, pattern_config in enumerate(filename_patterns, 1):
        print(f"  Pattern {i}: {pattern_config.get('pattern', 'No pattern')}")
    print()
    
    # Test extraction with current title
    print("🧪 TESTING WITH CURRENT TITLE:")
    print(f"  Input: {current_title}")
    result_current = metadata_processor.extract_filename_metadata(rule, current_title)
    if result_current:
        for field, value in result_current.items():
            print(f"    {field}: {value}")
    else:
        print("    No metadata extracted")
    print()
    
    # Test extraction with original filename
    print("🧪 TESTING WITH ORIGINAL FILENAME:")
    print(f"  Input: {original_filename}")
    result_original = metadata_processor.extract_filename_metadata(rule, original_filename)
    if result_original:
        for field, value in result_original.items():
            print(f"    {field}: {value}")
    else:
        print("    No metadata extracted")
    print()
    
    # Show which should be used
    print("✅ RECOMMENDATION:")
    if result_original and not result_current:
        print("  Original filename should be used - it contains extractable patterns")
    elif result_current and not result_original:
        print("  Current title should be used - it contains extractable patterns")
    elif result_original and result_current:
        print("  Both work, but original filename may provide better date matching")
    else:
        print("  Neither filename matches the patterns")

if __name__ == "__main__":
    debug_filename_metadata()