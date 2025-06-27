#!/usr/bin/env python3

from config import Config
from api_client import PaperlessAPIClient

def debug_paperless_document():
    """Debug what data is actually in Paperless for document 683"""
    
    config = Config()
    if not config.validate():
        print("Configuration validation failed")
        return
    
    client = PaperlessAPIClient(config)
    
    # Test connection
    if not client.test_connection():
        print("Failed to connect to Paperless API")
        return
    
    print("Successfully connected to Paperless API")
    print()
    
    # Get document 683
    documents = client.get_documents(document_id=683)
    if not documents:
        print("Document 683 not found")
        return
    
    doc = documents[0]
    print("Raw Paperless document data:")
    print(f"ID: {doc.get('id')}")
    print(f"Title: {doc.get('title')}")
    print(f"Correspondent: {doc.get('correspondent')} (type: {type(doc.get('correspondent'))})")
    print(f"Document Type: {doc.get('document_type')} (type: {type(doc.get('document_type'))})")
    print(f"Tags: {doc.get('tags')} (type: {type(doc.get('tags'))})")
    print(f"Created: {doc.get('created')}")
    print()
    
    # Test correspondent name resolution
    if doc.get('correspondent'):
        print("Testing correspondent name resolution...")
        correspondents = client.get_all_correspondents()
        print(f"All correspondents: {correspondents}")
        print(f"Total correspondents found: {len(correspondents)}")
        
        # Test direct API call to see pagination
        import requests
        session = requests.Session()
        session.headers.update({"Authorization": f"Token {client.config.paperless_token}"})
        
        print("\nTesting direct API call for correspondents:")
        response = session.get(f"{client.config.paperless_url}/api/correspondents/")
        response.raise_for_status()
        api_data = response.json()
        print(f"API response keys: {api_data.keys()}")
        print(f"Total count from API: {api_data.get('count', 'N/A')}")
        print(f"Results in this page: {len(api_data.get('results', []))}")
        
        # Look for ID 1 specifically
        for corr in api_data.get('results', []):
            if corr['id'] == 1:
                print(f"Found correspondent ID 1: {corr['name']}")
                break
        else:
            print("Correspondent ID 1 not found in first page")
            
        corr_id = doc.get('correspondent')
        if corr_id in correspondents.values():
            corr_name = [name for name, id in correspondents.items() if id == corr_id]
            print(f"Correspondent ID {corr_id} resolves to: {corr_name}")
        else:
            print(f"Correspondent ID {corr_id} not found in correspondents mapping")
    else:
        print("No correspondent set in Paperless document")

if __name__ == "__main__":
    debug_paperless_document()