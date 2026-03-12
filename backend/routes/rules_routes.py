"""Rule CRUD, rule conversion helpers, and rule test/execute routes."""

import os
import re
from datetime import datetime
from pathlib import Path

import yaml
from flask import Blueprint, jsonify, request

from backend.api_client import PaperlessAPIClient
from backend.config import Config
from backend.routes.auth_users import require_admin, require_auth

rules_bp = Blueprint("rules", __name__)

db = None
logger = None
rule_loader = None
test_engine = None

RULES_DIR = Path("rules")
DELETED_RULES_DIR = RULES_DIR / "deleted"
RULE_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$")


def normalize_logic_group_scores(logic_groups):
    """Assign integer scores that always sum to exactly 100."""
    count = len(logic_groups)
    if count == 0:
        return []

    base = 100 // count
    remainder = 100 % count

    normalized = []
    for idx, group in enumerate(logic_groups):
        normalized_group = dict(group)
        normalized_group["score"] = base + (1 if idx < remainder else 0)
        normalized.append(normalized_group)
    return normalized


def is_valid_rule_id(rule_id):
    """Allow only safe rule IDs that can map to local filenames."""
    return isinstance(rule_id, str) and bool(RULE_ID_PATTERN.fullmatch(rule_id))


def resolve_rule_path(rule_id, deleted=False):
    """Resolve a rule file path safely within the allowed rules directory."""
    if not is_valid_rule_id(rule_id):
        raise ValueError(
            "Invalid rule ID. Use letters, numbers, underscore, and hyphen only."
        )

    base_dir = DELETED_RULES_DIR if deleted else RULES_DIR
    base_resolved = base_dir.resolve()
    rule_path = (base_dir / f"{rule_id}.yaml").resolve()

    if base_resolved not in rule_path.parents:
        raise ValueError("Invalid rule path")

    return rule_path
# ---- Rule Management Routes ----

