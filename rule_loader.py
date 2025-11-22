"""
PocoClass - YAML Rule Loader
Handles loading and validation of YAML rule files for document classification
"""

import yaml
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional

class RuleLoader:
    """Loads and validates YAML rule files"""
    
    def __init__(self, rules_directory: str):
        self.rules_directory = Path(rules_directory)
        self.logger = logging.getLogger(__name__)
        self.rules = {}
        self.load_errors = []  # Track errors during rule loading
    
    def load_all_rules(self) -> Dict[str, Dict[str, Any]]:
        """Load all YAML rule files from the rules directory"""
        # Clear the rules dictionary and errors to avoid stale data
        self.rules = {}
        self.load_errors = []
        
        if not self.rules_directory.exists():
            error_msg = f"Rules directory does not exist: {self.rules_directory}"
            self.logger.error(error_msg)
            self.load_errors.append({
                'file': 'N/A',
                'error': error_msg,
                'type': 'directory_not_found'
            })
            return {}
        
        rule_files = list(self.rules_directory.glob("*.yaml")) + list(self.rules_directory.glob("*.yml"))
        
        if not rule_files:
            warning_msg = f"No YAML rule files found in: {self.rules_directory}"
            self.logger.warning(warning_msg)
            # This is just a warning, not an error
            return {}
        
        self.logger.info(f"Loading {len(rule_files)} rule files from {self.rules_directory}")
        
        for rule_file in rule_files:
            try:
                rule, error = self.load_rule_file_with_error(rule_file)
                if rule:
                    rule_id = rule.get('rule_id')
                    if rule_id:
                        self.rules[rule_id] = rule
                        self.logger.debug(f"Loaded rule: {rule_id} from {rule_file.name}")
                    else:
                        error_msg = f"Rule file {rule_file.name} missing rule_id"
                        self.logger.warning(error_msg)
                        self.load_errors.append({
                            'file': rule_file.name,
                            'error': error_msg,
                            'type': 'missing_rule_id'
                        })
                elif error:
                    # Error already tracked by load_rule_file_with_error
                    pass
            except Exception as e:
                error_msg = f"Failed to load rule file {rule_file.name}: {e}"
                self.logger.error(error_msg)
                self.load_errors.append({
                    'file': rule_file.name,
                    'error': str(e),
                    'type': 'unexpected_error'
                })
        
        if self.load_errors:
            self.logger.warning(f"Loaded {len(self.rules)} rules with {len(self.load_errors)} error(s)")
        else:
            self.logger.info(f"Successfully loaded {len(self.rules)} rules")
        
        return self.rules
    
    def load_rule_file(self, rule_file: Path) -> Optional[Dict[str, Any]]:
        """Load and validate a single YAML rule file (backwards compatible)"""
        rule, _ = self.load_rule_file_with_error(rule_file)
        return rule
    
    def load_rule_file_with_error(self, rule_file: Path) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Load and validate a single YAML rule file with error tracking
        Returns: (rule_data, error_message) tuple
        """
        try:
            with open(rule_file, 'r', encoding='utf-8') as f:
                rule = yaml.safe_load(f)
            
            validation_errors = []
            if not self.validate_rule_with_errors(rule, rule_file.name, validation_errors):
                error_msg = '; '.join(validation_errors)
                self.logger.error(f"Validation failed for {rule_file.name}: {error_msg}")
                self.load_errors.append({
                    'file': rule_file.name,
                    'error': error_msg,
                    'type': 'validation_error',
                    'details': validation_errors
                })
                return None, error_msg
            
            return rule, None
            
        except yaml.YAMLError as e:
            error_msg = f"YAML parsing error: {e}"
            self.logger.error(f"{error_msg} in {rule_file.name}")
            self.load_errors.append({
                'file': rule_file.name,
                'error': error_msg,
                'type': 'yaml_parse_error'
            })
            return None, error_msg
        except Exception as e:
            error_msg = f"Error loading file: {e}"
            self.logger.error(f"{error_msg} ({rule_file.name})")
            self.load_errors.append({
                'file': rule_file.name,
                'error': str(e),
                'type': 'file_error'
            })
            return None, str(e)
    
    def validate_rule(self, rule: Dict[str, Any], filename: str) -> bool:
        """Validate rule structure and required fields (backwards compatible)"""
        errors = []
        return self.validate_rule_with_errors(rule, filename, errors)
    
    def validate_rule_with_errors(self, rule: Dict[str, Any], filename: str, errors: List[str]) -> bool:
        """
        Validate rule structure and required fields, collecting errors
        Args:
            rule: Rule data to validate
            filename: Name of the rule file
            errors: List to append error messages to
        Returns:
            True if valid, False otherwise
        """
        required_fields = ['rule_name', 'rule_id', 'threshold']
        
        for field in required_fields:
            if field not in rule:
                error_msg = f"Missing required field: {field}"
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
        
        # core_identifiers is optional - initialize if missing
        if 'core_identifiers' not in rule:
            rule['core_identifiers'] = {'logic_groups': []}
        
        # Validate threshold
        threshold = rule.get('threshold')
        if not isinstance(threshold, int) or threshold < 0 or threshold > 100:
            error_msg = f"Invalid threshold: {threshold} (must be integer 0-100)"
            self.logger.error(f"Rule {filename} {error_msg}")
            errors.append(error_msg)
            return False
        
        # Validate core_identifiers structure
        if not self.validate_identifiers_with_errors(rule.get('core_identifiers', {}), 'core_identifiers', filename, errors):
            return False
        
        # Validate bonus_identifiers if present
        if 'bonus_identifiers' in rule:
            if not self.validate_identifiers_with_errors(rule['bonus_identifiers'], 'bonus_identifiers', filename, errors):
                return False
        
        # Validate static_metadata if present
        if 'static_metadata' in rule:
            if not isinstance(rule['static_metadata'], dict):
                error_msg = "static_metadata must be a dictionary"
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
        
        # Validate dynamic_metadata if present
        if 'dynamic_metadata' in rule:
            if not isinstance(rule['dynamic_metadata'], dict):
                error_msg = "dynamic_metadata must be a dictionary"
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
        
        # Validate filename_metadata if present
        if 'filename_metadata' in rule:
            if not isinstance(rule['filename_metadata'], dict):
                error_msg = "filename_metadata must be a dictionary"
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
        
        # Validate poco_weights if present
        if 'poco_weights' in rule:
            weights = rule['poco_weights']
            if not isinstance(weights, dict):
                error_msg = "poco_weights must be a dictionary"
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
            
            for weight_name, weight_value in weights.items():
                if not isinstance(weight_value, (int, float)) or weight_value < 0:
                    error_msg = f"poco_weights.{weight_name} must be a non-negative number"
                    self.logger.error(f"Rule {filename} {error_msg}")
                    errors.append(error_msg)
                    return False
        
        return True
    
    def validate_identifiers(self, identifiers: Dict[str, Any], section_name: str, filename: str) -> bool:
        """Validate identifiers section structure (backwards compatible)"""
        errors = []
        return self.validate_identifiers_with_errors(identifiers, section_name, filename, errors)
    
    def validate_identifiers_with_errors(self, identifiers: Dict[str, Any], section_name: str, filename: str, errors: List[str]) -> bool:
        """
        Validate identifiers section structure with error collection
        Args:
            identifiers: Identifiers data to validate
            section_name: Name of the section (e.g., 'core_identifiers')
            filename: Name of the rule file
            errors: List to append error messages to
        Returns:
            True if valid, False otherwise
        """
        if not isinstance(identifiers, dict):
            error_msg = f"{section_name} must be a dictionary"
            self.logger.error(f"Rule {filename} {error_msg}")
            errors.append(error_msg)
            return False
        
        if 'logic_groups' not in identifiers:
            error_msg = f"{section_name} missing logic_groups"
            self.logger.error(f"Rule {filename} {error_msg}")
            errors.append(error_msg)
            return False
        
        logic_groups = identifiers['logic_groups']
        if not isinstance(logic_groups, list):
            error_msg = f"{section_name}.logic_groups must be a list"
            self.logger.error(f"Rule {filename} {error_msg}")
            errors.append(error_msg)
            return False
        
        total_score = 0
        for i, group in enumerate(logic_groups):
            if not isinstance(group, dict):
                error_msg = f"{section_name}.logic_groups[{i}] must be a dictionary"
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
            
            # Validate required fields
            if 'type' not in group:
                error_msg = f"{section_name}.logic_groups[{i}] missing 'type'"
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
            
            if 'score' not in group:
                error_msg = f"{section_name}.logic_groups[{i}] missing 'score'"
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
            
            if 'conditions' not in group:
                error_msg = f"{section_name}.logic_groups[{i}] missing 'conditions'"
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
            
            # Validate type
            if group['type'] not in ['match', 'or']:
                error_msg = f"{section_name}.logic_groups[{i}] type must be 'match' or 'or'"
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
            
            # Validate score
            score = group['score']
            if not isinstance(score, (int, float)) or score < 0:
                error_msg = f"{section_name}.logic_groups[{i}] score must be a non-negative number"
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
            
            total_score += score
            
            # Validate conditions
            conditions = group['conditions']
            if not isinstance(conditions, list):
                error_msg = f"{section_name}.logic_groups[{i}] conditions must be a list"
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
            
            for j, condition in enumerate(conditions):
                if not isinstance(condition, dict):
                    error_msg = f"{section_name}.logic_groups[{i}].conditions[{j}] must be a dictionary"
                    self.logger.error(f"Rule {filename} {error_msg}")
                    errors.append(error_msg)
                    return False
                
                if 'pattern' not in condition:
                    error_msg = f"{section_name}.logic_groups[{i}].conditions[{j}] missing 'pattern'"
                    self.logger.error(f"Rule {filename} {error_msg}")
                    errors.append(error_msg)
                    return False
                
                if 'source' not in condition:
                    error_msg = f"{section_name}.logic_groups[{i}].conditions[{j}] missing 'source'"
                    self.logger.error(f"Rule {filename} {error_msg}")
                    errors.append(error_msg)
                    return False
                
                if condition['source'] not in ['content', 'filename']:
                    error_msg = f"{section_name}.logic_groups[{i}].conditions[{j}] source must be 'content' or 'filename'"
                    self.logger.error(f"Rule {filename} {error_msg}")
                    errors.append(error_msg)
                    return False
        
        # Validate total score for core identifiers
        if section_name == 'core_identifiers' and total_score != 100:
            warning_msg = f"{section_name} total score is {total_score}, should be 100"
            self.logger.warning(f"Rule {filename} {warning_msg}")
            # This is just a warning, not an error - don't add to errors list
        
        return True
    
    def get_rule(self, rule_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific rule by ID"""
        return self.rules.get(rule_id)
    
    def get_all_rules(self) -> Dict[str, Dict[str, Any]]:
        """Get all loaded rules"""
        return self.rules
    
    def get_rule_summary(self) -> Dict[str, str]:
        """Get a summary of all loaded rules"""
        summary = {}
        for rule_id, rule in self.rules.items():
            summary[rule_id] = rule.get('rule_name', 'Unknown')
        return summary
    
    def get_load_errors(self) -> List[Dict[str, Any]]:
        """
        Get all errors encountered during rule loading
        Returns:
            List of error dictionaries with keys: file, error, type, and optionally details
        """
        return self.load_errors
    
    def has_load_errors(self) -> bool:
        """Check if any errors occurred during rule loading"""
        return len(self.load_errors) > 0
