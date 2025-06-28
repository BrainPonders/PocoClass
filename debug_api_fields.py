#!/usr/bin/env python3
"""
Debug API Fields
Check what fields are available in the Paperless API response for document metadata
"""

from config import Config
from api_client import PaperlessAPIClient
import json

def debug_api_fields():
    """Debug available fields in API response"""
    
    config = Config()
    api_client = PaperlessAPIClient(config)
    
    # Test connection
    if not api_client.test_connection():
        print("❌ Failed to connect to Paperless API")
        return
    
    # Get document 683
    documents = api_client.get_documents(document_id=683)
    
    if not documents:
        print("❌ No documents found")
        return
    
    doc = documents[0]
    
    print("📋 AVAILABLE API FIELDS FOR DOCUMENT 683:")
    print("=" * 60)
    
    # Print all available fields
    for key, value in doc.items():
        if isinstance(value, (str, int, float, bool)):
            print(f"{key}: {value}")
        elif isinstance(value, list) and len(value) < 5:
            print(f"{key}: {value}")
        elif isinstance(value, dict) and len(value) < 5:
            print(f"{key}: {value}")
        else:
            print(f"{key}: <{type(value).__name__}> (length: {len(value) if hasattr(value, '__len__') else 'N/A'})")
    
    print()
    print("📄 FILENAME-RELATED FIELDS:")
    print("-" * 40)
    
    filename_fields = [
        'title', 'original_filename', 'filename', 'archive_filename', 
        'created_date', 'modified', 'added', 'archive_serial_number'
    ]
    
    for field in filename_fields:
        if field in doc:
            print(f"{field}: {doc[field]}")
        else:
            print(f"{field}: <not available>")

if __name__ == "__main__":
    debug_api_fields()