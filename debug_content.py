#!/usr/bin/env python3
"""
Debug document content retrieval
"""

import requests
from config import Config

def debug_document_content():
    """Debug content retrieval for document 683"""
    
    config = Config()
    headers = {'Authorization': f'Token {config.paperless_token}'}
    
    print("Testing document content retrieval...")
    
    # Try different content endpoints
    endpoints = [
        f"{config.paperless_url}/api/documents/683/content/",
        f"{config.paperless_url}/api/documents/683/download/",
        f"{config.paperless_url}/api/documents/683/preview/"
    ]
    
    for endpoint in endpoints:
        try:
            print(f"\nTrying: {endpoint}")
            response = requests.get(endpoint, headers=headers)
            print(f"Status: {response.status_code}")
            print(f"Content-Type: {response.headers.get('content-type', 'unknown')}")
            
            if response.status_code == 200:
                content = response.text[:500]  # First 500 chars
                print(f"Content preview: {content}")
                
                # Check if it's the actual OCR text
                if 'examplebank' in content.lower() or 'rabo' in content.lower():
                    print("✓ Found bank content!")
                    return response.text
                    
        except Exception as e:
            print(f"Error: {e}")
    
    print("\nNo suitable content found")
    return None

if __name__ == '__main__':
    content = debug_document_content()
    if content:
        print(f"\nActual content length: {len(content)}")
        # Look for ExampleBank patterns
        if 'examplebank' in content.lower():
            print("✓ Content contains ExampleBank text")
        else:
            print("✗ Content does not contain ExampleBank text")