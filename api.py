"""
POCOmeta REST API
Provides API endpoints for the POCOclass frontend
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import yaml
import json
from datetime import datetime
from pathlib import Path
import logging

from rule_loader import RuleLoader
from api_client import PaperlessAPIClient
from config import Config

app = Flask(__name__, static_folder='frontend/dist', static_url_path='')
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize components
config = Config()
rule_loader = RuleLoader('rules')
paperless_api = PaperlessAPIClient(config)

# Serve React App
@app.route('/')
@app.route('/<path:path>')
def serve_react_app(path=''):
    static_folder = app.static_folder or 'frontend/dist'
    if path and os.path.exists(os.path.join(static_folder, path)):
        return send_from_directory(static_folder, path)
    return send_from_directory(static_folder, 'index.html')

# Rule Endpoints
@app.route('/api/rules', methods=['GET'])
def list_rules():
    """List all rules"""
    try:
        rules = rule_loader.load_all_rules()
        order_by = request.args.get('order_by', '-created_date')
        
        # Convert rules to API format
        rules_list = []
        for rule_id, rule_data in rules.items():
            rules_list.append({
                'id': rule_id,
                'ruleName': rule_data.get('rule_name', rule_id),
                'ruleId': rule_id,
                'description': rule_data.get('description', ''),
                'status': rule_data.get('status', 'draft'),
                'threshold': rule_data.get('threshold', 75),
                'ocrThreshold': rule_data.get('ocr_threshold', 75),
                'created_date': rule_data.get('created_date', datetime.now().isoformat()),
                **rule_data
            })
        
        # Sort rules
        if order_by.startswith('-'):
            rules_list.sort(key=lambda x: x.get(order_by[1:], ''), reverse=True)
        else:
            rules_list.sort(key=lambda x: x.get(order_by, ''))
        
        return jsonify(rules_list)
    except Exception as e:
        logger.error(f"Error listing rules: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rules/<rule_id>', methods=['GET'])
def get_rule(rule_id):
    """Get a single rule"""
    try:
        # Load single rule from file
        rule_file = Path('rules') / f'{rule_id}.yaml'
        rule_data = rule_loader.load_rule_file(rule_file)
        if not rule_data:
            return jsonify({'error': 'Rule not found'}), 404
        
        # Convert to frontend format
        frontend_rule = convert_backend_to_frontend(rule_data, rule_id)
        return jsonify(frontend_rule)
    except Exception as e:
        logger.error(f"Error getting rule {rule_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rules', methods=['POST'])
def create_rule():
    """Create a new rule"""
    try:
        rule_data = request.json
        rule_id = rule_data.get('ruleId')
        
        if not rule_id:
            return jsonify({'error': 'Rule ID is required'}), 400
        
        # Convert frontend format to backend YAML format
        backend_rule = convert_frontend_to_backend(rule_data)
        
        # Save rule
        rule_file = os.path.join('rules', f'{rule_id}.yaml')
        with open(rule_file, 'w') as f:
            yaml.dump(backend_rule, f, default_flow_style=False, sort_keys=False)
        
        return jsonify({'id': rule_id, 'message': 'Rule created successfully'})
    except Exception as e:
        logger.error(f"Error creating rule: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rules/<rule_id>', methods=['PUT'])
def update_rule(rule_id):
    """Update an existing rule"""
    try:
        rule_data = request.json
        
        # Convert frontend format to backend YAML format
        backend_rule = convert_frontend_to_backend(rule_data)
        
        # Save rule
        rule_file = os.path.join('rules', f'{rule_id}.yaml')
        with open(rule_file, 'w') as f:
            yaml.dump(backend_rule, f, default_flow_style=False, sort_keys=False)
        
        return jsonify({'id': rule_id, 'message': 'Rule updated successfully'})
    except Exception as e:
        logger.error(f"Error updating rule {rule_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rules/<rule_id>', methods=['DELETE'])
def delete_rule(rule_id):
    """Delete a rule"""
    try:
        rule_file = os.path.join('rules', f'{rule_id}.yaml')
        if os.path.exists(rule_file):
            # Move to deleted folder instead of permanent delete
            deleted_dir = os.path.join('rules', 'deleted')
            os.makedirs(deleted_dir, exist_ok=True)
            os.rename(rule_file, os.path.join(deleted_dir, f'{rule_id}.yaml'))
            return jsonify({'message': 'Rule deleted successfully'})
        return jsonify({'error': 'Rule not found'}), 404
    except Exception as e:
        logger.error(f"Error deleting rule {rule_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rules/<rule_id>/test', methods=['POST'])
def test_rule(rule_id):
    """Test a rule against a document"""
    try:
        data = request.json
        document_id = data.get('documentId')
        
        # TODO: Implement rule testing logic
        # This will use the new scoring algorithm
        
        return jsonify({
            'success': True,
            'results': {
                'poco_ocr_score': 0,
                'poco_score': 0,
                'matched': False,
                'details': {}
            }
        })
    except Exception as e:
        logger.error(f"Error testing rule {rule_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs', methods=['GET'])
def list_logs():
    """List logs"""
    try:
        # TODO: Implement log retrieval from log file
        return jsonify([])
    except Exception as e:
        logger.error(f"Error listing logs: {e}")
        return jsonify({'error': str(e)}), 500

def convert_frontend_to_backend(frontend_data):
    """Convert frontend rule format to backend YAML format"""
    backend = {
        'rule_name': frontend_data.get('ruleName', ''),
        'description': frontend_data.get('description', ''),
        'threshold': frontend_data.get('threshold', 75),
        'ocr_threshold': frontend_data.get('ocrThreshold', 75),
        'ocr_multiplier': frontend_data.get('ocrMultiplier', 3),
        'filename_multiplier': frontend_data.get('filenameMultiplier', 1),
        'verification_multiplier': frontend_data.get('verificationMultiplier', 0.5),
        'status': frontend_data.get('status', 'draft'),
    }
    
    # OCR Identifiers
    if frontend_data.get('ocrIdentifiers'):
        backend['logic_groups'] = []
        for group in frontend_data['ocrIdentifiers']:
            backend_group = {
                'type': group.get('type', 'match'),
                'mandatory': group.get('mandatory', False),
                'patterns': []
            }
            for condition in group.get('conditions', []):
                backend_group['patterns'].append({
                    'text': condition.get('pattern', ''),
                    'range': condition.get('range', '0-1600')
                })
            backend['logic_groups'].append(backend_group)
    
    # Static Metadata
    if frontend_data.get('predefinedData'):
        pd = frontend_data['predefinedData']
        backend['static_metadata'] = {}
        if pd.get('correspondent'):
            backend['static_metadata']['correspondent'] = pd['correspondent']
        if pd.get('documentType'):
            backend['static_metadata']['document_type'] = pd['documentType']
        if pd.get('tags'):
            backend['static_metadata']['tags'] = pd['tags']
        if pd.get('documentCategory'):
            backend['static_metadata']['custom_fields'] = {
                'Document Category': pd['documentCategory']
            }
    
    # Dynamic Metadata
    if frontend_data.get('dynamicData', {}).get('extractionRules'):
        backend['dynamic_metadata'] = {}
        for rule in frontend_data['dynamicData']['extractionRules']:
            target = rule.get('targetField')
            if target == 'dateCreated':
                backend['dynamic_metadata']['date_created'] = {
                    'pattern_before': rule.get('beforeAnchor', {}).get('pattern', ''),
                    'pattern_after': rule.get('afterAnchor', {}).get('pattern', ''),
                    'format': rule.get('dateFormat', '')
                }
            elif target == 'tags':
                if 'extracted_tags' not in backend['dynamic_metadata']:
                    backend['dynamic_metadata']['extracted_tags'] = []
                backend['dynamic_metadata']['extracted_tags'].append({
                    'pattern': rule.get('regexPattern', ''),
                    'value': rule.get('tagValue', '')
                })
    
    # Filename Patterns
    if frontend_data.get('filenamePatterns'):
        backend['filename_patterns'] = frontend_data['filenamePatterns'].get('patterns', [])
    
    # Verification
    if frontend_data.get('verification'):
        backend['verification_fields'] = list(frontend_data['verification'].get('enabledFields', {}).keys())
    
    return backend

def convert_backend_to_frontend(backend_data, rule_id):
    """Convert backend YAML format to frontend format"""
    frontend = {
        'ruleId': rule_id,
        'ruleName': backend_data.get('rule_name', rule_id),
        'description': backend_data.get('description', ''),
        'threshold': backend_data.get('threshold', 75),
        'ocrThreshold': backend_data.get('ocr_threshold', 75),
        'ocrMultiplier': backend_data.get('ocr_multiplier', 3),
        'filenameMultiplier': backend_data.get('filename_multiplier', 1),
        'verificationMultiplier': backend_data.get('verification_multiplier', 0.5),
        'status': backend_data.get('status', 'draft'),
        'ocrIdentifiers': [],
        'predefinedData': {},
        'dynamicData': {'extractionRules': []},
        'filenamePatterns': {'patterns': [], 'dateFormats': []},
        'verification': {'enabledFields': {}}
    }
    
    # Convert logic groups to OCR identifiers
    if backend_data.get('logic_groups'):
        for group in backend_data['logic_groups']:
            frontend_group = {
                'type': group.get('type', 'match'),
                'mandatory': group.get('mandatory', False),
                'conditions': []
            }
            for pattern in group.get('patterns', []):
                frontend_group['conditions'].append({
                    'pattern': pattern.get('text', ''),
                    'range': pattern.get('range', '0-1600')
                })
            frontend['ocrIdentifiers'].append(frontend_group)
    
    # Static metadata
    if backend_data.get('static_metadata'):
        sm = backend_data['static_metadata']
        frontend['predefinedData'] = {
            'correspondent': sm.get('correspondent', ''),
            'documentType': sm.get('document_type', ''),
            'tags': sm.get('tags', []),
            'documentCategory': sm.get('custom_fields', {}).get('Document Category', '')
        }
    
    # Filename patterns
    if backend_data.get('filename_patterns'):
        frontend['filenamePatterns']['patterns'] = backend_data['filename_patterns']
    
    return frontend

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
