#!/usr/bin/env python3
"""
Test with real documents from Paperless system
"""

from config import Config
from api_client import PaperlessAPIClient

def check_available_documents():
    """Check what documents are available in the system"""
    
    config = Config()
    client = PaperlessAPIClient(config)
    
    if not client.test_connection():
        print("Failed to connect to API")
        return
    
    print("Checking available documents...")
    
    # Get all tags first
    all_tags = client.get_all_tags()
    print(f"Available tags: {list(all_tags.keys())}")
    
    # Check for documents with Check Account tag (matches our Rabobank rule)
    if 'Check Account' in all_tags:
        check_tag_id = all_tags['Check Account']
        print(f"Check Account tag ID: {check_tag_id}")
        
        # Get recent documents
        documents = client.get_documents(limit=10)
        print(f"Total documents found: {len(documents)}")
        
        if documents:
            print("\nRecent documents:")
            for i, doc in enumerate(documents[:5]):
                print(f"{i+1}. ID: {doc['id']}, Title: {doc['title'][:60]}...")
                tag_names = [tag['name'] for tag in doc.get('tags', [])]
                print(f"   Tags: {tag_names}")
                print(f"   Filename: {doc.get('original_file_name', 'N/A')}")
                print()
        
        # Find a document that might match Rabobank patterns
        bank_docs = []
        for doc in documents:
            title = doc['title'].lower()
            filename = doc.get('original_file_name', '').lower()
            if 'rabo' in title or 'rabo' in filename or 'bank' in title:
                bank_docs.append(doc)
        
        if bank_docs:
            print(f"Found {len(bank_docs)} potential bank documents:")
            for doc in bank_docs[:3]:
                print(f"- ID: {doc['id']}, Title: {doc['title']}")
        else:
            print("No obvious bank documents found, but we can test with any document")
            
    else:
        print("Check Account tag not found")
        # Just get some documents to test with
        documents = client.get_documents(limit=5)
        if documents:
            print(f"Testing with first available document: ID {documents[0]['id']}")

if __name__ == '__main__':
    check_available_documents()