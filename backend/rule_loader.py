"""
PocoClass - YAML Rule Loader

Loads, parses, and validates YAML rule files used for document classification.
Each rule file defines identifiers, patterns, thresholds, and metadata
extraction instructions that the scoring engine evaluates against documents.

Key responsibilities:
    - Discover .yaml/.yml files in the configured rules directory
    - Parse YAML safely and validate required fields and structure
    - Track and expose loading/validation errors for the frontend
    - Provide lookup methods for individual rules and summaries

Key class:
    RuleLoader: Manages the lifecycle of rule files from disk to in-memory dicts.
"""

import yaml
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional

class RuleLoader:
    """Loads, validates, and caches YAML rule files from a directory.

    Rules are keyed by their rule_id and can be retrieved individually or
    as a complete dictionary.  Any errors encountered during loading are
    recorded and can be queried via get_load_errors().
    """
    
    def __init__(self, rules_directory: str):
        """Initialize the loader with a path to the rules directory.

        Args:
            rules_directory: Filesystem path containing YAML rule files.
        """
        self.rules_directory = Path(rules_directory)
        self.logger = logging.getLogger(__name__)
        self.rules = {}
        self.load_errors = []
    
    def load_all_rules(self) -> Dict[str, Dict[str, Any]]:
        """Load all YAML rule files from the rules directory.

        Clears any previously loaded rules and errors, then scans the
        directory for .yaml and .yml files.  Each file is parsed and
        validated; valid rules are stored keyed by rule_id.

        Returns:
            Dictionary mapping rule_id to parsed rule data.
        """
        # Reset state to avoid stale data from previous loads
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
        
        # Support both .yaml and .yml extensions
        rule_files = list(self.rules_directory.glob("*.yaml")) + list(self.rules_directory.glob("*.yml"))
        
        if not rule_files:
            warning_msg = f"No YAML rule files found in: {self.rules_directory}"
            self.logger.warning(warning_msg)
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
        """Load and validate a single YAML rule file.

        Backwards-compatible wrapper that discards the error string.

        Args:
            rule_file: Path to the YAML file.

        Returns:
            Parsed rule dict, or None on failure.
        """
        rule, _ = self.load_rule_file_with_error(rule_file)
        return rule
    
    def load_rule_file_with_error(self, rule_file: Path) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Load and validate a single YAML rule file with error reporting.

        Args:
            rule_file: Path to the YAML file.

        Returns:
            Tuple of (rule_data, error_message).  On success error_message
            is None; on failure rule_data is None.
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
        """Validate rule structure (backwards-compatible, discards error details).

        Args:
            rule: Parsed rule dictionary.
            filename: Filename for error messages.

        Returns:
            True if the rule is structurally valid.
        """
        errors = []
        return self.validate_rule_with_errors(rule, filename, errors)
    
    def validate_rule_with_errors(self, rule: Dict[str, Any], filename: str, errors: List[str]) -> bool:
        """
        Validate rule structure and required fields, collecting error messages.

        Checks performed:
            1. Required top-level fields: rule_name, rule_id, threshold
            2. Threshold is an integer between 0 and 100
            3. core_identifiers and optional bonus_identifiers structure
            4. Optional sections: static_metadata, dynamic_metadata,
               filename_metadata, poco_weights

        Args:
            rule: Parsed rule dictionary to validate.
            filename: Source filename (used in error messages).
            errors: List that validation errors are appended to.

        Returns:
            True if valid, False on the first structural violation found.
        """
        required_fields = ['rule_name', 'rule_id', 'threshold']
        
        for field in required_fields:
            if field not in rule:
                error_msg = f"Missing required field: {field}"
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
        
        # Normalise legacy 'ocr_identifiers' to 'core_identifiers'
        if 'core_identifiers' not in rule and 'ocr_identifiers' in rule:
            ocr_section = rule['ocr_identifiers']
            if isinstance(ocr_section, dict):
                rule['core_identifiers'] = {'logic_groups': ocr_section.get('logic_groups', [])}
                if 'ocr_threshold' not in rule and 'threshold' in ocr_section:
                    rule['ocr_threshold'] = ocr_section['threshold']
                if 'ocr_multiplier' not in rule and 'multiplier' in ocr_section:
                    rule['ocr_multiplier'] = ocr_section['multiplier']
        
        # Normalise legacy 'predefined_data' to 'static_metadata'
        if 'static_metadata' not in rule and 'predefined_data' in rule:
            rule['static_metadata'] = rule['predefined_data']
        
        # Initialise core_identifiers with an empty structure if absent
        if 'core_identifiers' not in rule:
            rule['core_identifiers'] = {'logic_groups': []}
        
        # Threshold must be an integer percentage
        threshold = rule.get('threshold')
        if not isinstance(threshold, int) or threshold < 0 or threshold > 100:
            error_msg = f"Invalid threshold: {threshold} (must be integer 0-100)"
            self.logger.error(f"Rule {filename} {error_msg}")
            errors.append(error_msg)
            return False
        
        # Validate the logic-group structure inside core_identifiers
        if not self.validate_identifiers_with_errors(rule.get('core_identifiers', {}), 'core_identifiers', filename, errors):
            return False
        
        if 'bonus_identifiers' in rule:
            if not self.validate_identifiers_with_errors(rule['bonus_identifiers'], 'bonus_identifiers', filename, errors):
                return False
        
        # Optional metadata sections must be dicts if present
        for section in ['static_metadata', 'dynamic_metadata', 'filename_metadata']:
            if section in rule:
                if not isinstance(rule[section], dict):
                    error_msg = f"{section} must be a dictionary"
                    self.logger.error(f"Rule {filename} {error_msg}")
                    errors.append(error_msg)
                    return False
        
        # Validate POCO weight overrides if present
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
        """Validate identifiers section (backwards-compatible wrapper).

        Args:
            identifiers: Identifiers dict (must contain 'logic_groups').
            section_name: Section label for error messages.
            filename: Rule filename for error messages.

        Returns:
            True if structurally valid.
        """
        errors = []
        return self.validate_identifiers_with_errors(identifiers, section_name, filename, errors)
    
    def validate_identifiers_with_errors(self, identifiers: Dict[str, Any], section_name: str, filename: str, errors: List[str]) -> bool:
        """
        Deep-validate the logic_groups array inside an identifiers section.

        For each logic group validates:
            - Required keys: type, score, conditions
            - type is 'match', 'match_all', or legacy 'or'
            - score is a non-negative number
            - Each condition has 'pattern' and 'source' with valid values

        For core_identifiers, warns (but does not fail) if group scores
        don't sum to 100.

        Args:
            identifiers: The identifiers dict to validate.
            section_name: 'core_identifiers' or 'bonus_identifiers'.
            filename: Rule filename for error messages.
            errors: List that error messages are appended to.

        Returns:
            True if valid, False otherwise.
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
            
            # Each group must declare its type, score, and conditions
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
            
            if group['type'] not in ['match', 'match_all', 'or']:
                error_msg = (
                    f"{section_name}.logic_groups[{i}] type must be "
                    "'match', 'match_all', or legacy 'or'"
                )
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
            
            score = group['score']
            if not isinstance(score, (int, float)) or score < 0:
                error_msg = f"{section_name}.logic_groups[{i}] score must be a non-negative number"
                self.logger.error(f"Rule {filename} {error_msg}")
                errors.append(error_msg)
                return False
            
            total_score += score
            
            # Validate individual conditions within the group
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
        
        # Warn if core identifier scores don't sum to 100 (not a hard error)
        if section_name == 'core_identifiers' and total_score != 100:
            warning_msg = f"{section_name} total score is {total_score}, should be 100"
            self.logger.warning(f"Rule {filename} {warning_msg}")
        
        return True
    
    def get_rule(self, rule_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific loaded rule by its ID.

        Args:
            rule_id: Unique identifier of the rule.

        Returns:
            Rule dictionary, or None if not loaded.
        """
        return self.rules.get(rule_id)
    
    def get_all_rules(self) -> Dict[str, Dict[str, Any]]:
        """Get all currently loaded rules.

        Returns:
            Dictionary mapping rule_id to rule data.
        """
        return self.rules
    
    def get_rule_summary(self) -> Dict[str, str]:
        """Get a lightweight summary mapping rule_id to rule_name.

        Returns:
            Dictionary of {rule_id: rule_name} for all loaded rules.
        """
        summary = {}
        for rule_id, rule in self.rules.items():
            summary[rule_id] = rule.get('rule_name', 'Unknown')
        return summary
    
    def get_load_errors(self) -> List[Dict[str, Any]]:
        """
        Get all errors encountered during the most recent rule loading pass.

        Returns:
            List of error dicts, each with keys: file, error, type,
            and optionally details.
        """
        return self.load_errors
    
    def has_load_errors(self) -> bool:
        """Check whether the most recent load produced any errors.

        Returns:
            True if at least one error was recorded.
        """
        return len(self.load_errors) > 0