@rules_bp.route('/api/rules', methods=['GET'])
@require_auth
def list_rules():
    """List all rules"""
    try:
        rules = rule_loader.load_all_rules()
        order_by = request.args.get('order_by', '-created_date')
        
        # Convert rules to frontend format (same as get_rule endpoint)
        rules_list = []
        for rule_id, rule_data in rules.items():
            # Convert to frontend format to ensure consistency with get_rule endpoint
            frontend_rule = convert_backend_to_frontend(rule_data, rule_id)
            # Add id and created_date for list display
            frontend_rule['id'] = rule_id
            frontend_rule['created_date'] = rule_data.get('created_date', datetime.now().isoformat())
            rules_list.append(frontend_rule)
        
        # Sort rules (convert snake_case to camelCase for sorting)
        sort_field_map = {
            'created_date': 'created_date',
            'rule_name': 'ruleName',
            'status': 'status',
            'threshold': 'threshold'
        }
        
        sort_field = order_by.lstrip('-')
        sort_field = sort_field_map.get(sort_field, sort_field)
        reverse = order_by.startswith('-')
        
        rules_list.sort(key=lambda x: x.get(sort_field, ''), reverse=reverse)
        
        return jsonify(rules_list)
    except Exception as e:
        logger.error(f"Error listing rules: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@rules_bp.route('/api/rules/errors', methods=['GET'])
@require_auth
def get_rule_errors():
    """Get rule loading errors"""
    try:
        errors = rule_loader.get_load_errors()
        has_errors = rule_loader.has_load_errors()
        
        return jsonify({
            'has_errors': has_errors,
            'errors': errors,
            'error_count': len(errors)
        })
    except Exception as e:
        logger.error(f"Error getting rule errors: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@rules_bp.route('/api/rules/<rule_id>', methods=['GET'])
@require_auth
def get_rule(rule_id):
    """Get a single rule"""
    try:
        try:
            rule_file = resolve_rule_path(rule_id)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        # Load single rule from file
        rule_data = rule_loader.load_rule_file(rule_file)
        if not rule_data:
            return jsonify({'error': 'Rule not found'}), 404
        
        # Convert to frontend format
        frontend_rule = convert_backend_to_frontend(rule_data, rule_id)
        return jsonify(frontend_rule)
    except Exception as e:
        logger.error(f"Error getting rule {rule_id}: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def escape_yaml_string(value):
    """
    Escape special characters for YAML single-quoted strings.
    Single quotes preserve backslashes literally, avoiding YAML escape sequence interpretation.
    Only single quotes need to be escaped by doubling them.
    """
    if not value:
        return value
    # In single-quoted YAML strings, single quotes are escaped by doubling them (' -> '')
    value = value.replace("'", "''")
    return value

def validate_yaml_content(yaml_content):
    """
    Validate that generated YAML can be parsed correctly.
    Returns (is_valid, error_message) tuple.
    """
    try:
        yaml.safe_load(yaml_content)
        return (True, None)
    except yaml.YAMLError as e:
        error_msg = str(e)
        # Extract line and column information if available
        if hasattr(e, 'problem_mark'):
            mark = e.problem_mark
            error_msg = f"YAML validation error at line {mark.line + 1}, column {mark.column + 1}: {e.problem}"
        logger.error(f"YAML validation failed: {error_msg}")
        return (False, error_msg)
    except Exception as e:
        logger.error(f"Unexpected error during YAML validation: {e}")
        return (False, f"Validation error: {str(e)}")

def generate_formatted_yaml(frontend_data, user_name='System'):
    """Generate formatted YAML with comments matching the preview"""
    creation_date = datetime.now().strftime('%Y-%m-%d')
    rule_name = frontend_data.get('ruleName', 'Unnamed Rule')
    rule_id = frontend_data.get('ruleId', '')
    description = frontend_data.get('description', '')
    threshold = frontend_data.get('threshold', 75)
    ocr_threshold = frontend_data.get('ocrThreshold', 75)
    ocr_multiplier = frontend_data.get('ocrMultiplier', 3)
    filename_multiplier = frontend_data.get('filenameMultiplier', 1)
    
    # Handle verification multiplier config (new format) or legacy single value
    verification_multiplier_config = frontend_data.get('verificationMultiplierConfig')
    if verification_multiplier_config:
        verification_multiplier_mode = verification_multiplier_config.get('mode', 'auto')
        verification_multiplier = verification_multiplier_config.get('value', 0.5)
    else:
        # Legacy format: single value defaults to auto mode
        verification_multiplier = frontend_data.get('verificationMultiplier', 0.5)
        verification_multiplier_mode = 'auto'
    
    yaml_content = f"""# =================================================================================================
# PocoClass Document Classification Rule
# =================================================================================================
# This YAML file was generated using the PocoClass Rule Builder wizard.
# Each section below corresponds to a step in the 6-step configuration process.
#
# Created: {creation_date}
# Created by: {user_name}
# Rule Name: {rule_name}
# =================================================================================================

# =============================
# STEP 1: BASIC INFORMATION
# =============================
# General rule identification and threshold settings

rule_name: "{rule_name}"
rule_id: "{rule_id}"
description: "{description}"

# POCO Score Requirement: Minimum overall confidence score required for document classification
# This combines scores from OCR content, filename patterns, and Paperless Placeholder Verification
threshold: {threshold}  # {threshold}% minimum confidence

# Source Document ID: Original Paperless document used to create this rule (for OCR/PDF preview)
source_document_id: {frontend_data.get('sourceDocumentId', '')}

"""
    
    # Step 2: OCR Identifiers
    ocr_identifiers = frontend_data.get('ocrIdentifiers', [])
    if ocr_identifiers:
        yaml_content += f"""# =============================
# STEP 2: OCR IDENTIFIERS
# =============================
# Text patterns found in document content that help identify the document type
# Each logic group can contain multiple patterns with different matching rules

# OCR Score Requirement: Minimum percentage of OCR patterns that must match
ocr_threshold: {ocr_threshold}  # {ocr_threshold}% minimum match rate

# OCR Weight Multiplier: Controls importance of OCR content in final POCO score
ocr_multiplier: {ocr_multiplier}  # {ocr_multiplier}× weight

core_identifiers:
  logic_groups:
"""
        normalized_groups = normalize_logic_group_scores(ocr_identifiers)
        for idx, group in enumerate(normalized_groups, 1):
            group_type = group.get('type', 'match')
            mandatory = 'true' if group.get('mandatory', False) else 'false'
            
            yaml_content += f"""    # Logic Group {idx}
    - type: {group_type}     # Match type: 'match' (OR) or 'match_all' (AND)
      score: {group.get('score', 0)}
      mandatory: {mandatory}  # Must match for rule to succeed
      conditions:
"""
            for condition in group.get('conditions', []):
                pattern = escape_yaml_string(condition.get('pattern', ''))
                range_val = condition.get('range', '0-1600')
                yaml_content += f"""        - pattern: '{pattern}'    # Search pattern (text or regex)
          source: content
          range: "{range_val}"        # Search area
"""
    else:
        yaml_content += """# =============================
# STEP 2: OCR IDENTIFIERS
# =============================
# No OCR identifiers configured

"""
    
    # Step 3: Document Classifications
    predefined = frontend_data.get('predefinedData', {})
    dynamic = frontend_data.get('dynamicData', {})
    
    yaml_content += """
# =============================
# STEP 3: DOCUMENT CLASSIFICATIONS
# =============================
# Static metadata and dynamic data extraction rules

static_metadata:
"""
    yaml_content += f"""  correspondent: "{predefined.get('correspondent', '')}"
  document_type: "{predefined.get('documentType', '')}"
"""
    tags = predefined.get('tags', [])
    if tags:
        escaped_tags = [f"'{escape_yaml_string(tag)}'" for tag in tags]
        yaml_content += f"""  tags: [{', '.join(escaped_tags)}]
"""
    
    # Add custom fields if present
    custom_fields = predefined.get('customFields', {})
    if custom_fields and any(v for v in custom_fields.values() if v):
        yaml_content += """  custom_fields:
"""
        for field_name, field_value in custom_fields.items():
            if field_value:
                escaped_value = escape_yaml_string(str(field_value))
                yaml_content += f"""    {field_name}: '{escaped_value}'
"""
    
    extraction_rules = dynamic.get('extractionRules', [])
    
    # Always write dynamic_metadata section if there are extraction rules
    if extraction_rules:
        yaml_content += """
dynamic_metadata:
"""
        # Separate different types of extraction rules
        date_rules = [r for r in extraction_rules if r.get('extractionType') == 'date']
        tag_rules = [r for r in extraction_rules if r.get('extractionType') == 'text' and r.get('targetField') == 'tags']
        custom_field_rules = [r for r in extraction_rules if r.get('extractionType') == 'text' and r.get('targetField') not in ['tags', 'dateCreated']]
        
        content_written = False
        
        # Handle date extraction (including date-type custom fields)
        for rule in date_rules:
            target_field = rule.get('targetField', '')
            # Map frontend field names to backend YAML field names
            if target_field == 'dateCreated':
                target_field = 'date_created'
            
            before_anchor = escape_yaml_string(rule.get('beforeAnchor', {}).get('pattern', ''))
            after_anchor = escape_yaml_string(rule.get('afterAnchor', {}).get('pattern', ''))
            date_format = rule.get('dateFormat', 'DD-MM-YYYY')
            
            yaml_content += f"""  {target_field}:
    pattern_before: '{before_anchor}'
    pattern_after: '{after_anchor}'
    format: {date_format}
"""
            content_written = True
        
        # Handle custom field text extraction
        for rule in custom_field_rules:
            target_field = rule.get('targetField', '')  # Use actual field name like "Total Price"
            before_anchor = escape_yaml_string(rule.get('beforeAnchor', {}).get('pattern', ''))
            after_anchor = escape_yaml_string(rule.get('afterAnchor', {}).get('pattern', ''))
            
            yaml_content += f"""  {target_field}:
    pattern_before: '{before_anchor}'
    pattern_after: '{after_anchor}'
"""
            content_written = True
        
        # Handle tag extraction
        if tag_rules:
            yaml_content += """  extracted_tags:
"""
            for rule in tag_rules:
                regex_pattern = escape_yaml_string(rule.get('regexPattern', ''))
                tag_value = escape_yaml_string(rule.get('tagValue', ''))
                prefix = escape_yaml_string(rule.get('prefix', ''))
                
                yaml_content += f"""    - pattern: '{regex_pattern}'
      value: '{tag_value}'
"""
                if prefix:
                    yaml_content += f"""      prefix: '{prefix}'
"""
            content_written = True
        
        # If no content was written, make it an empty dict to avoid null
        if not content_written:
            # Remove the "dynamic_metadata:\n" and replace with empty dict
            yaml_content = yaml_content.rstrip()
            if yaml_content.endswith('dynamic_metadata:'):
                yaml_content = yaml_content[:-len('dynamic_metadata:')] + 'dynamic_metadata: {}\n'
    else:
        # No extraction rules at all - write empty dict
        yaml_content += """
dynamic_metadata: {}
"""
    
    # Step 4: Filename Patterns
    yaml_content += f"""
# =============================
# STEP 4: FILENAME IDENTIFICATION  
# =============================
# Patterns that identify documents by filename

filename_multiplier: {filename_multiplier}  # {filename_multiplier}× weight

filename_patterns:
"""
    filename_patterns = frontend_data.get('filenamePatterns', {}).get('patterns', [])
    if filename_patterns and any(p for p in filename_patterns if p):
        for pattern in filename_patterns:
            if pattern:
                escaped_pattern = escape_yaml_string(pattern)
                yaml_content += f"""  - '{escaped_pattern}'
"""
    else:
        yaml_content += """  # No filename patterns configured
"""
    
    # Step 5: Verification
    yaml_content += f"""
# =============================
# STEP 5: PAPERLESS DATA VERIFICATION
# =============================
# Paperless placeholder fields to verify for additional confidence

# Verification Weight Multiplier: Controls importance of placeholder verification
# Mode: 'auto' = dynamic neutraliser (1 / number_of_enabled_fields), 'manual' = fixed multiplier
verification_multiplier_mode: "{verification_multiplier_mode}"  # auto or manual
verification_multiplier: {verification_multiplier}  # {'Auto-adjusted (neutraliser)' if verification_multiplier_mode == 'auto' else f'{verification_multiplier}× weight'}

verification_fields:
"""
    enabled_fields = frontend_data.get('verification', {}).get('enabledFields', {})
    enabled_list = [field for field, enabled in enabled_fields.items() if enabled]
    if enabled_list:
        for field in enabled_list:
            yaml_content += f"""  - {field}
"""
    else:
        yaml_content += """  # No verification fields enabled
"""
    
    # Status
    status = frontend_data.get('status', 'draft')
    yaml_content += f"""
status: {status}
"""
    
    return yaml_content

@rules_bp.route('/api/rules', methods=['POST'])
@require_auth
def create_rule():
    """Create a new rule"""
    try:
        rule_data = request.json
        rule_id = rule_data.get('ruleId')
        
        if not rule_id:
            return jsonify({'error': 'Rule ID is required'}), 400
        if not is_valid_rule_id(rule_id):
            return jsonify({'error': 'Invalid Rule ID format'}), 400
        
        # Get current user for attribution
        session = request.current_user
        user_name = 'System'
        if session:
            user_name = session.get('paperless_username', 'Unknown User')
        
        # Generate formatted YAML with comments
        formatted_yaml = generate_formatted_yaml(rule_data, user_name)
        
        # Validate YAML before saving
        is_valid, error_msg = validate_yaml_content(formatted_yaml)
        if not is_valid:
            logger.error(f"Failed to create rule {rule_id}: {error_msg}")
            return jsonify({'error': f'Invalid YAML generated: {error_msg}'}), 400
        
        # Save rule
        rule_file = resolve_rule_path(rule_id)
        with open(rule_file, 'w', encoding='utf-8') as f:
            f.write(formatted_yaml)
        
        return jsonify({'id': rule_id, 'message': 'Rule created successfully'})
    except Exception as e:
        logger.error(f"Error creating rule: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@rules_bp.route('/api/rules/<rule_id>', methods=['PUT'])
@require_auth
def update_rule(rule_id):
    """Update an existing rule"""
    try:
        if not is_valid_rule_id(rule_id):
            return jsonify({'error': 'Invalid Rule ID format'}), 400

        rule_data = request.json
        
        # Get current user for attribution
        session = request.current_user
        user_name = 'System'
        if session:
            user_name = session.get('paperless_username', 'Unknown User')
        
        # Generate formatted YAML with comments
        formatted_yaml = generate_formatted_yaml(rule_data, user_name)
        
        # Validate YAML before saving
        is_valid, error_msg = validate_yaml_content(formatted_yaml)
        if not is_valid:
            logger.error(f"Failed to update rule {rule_id}: {error_msg}")
            return jsonify({'error': f'Invalid YAML generated: {error_msg}'}), 400
        
        new_rule_id = rule_data.get('ruleId', rule_id)
        if not is_valid_rule_id(new_rule_id):
            return jsonify({'error': 'Invalid Rule ID format'}), 400

        old_rule_file = resolve_rule_path(rule_id)
        new_rule_file = resolve_rule_path(new_rule_id)
        
        if new_rule_id != rule_id:
            if os.path.exists(new_rule_file):
                return jsonify({'error': f'A rule with ID "{new_rule_id}" already exists'}), 409
            if os.path.exists(old_rule_file):
                os.rename(old_rule_file, new_rule_file)
            else:
                logger.warning(f"Old rule file {old_rule_file} not found during rename to {new_rule_id}")
        
        with open(new_rule_file, 'w', encoding='utf-8') as f:
            f.write(formatted_yaml)
        
        return jsonify({'id': new_rule_id, 'message': 'Rule updated successfully'})
    except Exception as e:
        logger.error(f"Error updating rule {rule_id}: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@rules_bp.route('/api/rules/<rule_id>', methods=['DELETE'])
@require_auth
def delete_rule(rule_id):
    """Delete a rule"""
    try:
        try:
            rule_file = resolve_rule_path(rule_id)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        if os.path.exists(rule_file):
            # Move to deleted folder instead of permanent delete
            deleted_dir = DELETED_RULES_DIR
            os.makedirs(deleted_dir, exist_ok=True)
            os.rename(rule_file, resolve_rule_path(rule_id, deleted=True))
            return jsonify({'message': 'Rule deleted successfully'})
        return jsonify({'error': 'Rule not found'}), 404
    except Exception as e:
        logger.error(f"Error deleting rule {rule_id}: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# ---- Deleted Rules (Trash Can) Routes ----

@rules_bp.route('/api/deleted-rules', methods=['GET'])
@require_auth
def list_deleted_rules():
    """List all deleted rules from the deleted folder"""
    try:
        deleted_dir = os.path.join('rules', 'deleted')
        if not os.path.exists(deleted_dir):
            return jsonify([])
        
        deleted_rules = []
        deleted_files = list(Path(deleted_dir).glob('*.yaml')) + list(Path(deleted_dir).glob('*.yml'))
        
        for rule_file in deleted_files:
            try:
                # Load the rule data
                rule_data = rule_loader.load_rule_file(rule_file)
                if rule_data:
                    # Get file stats for deletion date
                    stats = os.stat(rule_file)
                    deleted_date = datetime.fromtimestamp(stats.st_mtime).isoformat()
                    
                    deleted_rules.append({
                        'id': rule_file.stem,
                        'originalRuleId': rule_data.get('rule_id', rule_file.stem),
                        'ruleName': rule_data.get('rule_name', rule_file.stem),
                        'deletedDate': deleted_date,
                        'ruleData': rule_data
                    })
            except Exception as e:
                logger.error(f"Error loading deleted rule {rule_file.name}: {e}")
        
        # Sort by deleted date (newest first)
        deleted_rules.sort(key=lambda x: x.get('deletedDate', ''), reverse=True)
        
        return jsonify(deleted_rules)
    except Exception as e:
        logger.error(f"Error listing deleted rules: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@rules_bp.route('/api/deleted-rules/<rule_id>', methods=['DELETE'])
@require_admin
def permanently_delete_rule(rule_id):
    """Permanently delete a rule from the deleted folder"""
    try:
        try:
            rule_file = resolve_rule_path(rule_id, deleted=True)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        if os.path.exists(rule_file):
            os.remove(rule_file)
            return jsonify({'message': 'Rule permanently deleted'})
        return jsonify({'error': 'Deleted rule not found'}), 404
    except Exception as e:
        logger.error(f"Error permanently deleting rule {rule_id}: {e}")
        return jsonify({'error': 'Internal server error'}), 500


# ---- Rule Format Conversion Helpers ----

def convert_frontend_to_backend(frontend_data):
    """Convert frontend rule format to backend YAML format"""
    backend = {
        'rule_name': frontend_data.get('ruleName', ''),
        'rule_id': frontend_data.get('ruleId', ''),
        'description': frontend_data.get('description', ''),
        'threshold': frontend_data.get('threshold', 75),
        'ocr_threshold': frontend_data.get('ocrThreshold', 75),
        'ocr_multiplier': frontend_data.get('ocrMultiplier', 3),
        'filename_multiplier': frontend_data.get('filenameMultiplier', 1),
        'verification_multiplier': frontend_data.get('verificationMultiplierConfig', {}).get('value', frontend_data.get('verificationMultiplier', 0.5)),
        'verification_multiplier_mode': frontend_data.get('verificationMultiplierConfig', {}).get('mode', 'auto'),
        'status': frontend_data.get('status', 'draft'),
    }
    
    # Save source document ID if provided (for OCR/PDF preview when editing)
    if frontend_data.get('sourceDocumentId'):
        backend['source_document_id'] = frontend_data['sourceDocumentId']
    
    # OCR Identifiers - Use v2 format with core_identifiers
    if frontend_data.get('ocrIdentifiers'):
        backend['core_identifiers'] = {'logic_groups': []}
        normalized_groups = normalize_logic_group_scores(frontend_data['ocrIdentifiers'])

        for group in normalized_groups:
            backend_group = {
                'type': group.get('type', 'match'),
                'score': group.get('score', 0),
                'mandatory': group.get('mandatory', False),
                'conditions': []
            }
            for condition in group.get('conditions', []):
                backend_group['conditions'].append({
                    'pattern': condition.get('pattern', ''),
                    'source': 'content',
                    'range': condition.get('range', '0-1600')
                })
            backend['core_identifiers']['logic_groups'].append(backend_group)
    
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
    
    # Dynamic Metadata - Always initialize as empty dict to avoid YAML null issues
    backend['dynamic_metadata'] = {}
    
    if frontend_data.get('dynamicData', {}).get('extractionRules'):
        for rule in frontend_data['dynamicData']['extractionRules']:
            target = rule.get('targetField')
            extraction_type = rule.get('extractionType', '')
            
            if target == 'dateCreated':
                backend['dynamic_metadata']['date_created'] = {
                    'pattern_before': rule.get('beforeAnchor', {}).get('pattern', ''),
                    'pattern_after': rule.get('afterAnchor', {}).get('pattern', ''),
                    'format': rule.get('dateFormat', '')
                }
            elif target == 'tags' and extraction_type == 'text':
                if 'extracted_tags' not in backend['dynamic_metadata']:
                    backend['dynamic_metadata']['extracted_tags'] = []
                backend['dynamic_metadata']['extracted_tags'].append({
                    'pattern': rule.get('regexPattern', ''),
                    'value': rule.get('tagValue', '')
                })
            elif target and target not in ['dateCreated', 'tags']:
                # Handle custom fields (target is the actual field name like "Total Price")
                backend['dynamic_metadata'][target] = {
                    'pattern_before': rule.get('beforeAnchor', {}).get('pattern', ''),
                    'pattern_after': rule.get('afterAnchor', {}).get('pattern', ''),
                }
                # Store extraction type for data filtering
                if extraction_type:
                    backend['dynamic_metadata'][target]['extraction_type'] = extraction_type
                # Add format for date-type custom fields
                if extraction_type == 'date' and rule.get('dateFormat'):
                    backend['dynamic_metadata'][target]['format'] = rule.get('dateFormat')
    
    # Filename Patterns
    if frontend_data.get('filenamePatterns'):
        backend['filename_patterns'] = frontend_data['filenamePatterns'].get('patterns', [])
    
    # Verification - Only include fields that are actually enabled (value = True)
    if frontend_data.get('verification'):
        enabled_fields = frontend_data['verification'].get('enabledFields', {})
        backend['verification_fields'] = [k for k, v in enabled_fields.items() if v]
    
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
        'verificationMultiplierConfig': {
            'mode': backend_data.get('verification_multiplier_mode', 'auto'),
            'value': backend_data.get('verification_multiplier', 0.5)
        },
        'status': backend_data.get('status', 'draft'),
        'ocrIdentifiers': [],
        'predefinedData': {},
        'dynamicData': {'extractionRules': []},
        'filenamePatterns': {'patterns': [], 'dateFormats': []},
        'verification': {'enabledFields': {}}
    }
    
    # Load source document ID if available (for OCR/PDF preview when editing)
    if backend_data.get('source_document_id'):
        frontend['sourceDocumentId'] = backend_data['source_document_id']
    
    # Convert logic groups to OCR identifiers - Handle v2, v1, and export formats
    # v2 format (core_identifiers)
    logic_groups_data = None
    if backend_data.get('core_identifiers'):
        logic_groups_data = backend_data['core_identifiers'].get('logic_groups', [])
    # Export/legacy format (ocr_identifiers)
    elif backend_data.get('ocr_identifiers'):
        ocr_section = backend_data['ocr_identifiers']
        logic_groups_data = ocr_section.get('logic_groups', [])
        if not frontend.get('ocrThreshold') or frontend['ocrThreshold'] == 75:
            frontend['ocrThreshold'] = ocr_section.get('threshold', 75)
        if not frontend.get('ocrMultiplier') or frontend['ocrMultiplier'] == 3:
            frontend['ocrMultiplier'] = ocr_section.get('multiplier', 3)
    # v1 format fallback (logic_groups)
    elif backend_data.get('logic_groups'):
        logic_groups_data = backend_data['logic_groups']
    
    if logic_groups_data:
        for group in logic_groups_data:
            frontend_group = {
                'type': group.get('type', 'match'),
                'mandatory': group.get('mandatory', False),
                'conditions': []
            }
            # v2 format uses 'conditions' with 'pattern'
            if group.get('conditions'):
                for condition in group['conditions']:
                    frontend_group['conditions'].append({
                        'pattern': condition.get('pattern', ''),
                        'range': condition.get('range', '0-1600')
                    })
            # v1 format uses 'patterns' with 'text'
            elif group.get('patterns'):
                for pattern in group['patterns']:
                    frontend_group['conditions'].append({
                        'pattern': pattern.get('text', ''),
                        'range': pattern.get('range', '0-1600')
                    })
            frontend['ocrIdentifiers'].append(frontend_group)
    
    # Static metadata (also handle legacy 'predefined_data' key)
    sm = backend_data.get('static_metadata') or backend_data.get('predefined_data')
    if sm:
        frontend['predefinedData'] = {
            'correspondent': sm.get('correspondent', ''),
            'documentType': sm.get('document_type', ''),
            'tags': sm.get('tags', []),
            'customFields': sm.get('custom_fields', {})
        }
    
    # Dynamic metadata (extraction rules)
    if backend_data.get('dynamic_metadata'):
        dm = backend_data['dynamic_metadata']
        
        # Date extraction
        if dm.get('date_created'):
            date_rule = dm['date_created']
            
            # Handle pattern_before (new format - string) or beforeAnchor (old format - dict or string)
            before_pattern = ''
            if 'pattern_before' in date_rule:
                before_pattern = date_rule['pattern_before']
            elif 'beforeAnchor' in date_rule:
                before_anchor = date_rule['beforeAnchor']
                # Check if it's a dict with 'pattern' key or just a string
                if isinstance(before_anchor, dict):
                    before_pattern = before_anchor.get('pattern', '')
                else:
                    before_pattern = before_anchor
            
            # Handle pattern_after (new format - string) or afterAnchor (old format - dict or string)
            after_pattern = ''
            if 'pattern_after' in date_rule:
                after_pattern = date_rule['pattern_after']
            elif 'afterAnchor' in date_rule:
                after_anchor = date_rule['afterAnchor']
                # Check if it's a dict with 'pattern' key or just a string
                if isinstance(after_anchor, dict):
                    after_pattern = after_anchor.get('pattern', '')
                else:
                    after_pattern = after_anchor
            
            frontend['dynamicData']['extractionRules'].append({
                'targetField': 'dateCreated',
                'extractionType': 'date',
                'beforeAnchor': {'pattern': before_pattern},
                'afterAnchor': {'pattern': after_pattern},
                'dateFormat': date_rule.get('format', 'DD-MM-YYYY')
            })
        
        # Tag extraction
        if dm.get('extracted_tags'):
            for tag_rule in dm['extracted_tags']:
                frontend['dynamicData']['extractionRules'].append({
                    'targetField': 'tags',
                    'extractionType': 'text',
                    'regexPattern': tag_rule.get('pattern', ''),
                    'tagValue': tag_rule.get('value', ''),
                    'prefix': tag_rule.get('prefix', '')
                })
        
        # Custom field extraction (any field that's not date_created or extracted_tags)
        for field_name, field_data in dm.items():
            if field_name not in ['date_created', 'extracted_tags'] and isinstance(field_data, dict):
                # Determine extraction type based on whether format is present
                extraction_type = 'date' if field_data.get('format') else 'text'
                
                # Handle legacy customField_* format for backward compatibility
                # If field_name starts with "customField_", it's legacy format - keep as-is for now
                # New format uses actual field names like "Total Price"
                target_field_value = field_name
                
                extraction_rule = {
                    'targetField': target_field_value,  # Use actual field name like "Total Price" or legacy "customField_13"
                    'extractionType': extraction_type,
                    'beforeAnchor': {'pattern': field_data.get('pattern_before', '')},
                    'afterAnchor': {'pattern': field_data.get('pattern_after', '')}
                }
                
                # Add dateFormat for date-type custom fields
                if extraction_type == 'date':
                    extraction_rule['dateFormat'] = field_data.get('format', 'DD-MM-YYYY')
                
                frontend['dynamicData']['extractionRules'].append(extraction_rule)
    
    # Filename patterns - handle both flat list and nested dict formats
    fp = backend_data.get('filename_patterns')
    if fp:
        if isinstance(fp, list):
            frontend['filenamePatterns']['patterns'] = fp
        elif isinstance(fp, dict):
            frontend['filenamePatterns']['patterns'] = fp.get('patterns', [])
            frontend['filenamePatterns']['dateFormats'] = fp.get('date_formats', [])
    
    # Verification fields
    if backend_data.get('verification_fields'):
        # Convert list of field names to dict with all fields enabled
        for field in backend_data['verification_fields']:
            frontend['verification']['enabledFields'][field] = True
    
    return frontend

# ---- Rule Test & Execution Routes ----

@rules_bp.route('/api/rules/test', methods=['POST'])
@require_auth
def test_rule_endpoint():
    """Test a rule against document content"""
    try:
        data = request.json
        rule_data = data.get('rule')
        document_content = data.get('documentContent', '')
        document_filename = data.get('documentFilename', 'test.pdf')
        paperless_metadata = data.get('paperlessMetadata', None)
        document_id = data.get('documentId')
        
        if not rule_data:
            return jsonify({'error': 'Rule data is required'}), 400
        
        # Convert frontend format to backend format if needed
        backend_rule = convert_frontend_to_backend(rule_data)
        rule_name = backend_rule.get('rule_name', 'Unnamed Rule')
        
        # Test the rule
        result = test_engine.test_rule(
            backend_rule,
            document_content,
            document_filename,
            paperless_metadata
        )
        
        # Log the test result
        if result.get('success'):
            poco_score = result.get('scores', {}).get('poco_score', 0)
            poco_ocr = result.get('scores', {}).get('poco_ocr_score', 0)
            matched = result.get('result') == 'Match'
            
            db.add_log(
                log_type='rule_execution',
                level='success' if matched else 'info',
                message=f"Rule test {'successful' if matched else 'completed'}: {rule_name} - {'Match' if matched else 'No match'}",
                rule_name=rule_name,
                rule_id=rule_data.get('id'),
                document_id=document_id,
                document_name=document_filename,
                poco_score=poco_score,
                poco_ocr=poco_ocr,
                source='test_engine'
            )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error testing rule: {e}", exc_info=True)
        # Log the error
        db.add_log(
            log_type='error',
            level='error',
            message=f"Rule test failed: {str(e)}",
            rule_name=rule_data.get('ruleName', 'Unknown') if rule_data else 'Unknown',
            source='test_engine'
        )
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@rules_bp.route('/api/rules/<rule_id>/execute', methods=['POST'])
@require_auth
def execute_rule_endpoint(rule_id):
    """Execute a rule against a Paperless document"""
    try:
        if not is_valid_rule_id(rule_id):
            return jsonify({'error': 'Invalid Rule ID format'}), 400

        data = request.json
        document_id = data.get('documentId')
        dry_run = data.get('dryRun', True)
        
        if not document_id:
            return jsonify({'error': 'Document ID is required'}), 400
        
        # Create user-specific API client
        session = request.current_user
        paperless_url = db.get_config('paperless_url')
        config = Config()
        config.paperless_token = session['paperless_token']
        config.paperless_url = paperless_url
        user_api_client = PaperlessAPIClient(config, db)
        
        # Load rule
        rule_file = resolve_rule_path(rule_id)
        rule_data = rule_loader.load_rule_file(rule_file)
        if not rule_data:
            return jsonify({'error': 'Rule not found'}), 404
        
        # Get document from Paperless
        documents = user_api_client.get_documents(document_id=document_id)
        if not documents or len(documents) == 0:
            return jsonify({'error': 'Document not found in Paperless'}), 404
        
        document = documents[0]
        
        # Get document content
        content = user_api_client.get_document_content(document_id)
        if not content:
            return jsonify({'error': 'Could not retrieve document content'}), 500
        
        # Convert document IDs to names for verification using standard PocoClass pattern
        # Create lookup dictionaries from cached database data
        correspondents_lookup = {c['paperless_id']: c for c in db.get_all_correspondents()}
        doc_types_lookup = {dt['paperless_id']: dt for dt in db.get_all_document_types()}
        tags_lookup = {t['paperless_id']: t for t in db.get_all_tags()}
        custom_fields_lookup = {cf['paperless_id']: cf for cf in db.get_all_custom_fields()}
        
        # Build paperless_metadata with names instead of IDs
        paperless_metadata = {}
        
        # Convert correspondent ID to name
        if document.get('correspondent'):
            corr = correspondents_lookup.get(document['correspondent'])
            if corr:
                paperless_metadata['correspondent'] = corr['name']
        
        # Convert document_type ID to name
        if document.get('document_type'):
            dt = doc_types_lookup.get(document['document_type'])
            if dt:
                paperless_metadata['document_type'] = dt['name']
        
        # Convert tag IDs to tag names
        if document.get('tags'):
            tag_names = []
            for tag_id in document['tags']:
                tag = tags_lookup.get(tag_id)
                if tag:
                    tag_names.append(tag['name'])
            if tag_names:
                paperless_metadata['tags'] = tag_names
        
        # Extract custom fields with field names and values (resolve select option IDs)
        if document.get('custom_fields'):
            custom_fields_dict = {}
            for cf_entry in document['custom_fields']:
                field_id = cf_entry.get('field')
                cf_def = custom_fields_lookup.get(field_id)
                if cf_def:
                    raw_value = cf_entry.get('value')
                    # Resolve select option ID to label
                    if cf_def.get('data_type') == 'select' and cf_def.get('extra_data'):
                        select_options = cf_def['extra_data'].get('select_options', [])
                        resolved_value = raw_value
                        for option in select_options:
                            if option.get('id') == raw_value:
                                resolved_value = option.get('label', raw_value)
                                break
                        custom_fields_dict[cf_def['name']] = resolved_value
                    else:
                        custom_fields_dict[cf_def['name']] = raw_value
            if custom_fields_dict:
                paperless_metadata['custom_fields'] = custom_fields_dict
        
        # Pass through date_created
        if document.get('created'):
            paperless_metadata['date_created'] = document['created']
        
        # Execute rule
        result = test_engine.execute_rule(
            rule_data,
            document_id,
            content,
            document.get('original_file_name', 'unknown.pdf'),
            paperless_metadata,
            dry_run
        )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error executing rule: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Internal server error'}), 500



def init_rules_routes(app, db_instance, logger_instance, rule_loader_instance, test_engine_instance):
    """Inject dependencies and register rule routes."""
    global db, logger, rule_loader, test_engine

    db = db_instance
    logger = logger_instance
    rule_loader = rule_loader_instance
    test_engine = test_engine_instance

    if "rules" not in app.blueprints:
        app.register_blueprint(rules_bp)
