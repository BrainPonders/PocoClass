"""
POCOmeta - Pattern Matcher
Handles logic group evaluation and pattern matching for rule-based document classification
"""

import re
import logging
from typing import Dict, List, Any, Tuple, Optional

class PatternMatcher:
    """Handles pattern matching and logic group evaluation"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def evaluate_rule(self, rule: Dict[str, Any], content: str, filename: str) -> Dict[str, Any]:
        """Evaluate a rule against document content and filename"""
        rule_id = rule.get('rule_id', 'Unknown')
        rule_name = rule.get('rule_name', 'Unknown')
        threshold = rule.get('threshold', 70)
        
        self.logger.debug(f"Evaluating rule {rule_id}: {rule_name}")
        
        # Evaluate core identifiers
        core_result = self.evaluate_identifiers(
            rule.get('core_identifiers', {}),
            content,
            filename,
            'core'
        )
        
        # Evaluate bonus identifiers if present
        bonus_result = self.evaluate_identifiers(
            rule.get('bonus_identifiers', {}),
            content,
            filename,
            'bonus'
        )
        
        # Calculate total score
        total_score = core_result['total_score'] + bonus_result['total_score']
        
        # Determine if rule passes
        passes = total_score >= threshold
        
        result = {
            'rule_id': rule_id,
            'rule_name': rule_name,
            'core_score': core_result['total_score'],
            'bonus_score': bonus_result['total_score'],
            'total_score': total_score,
            'threshold': threshold,
            'pass': passes,
            'core_matches': core_result['matches'],
            'bonus_matches': bonus_result['matches'],
            # Add detailed evaluation for pattern matching output
            'evaluation': {
                'core_identifiers': core_result,
                'bonus_identifiers': bonus_result if bonus_result['total_score'] > 0 else None
            }
        }
        
        self.logger.debug(f"Rule {rule_id} result: {total_score}/{threshold} ({'PASS' if passes else 'FAIL'})")
        
        return result
    
    def evaluate_identifiers(self, identifiers: Dict[str, Any], content: str, filename: str, section_type: str) -> Dict[str, Any]:
        """Evaluate an identifiers section (core or bonus)"""
        if not identifiers or 'logic_groups' not in identifiers:
            return {
                'total_score': 0, 
                'threshold': identifiers.get('threshold', 0) if identifiers else 0,
                'passed': False,
                'logic_groups': [],
                'matches': []
            }
        
        logic_groups = identifiers['logic_groups']
        threshold = identifiers.get('threshold', 0)
        total_score = 0
        all_matches = []
        evaluated_groups = []
        
        for i, group in enumerate(logic_groups):
            group_result = self.evaluate_logic_group(group, content, filename)
            
            # Add group metadata for detailed output
            group_result['title'] = group.get('title', f"{section_type.title()} Group {i+1}")
            group_result['max_score'] = group.get('score', 0)
            group_result['score'] = group.get('score', 0) if group_result['matched'] else 0
            
            evaluated_groups.append(group_result)
            
            if group_result['matched']:
                total_score += group['score'] 
                all_matches.extend(group_result.get('matches', []))
        
        passed = total_score >= threshold
        
        return {
            'total_score': total_score,
            'threshold': threshold,
            'passed': passed,
            'logic_groups': evaluated_groups,
            'matches': all_matches
        }
    
    def evaluate_logic_group(self, group: Dict[str, Any], content: str, filename: str) -> Dict[str, Any]:
        """Evaluate a single logic group"""
        group_type = group.get('type', 'match')
        conditions = group.get('conditions', [])
        
        if group_type == 'match':
            return self.evaluate_match_group(conditions, content, filename)
        elif group_type == 'or':
            return self.evaluate_or_group(conditions, content, filename)
        else:
            self.logger.warning(f"Unknown logic group type: {group_type}")
            return {'matched': False, 'matches': []}
    
    def evaluate_match_group(self, conditions: List[Dict[str, Any]], content: str, filename: str) -> Dict[str, Any]:
        """Evaluate a 'match' logic group (all conditions must match)"""
        matches = []
        condition_results = []
        
        for condition in conditions:
            match_result = self.evaluate_condition(condition, content, filename)
            condition_results.append(match_result)
            
            if match_result['matched']:
                matches.append(match_result)
            else:
                # If any condition fails, the entire group fails
                return {
                    'matched': False, 
                    'matches': [], 
                    'conditions': condition_results,
                    'type': 'match',
                    'score': 0,
                    'passed': False
                }
        
        # All conditions matched
        return {
            'matched': True, 
            'matches': matches,
            'conditions': condition_results,
            'type': 'match',
            'score': 0,  # Will be set by calling function
            'passed': True
        }
    
    def evaluate_or_group(self, conditions: List[Dict[str, Any]], content: str, filename: str) -> Dict[str, Any]:
        """Evaluate an 'or' logic group (at least one condition must match)"""
        matches = []
        condition_results = []
        
        for condition in conditions:
            match_result = self.evaluate_condition(condition, content, filename)
            condition_results.append(match_result)
            if match_result['matched']:
                matches.append(match_result)
        
        # If any condition matched, the group succeeds
        matched = len(matches) > 0
        return {
            'matched': matched,
            'matches': matches,
            'conditions': condition_results,
            'type': 'or',
            'score': 0,  # Will be set by calling function
            'passed': matched
        }
    
    def evaluate_condition(self, condition: Dict[str, Any], content: str, filename: str) -> Dict[str, Any]:
        """Evaluate a single condition"""
        pattern = condition.get('pattern', '')
        source = condition.get('source', 'content')
        range_spec = condition.get('range', '')
        
        # Select the appropriate text source
        if source == 'content':
            text = content
        elif source == 'filename':
            text = filename
        else:
            self.logger.warning(f"Unknown source type: {source}")
            return {'matched': False, 'pattern': pattern, 'source': source}
        
        # Apply range if specified
        if range_spec and source == 'content':
            text = self.apply_range(text, range_spec)
        
        # Perform pattern matching
        try:
            # Find all matches for detailed debugging
            matches = list(re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE))
            
            if matches:
                # Collect detailed match information
                match_details = []
                for match in matches:
                    # Calculate position in original text if range was applied
                    position = match.start()
                    if range_spec and source == 'content':
                        # Adjust position to account for range offset
                        try:
                            start_offset = int(range_spec.split('-')[0])
                            position += start_offset
                        except (ValueError, IndexError):
                            pass
                    
                    # Get context around the match (±30 characters)
                    context_start = max(0, match.start() - 30)
                    context_end = min(len(text), match.end() + 30)
                    context = text[context_start:context_end]
                    
                    match_details.append({
                        'position': position,
                        'text': match.group(0),
                        'context': context,
                        'groups': match.groups() if match.groups() else []
                    })
                
                return {
                    'matched': True,
                    'pattern': pattern,
                    'source': source,
                    'range': range_spec,
                    'matches': match_details,
                    'match_count': len(matches),
                    # Keep backward compatibility
                    'match_text': matches[0].group(0),
                    'match_groups': matches[0].groups() if matches[0].groups() else []
                }
            else:
                return {
                    'matched': False,
                    'pattern': pattern,
                    'source': source,
                    'range': range_spec,
                    'matches': []
                }
        except re.error as e:
            self.logger.error(f"Invalid regex pattern '{pattern}': {e}")
            return {
                'matched': False,
                'pattern': pattern,
                'source': source,
                'range': range_spec,
                'error': str(e),
                'matches': []
            }
    
    def apply_range(self, text: str, range_spec: str) -> str:
        """Apply character range to text (e.g., '0-600')"""
        if not range_spec or '-' not in range_spec:
            return text
        
        try:
            start_str, end_str = range_spec.split('-', 1)
            start = int(start_str)
            end = int(end_str)
            
            # Handle negative indices and bounds
            text_len = len(text)
            start = max(0, min(start, text_len))
            end = max(start, min(end, text_len))
            
            return text[start:end]
            
        except (ValueError, IndexError) as e:
            self.logger.warning(f"Invalid range specification '{range_spec}': {e}")
            return text
    
    def find_best_rule(self, rule_evaluations: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Find the best matching rule from evaluations"""
        passing_rules = [rule for rule in rule_evaluations if rule['pass']]
        
        if not passing_rules:
            return None
        
        # Sort by total score (descending) and return the best one
        best_rule = max(passing_rules, key=lambda r: r['total_score'])
        
        return best_rule
    
    def extract_dynamic_values(self, rule: Dict[str, Any], content: str, filename: str) -> Dict[str, Any]:
        """Extract dynamic values from content using rule patterns"""
        dynamic_metadata = rule.get('dynamic_metadata', {})
        extracted_values = {}
        
        for field_name, field_config in dynamic_metadata.items():
            if isinstance(field_config, dict) and 'pattern_after' in field_config:
                pattern = field_config['pattern_after']
                value = self.extract_value_from_pattern(content, pattern)
                if value:
                    extracted_values[field_name] = {
                        'value': value,
                        'pattern': pattern,
                        'format': field_config.get('format', None)
                    }
        
        return extracted_values
    
    def extract_value_from_pattern(self, text: str, pattern: str) -> Optional[str]:
        """Extract a value from text using a regex pattern"""
        try:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                # Return the last capture group, or the whole match if no groups
                groups = match.groups()
                if groups:
                    return groups[-1]
                else:
                    return match.group(0)
            return None
        except re.error as e:
            self.logger.error(f"Invalid regex pattern '{pattern}': {e}")
            return None
    
    def evaluate_rule_v2(self, rule: Dict[str, Any], content: str, filename: str) -> Dict[str, Any]:
        """
        Evaluate rule using POCO Scoring v2 mechanism
        
        Returns match counts for OCR patterns and filename patterns
        """
        rule_id = rule.get('rule_id', 'Unknown')
        rule_name = rule.get('rule_name', 'Unknown')
        
        # Count OCR pattern matches
        ocr_result = self.count_ocr_matches(rule.get('logic_groups', []), content, filename)
        
        # Count filename pattern matches
        filename_result = self.count_filename_matches(rule.get('filename_patterns', []), filename)
        
        return {
            'rule_id': rule_id,
            'rule_name': rule_name,
            'ocr': {
                'matched': ocr_result['matched_count'],
                'total': ocr_result['total_count'],
                'matches': ocr_result['matches']
            },
            'filename': {
                'matched': filename_result['matched_count'],
                'total': filename_result['total_count'],
                'matches': filename_result['matches']
            }
        }
    
    def count_ocr_matches(self, logic_groups: List[Dict[str, Any]], content: str, filename: str) -> Dict[str, Any]:
        """Count how many OCR patterns match"""
        total_count = 0
        matched_count = 0
        all_matches = []
        
        for i, group in enumerate(logic_groups):
            group_type = group.get('type', 'match')
            patterns = group.get('patterns', [])
            is_mandatory = group.get('mandatory', False)
            
            # Count patterns in this group
            pattern_count = len(patterns)
            total_count += pattern_count
            
            # Evaluate patterns
            group_matches = []
            if group_type == 'match':
                # ALL patterns must match
                all_match = True
                for pattern_config in patterns:
                    if self.check_pattern_match(pattern_config, content, filename):
                        group_matches.append(pattern_config.get('text', 'unknown'))
                    else:
                        all_match = False
                
                if all_match:
                    matched_count += pattern_count
                    all_matches.extend(group_matches)
            
            elif group_type == 'or':
                # At least ONE pattern must match
                any_match = False
                for pattern_config in patterns:
                    if self.check_pattern_match(pattern_config, content, filename):
                        group_matches.append(pattern_config.get('text', 'unknown'))
                        any_match = True
                
                if any_match:
                    # For OR groups, count as 1 match (the group as a whole)
                    # But still count all patterns in total
                    matched_count += 1  # Count the group as matched
                    all_matches.extend(group_matches)
        
        return {
            'total_count': total_count,
            'matched_count': matched_count,
            'matches': all_matches
        }
    
    def check_pattern_match(self, pattern_config: Dict[str, Any], content: str, filename: str) -> bool:
        """Check if a single pattern matches"""
        pattern_text = pattern_config.get('text', '')
        range_str = pattern_config.get('range', '')
        
        # Determine search text
        if range_str and '-' in range_str:
            # Extract range
            try:
                start, end = map(int, range_str.split('-'))
                search_text = content[start:end]
            except:
                search_text = content
        else:
            search_text = content
        
        # Check for match
        try:
            match = re.search(pattern_text, search_text, re.IGNORECASE | re.MULTILINE)
            return match is not None
        except re.error:
            return False
    
    def count_filename_matches(self, filename_patterns: List[str], filename: str) -> Dict[str, Any]:
        """Count how many filename patterns match"""
        if not filename_patterns:
            return {
                'total_count': 0,
                'matched_count': 0,
                'matches': []
            }
        
        total_count = len(filename_patterns)
        matched_count = 0
        matches = []
        
        for pattern in filename_patterns:
            try:
                if re.search(pattern, filename, re.IGNORECASE):
                    matched_count += 1
                    matches.append(pattern)
            except re.error:
                continue
        
        return {
            'total_count': total_count,
            'matched_count': matched_count,
            'matches': matches
        }
