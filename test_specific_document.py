#!/usr/bin/env python3
"""
Test the rule review system with a specific document ID
"""

import sys
from config import Config
from api_client import PaperlessAPIClient

def test_with_document_id(doc_id=None):
    """Test rule review with a specific document ID from your system"""
    
    config = Config()
    client = PaperlessAPIClient(config)
    
    if not client.test_connection():
        print("Failed to connect to API")
        return
    
    if doc_id is None:
        print("Usage: python test_specific_document.py [document_id]")
        print("Let me check what document IDs are available...")
        
        # Try to get some recent documents
        try:
            # Get documents without filter restrictions
            import requests
            headers = {'Authorization': f'Token {config.paperless_token}'}
            response = requests.get(f"{config.paperless_url}/api/documents/", 
                                  headers=headers, params={'page_size': 5})
            
            if response.status_code == 200:
                data = response.json()
                documents = data.get('results', [])
                
                if documents:
                    print(f"Found {len(documents)} recent documents:")
                    for doc in documents:
                        print(f"- Document ID: {doc['id']}")
                        print(f"  Title: {doc['title'][:70]}...")
                        print(f"  Filename: {doc.get('original_file_name', 'N/A')}")
                        print()
                    
                    print(f"To test the rule review system, run:")
                    print(f"python main.py --limit-id {documents[0]['id']} --verbose --dry-run")
                    return documents[0]['id']
                else:
                    print("No documents found in your system")
                    return None
            else:
                print(f"API call failed: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Error checking documents: {e}")
            return None
    
    else:
        print(f"Testing rule review system with document ID: {doc_id}")
        # Test the document processing with this ID
        from main import main
        import sys
        
        # Override sys.argv to simulate command line arguments
        original_argv = sys.argv
        sys.argv = ['main.py', '--limit-id', str(doc_id), '--verbose', '--dry-run']
        
        try:
            main()
        except SystemExit:
            pass  # main() calls sys.exit, which is normal
        finally:
            sys.argv = original_argv

if __name__ == '__main__':
    doc_id = sys.argv[1] if len(sys.argv) > 1 else None
    if doc_id:
        doc_id = int(doc_id)
    
    result_id = test_with_document_id(doc_id)
    
    if not doc_id and result_id:
        print(f"\nNow testing with document {result_id}:")
        test_with_document_id(result_id)