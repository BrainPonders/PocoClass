#!/usr/bin/env python3
"""
Simple IBAN Pattern Debug
"""

import re
from config import Config
from api_client import PaperlessAPIClient

def debug_iban_pattern():
    config = Config()
    api_client = PaperlessAPIClient(config)
    
    # Get document content
    content = api_client.get_document_content(683)
    
    if not content:
        print("Failed to fetch content")
        return
    
    # Find all occurrences of NL89 in the content
    print("Looking for IBAN patterns in document 683:")
    print("="*60)
    
    # Search for NL89 occurrences
    for match in re.finditer(r'NL89[^a-zA-Z]*', content, re.IGNORECASE):
        start = match.start()
        end = start + 40  # Show 40 characters after NL89
        context = content[start:end]
        print(f"Found at position {start}: '{context}'")
    
    print("\nTesting specific patterns:")
    print("-" * 40)
    
    # Test the exact patterns
    patterns = [
        r"NL89 ?RABO[0-9\s]{7,9}592",     # Original (broken)
        r"NL89 ?RABO[0-9\s]{9,12}592",    # Modified (still broken)
        r"NL89 ?RABO[0-9\s]{9,12}[0-9]{2}", # Fixed pattern
        r"NL89\s+RABO\s+[0-9\s]+[0-9]{2}", # Alternative flexible
        r"NL89.*RABO.*92"                 # Match ending in 92
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        print(f"Pattern '{pattern}': {len(matches)} matches")
        if matches:
            for match in matches:
                print(f"  Match: '{match}'")

if __name__ == "__main__":
    debug_iban_pattern()