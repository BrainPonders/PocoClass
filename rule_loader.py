"""
POCOclass - YAML Rule Loader
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
    
    def load_all_rules(self) -> Dict[str, Dict[str, Any]]:
        """Load all YAML rule files from the rules directory"""
        if not self.rules_directory.exists():
            self.logger.error(f"Rules directory does not exist: {self.rules_directory}")
            return {}
        
        rule_files = list(self.rules_directory.glob("*.yaml")) + list(self.rules_directory.glob("*.yml"))
        
        if not rule_files:
            self.logger.warning(f"No YAML rule files found in: {self.rules_directory}")
            return {}
        
        self.logger.info(f"Loading {len(rule_files)} rule files from {self.rules_directory}")
        
        for rule_file in rule_files:
            try:
                rule = self.load_rule_file(rule_file)
                if rule:
                    rule_id = rule.get('rule_id')
                    if rule_id:
                        self.rules[rule_id] = rule
                        self.logger.debug(f"Loaded rule: {rule_id} from {rule_file.name}")
                    else:
                        self.logger.warning(f"Rule file {rule_file.name} missing rule_id")
            except Exception as e:
                self.logger.error(f"Failed to load rule file {rule_file.name}: {e}")
        
        self.logger.info(f"Successfully loaded {len(self.rules)} rules")
        return self.rules
    
    def load_rule_file(self, rule_file: Path) -> Optional[Dict[str, Any]]:
        """Load and validate a single YAML rule file"""
        try:
            with open(rule_file, 'r', encoding='utf-8') as f:
                rule = yaml.safe_load(f)
            
            if not self.validate_rule(rule, rule_file.name):
                return None
            
            return rule
            
        except yaml.YAMLError as e:
            self.logger.error(f"YAML parsing error in {rule_file.name}: {e}")
            return None
        except Exception as e:
            self.logger.error(f"Error loading rule file {rule_file.name}: {e}")
            return None
    
    def validate_rule(self, rule: Dict[str, Any], filename: str) -> bool:
        """Validate rule structure and required fields"""
        required_fields = ['rule_name', 'rule_id', 'threshold', 'core_identifiers']
        
        for field in required_fields:
            if field not in rule:
                self.logger.error(f"Rule {filename} missing required field: {field}")
                return False
        
        # Validate threshold
        threshold = rule.get('threshold')
        if not isinstance(threshold, int) or threshold < 0 or threshold > 100:
            self.logger.error(f"Rule {filename} has invalid threshold: {threshold}")
            return False
        
        # Validate core_identifiers structure
        if not self.validate_identifiers(rule.get('core_identifiers', {}), 'core_identifiers', filename):
            return False
        
        # Validate bonus_identifiers if present
        if 'bonus_identifiers' in rule:
            if not self.validate_identifiers(rule['bonus_identifiers'], 'bonus_identifiers', filename):
                return False
        
        # Validate static_metadata if present
        if 'static_metadata' in rule:
            if not isinstance(rule['static_metadata'], dict):
                self.logger.error(f"Rule {filename} static_metadata must be a dictionary")
                return False
        
        # Validate dynamic_metadata if present
        if 'dynamic_metadata' in rule:
            if not isinstance(rule['dynamic_metadata'], dict):
                self.logger.error(f"Rule {filename} dynamic_metadata must be a dictionary")
                return False
        
        # Validate filename_metadata if present
        if 'filename_metadata' in rule:
            if not isinstance(rule['filename_metadata'], dict):
                self.logger.error(f"Rule {filename} filename_metadata must be a dictionary")
                return False
        
        # Validate poco_weights if present
        if 'poco_weights' in rule:
            weights = rule['poco_weights']
            if not isinstance(weights, dict):
                self.logger.error(f"Rule {filename} poco_weights must be a dictionary")
                return False
            
            for weight_name, weight_value in weights.items():
                if not isinstance(weight_value, (int, float)) or weight_value < 0:
                    self.logger.error(f"Rule {filename} poco_weights.{weight_name} must be a non-negative number")
                    return False
        
        return True
    
    def validate_identifiers(self, identifiers: Dict[str, Any], section_name: str, filename: str) -> bool:
        """Validate identifiers section structure"""
        if not isinstance(identifiers, dict):
            self.logger.error(f"Rule {filename} {section_name} must be a dictionary")
            return False
        
        if 'logic_groups' not in identifiers:
            self.logger.error(f"Rule {filename} {section_name} missing logic_groups")
            return False
        
        logic_groups = identifiers['logic_groups']
        if not isinstance(logic_groups, list):
            self.logger.error(f"Rule {filename} {section_name}.logic_groups must be a list")
            return False
        
        total_score = 0
        for i, group in enumerate(logic_groups):
            if not isinstance(group, dict):
                self.logger.error(f"Rule {filename} {section_name}.logic_groups[{i}] must be a dictionary")
                return False
            
            # Validate required fields
            if 'type' not in group:
                self.logger.error(f"Rule {filename} {section_name}.logic_groups[{i}] missing 'type'")
                return False
            
            if 'score' not in group:
                self.logger.error(f"Rule {filename} {section_name}.logic_groups[{i}] missing 'score'")
                return False
            
            if 'conditions' not in group:
                self.logger.error(f"Rule {filename} {section_name}.logic_groups[{i}] missing 'conditions'")
                return False
            
            # Validate type
            if group['type'] not in ['match', 'or']:
                self.logger.error(f"Rule {filename} {section_name}.logic_groups[{i}] type must be 'match' or 'or'")
                return False
            
            # Validate score
            score = group['score']
            if not isinstance(score, (int, float)) or score < 0:
                self.logger.error(f"Rule {filename} {section_name}.logic_groups[{i}] score must be a non-negative number")
                return False
            
            total_score += score
            
            # Validate conditions
            conditions = group['conditions']
            if not isinstance(conditions, list):
                self.logger.error(f"Rule {filename} {section_name}.logic_groups[{i}] conditions must be a list")
                return False
            
            for j, condition in enumerate(conditions):
                if not isinstance(condition, dict):
                    self.logger.error(f"Rule {filename} {section_name}.logic_groups[{i}].conditions[{j}] must be a dictionary")
                    return False
                
                if 'pattern' not in condition:
                    self.logger.error(f"Rule {filename} {section_name}.logic_groups[{i}].conditions[{j}] missing 'pattern'")
                    return False
                
                if 'source' not in condition:
                    self.logger.error(f"Rule {filename} {section_name}.logic_groups[{i}].conditions[{j}] missing 'source'")
                    return False
                
                if condition['source'] not in ['content', 'filename']:
                    self.logger.error(f"Rule {filename} {section_name}.logic_groups[{i}].conditions[{j}] source must be 'content' or 'filename'")
                    return False
        
        # Validate total score for core identifiers
        if section_name == 'core_identifiers' and total_score != 100:
            self.logger.warning(f"Rule {filename} {section_name} total score is {total_score}, should be 100")
        
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
