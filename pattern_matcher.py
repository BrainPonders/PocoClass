"""
PocoClass - Pattern Matcher (POCO Scoring v2)
Handles logic group evaluation and pattern matching for rule-based document classification
"""

import re
import logging
from typing import Dict, List, Any, Tuple

class PatternMatcher:
    """Handles pattern matching and logic group evaluation for POCO Scoring v2"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def evaluate_rule_v2(self, rule: Dict[str, Any], content: str, filename: str) -> Dict[str, Any]:
        """
        Evaluate rule using POCO Scoring v2 mechanism
        
        Returns match counts for OCR patterns and filename patterns based on:
        - Logic groups in core_identifiers
        - Filename patterns
        """
        rule_id = rule.get('rule_id', 'Unknown')
        rule_name = rule.get('rule_name', 'Unknown')
        
        # Get logic groups from core_identifiers (v2 wizard format)
        logic_groups = rule.get('core_identifiers', {}).get('logic_groups', [])
        
        # Count OCR pattern matches
        ocr_result = self.count_ocr_matches(logic_groups, content, filename)
        
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
    
    def normalize_regex_pattern(self, pattern: str) -> Tuple[str, int]:
        """
        Normalize regex pattern from wizard format (/pattern/flags) to Python format
        
        The wizard UI saves patterns in JavaScript format: /pattern/flags
        This function extracts the raw pattern and converts flags to Python re flags
        
        Args:
            pattern: Pattern string (e.g., '/Rabobank/i' or 'Rabobank')
            
        Returns:
            Tuple of (normalized_pattern, flags)
        """
        # Check if pattern is wrapped in /.../ with optional flags
        if pattern.startswith('/') and '/' in pattern[1:]:
            # Find the last slash
            last_slash_idx = pattern.rfind('/')
            if last_slash_idx > 0:
                # Extract pattern and flags
                raw_pattern = pattern[1:last_slash_idx]
                flags_str = pattern[last_slash_idx + 1:]
                
                # Convert flags
                flags = 0
                if 'i' in flags_str:
                    flags |= re.IGNORECASE
                if 'm' in flags_str:
                    flags |= re.MULTILINE
                if 's' in flags_str:
                    flags |= re.DOTALL
                
                return (raw_pattern, flags)
        
        # Plain pattern - return as-is with default flags
        return (pattern, re.IGNORECASE | re.MULTILINE)
    
    def count_ocr_matches(self, logic_groups: List[Dict[str, Any]], content: str, filename: str) -> Dict[str, Any]:
        """
        Count how many OCR logic groups match
        
        Each logic group counts as 1 unit (regardless of how many conditions it contains).
        Groups can be 'match' type (AND logic - all conditions must match) or 
        'or' type (OR logic - at least one condition must match).
        
        Args:
            logic_groups: List of logic group definitions from rule
            content: Document OCR content
            filename: Document filename
            
        Returns:
            Dict with total_count, matched_count, and detailed matches array
        """
        total_count = 0
        matched_count = 0
        all_matches = []
        
        for i, group in enumerate(logic_groups):
            group_type = group.get('type', 'match')
            conditions = group.get('conditions', [])
            score = group.get('score', 0)
            
            # Each group counts as 1 unit for total (not individual conditions)
            total_count += 1
            
            # Evaluate conditions
            group_matched = False
            if group_type == 'match':
                # ALL conditions must match (AND logic)
                all_match = True
                for condition in conditions:
                    pattern_str = condition.get('pattern', '')
                    if not self.check_pattern_match(pattern_str, condition, content, filename):
                        all_match = False
                        break
                group_matched = all_match
            
            elif group_type == 'or':
                # At least ONE condition must match (OR logic)
                for condition in conditions:
                    pattern_str = condition.get('pattern', '')
                    if self.check_pattern_match(pattern_str, condition, content, filename):
                        group_matched = True
                        break
            
            # Record match result
            group_name = group.get('title', f'Logic Group {i + 1}')
            if group_matched:
                matched_count += 1
                all_matches.append({
                    'name': group_name,
                    'matched': True,
                    'score': score
                })
            else:
                all_matches.append({
                    'name': group_name,
                    'matched': False,
                    'score': 0
                })
        
        return {
            'total_count': total_count,
            'matched_count': matched_count,
            'matches': all_matches
        }
    
    def check_pattern_match(self, pattern_str: str, condition: Dict[str, Any], content: str, filename: str) -> bool:
        """
        Check if a single pattern matches
        
        Supports:
        - Regex patterns in wizard format (/pattern/flags)
        - Source selection (content or filename)
        - Range filtering (percentile-based text slicing)
        
        Args:
            pattern_str: Pattern to match (e.g., '/Rabobank/i')
            condition: Condition config with source and range
            content: Document OCR content
            filename: Document filename
            
        Returns:
            True if pattern matches, False otherwise
        """
        source = condition.get('source', 'content')
        range_str = condition.get('range', '')
        
        # Select text source
        text = content if source == 'content' else filename
        
        # Apply range if specified and using content
        if range_str and source == 'content' and '-' in range_str:
            try:
                # Parse range like "0-25" (percentiles) to actual character positions
                parts = range_str.split('-')
                start_pct = int(parts[0])
                end_pct = int(parts[1])
                
                # Convert percentile to character position
                text_len = len(text)
                start_pos = (start_pct * text_len) // 100
                end_pos = (end_pct * text_len) // 100
                
                text = text[start_pos:end_pos]
            except (ValueError, IndexError):
                pass  # Use full text if range parsing fails
        
        # Normalize regex pattern
        normalized_pattern, flags = self.normalize_regex_pattern(pattern_str)
        
        # Check for match
        try:
            match = re.search(normalized_pattern, text, flags)
            return match is not None
        except re.error as e:
            self.logger.error(f"Invalid regex pattern '{normalized_pattern}': {e}")
            return False
    
    def count_filename_matches(self, filename_patterns: List[str], filename: str) -> Dict[str, Any]:
        """
        Count how many filename patterns match
        
        Supports regex patterns in wizard format (/pattern/flags).
        Each pattern counts as 1 unit.
        
        Args:
            filename_patterns: List of patterns to check
            filename: Document filename
            
        Returns:
            Dict with total_count, matched_count, and detailed matches array
        """
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
                # Normalize regex pattern
                normalized_pattern, flags = self.normalize_regex_pattern(pattern)
                
                match = re.search(normalized_pattern, filename, flags)
                if match:
                    matched_count += 1
                    # Extract the matched value (first group if exists, otherwise full match)
                    extracted_value = match.group(1) if match.groups() else match.group(0)
                    matches.append({
                        'pattern': pattern,
                        'matched': True,
                        'score': 1,
                        'extracted_value': extracted_value
                    })
                else:
                    matches.append({
                        'pattern': pattern,
                        'matched': False,
                        'score': 0,
                        'extracted_value': None
                    })
            except re.error as e:
                self.logger.error(f"Invalid filename pattern '{pattern}': {e}")
                matches.append({
                    'pattern': pattern,
                    'matched': False,
                    'score': 0,
                    'extracted_value': None
                })
        
        return {
            'total_count': total_count,
            'matched_count': matched_count,
            'matches': matches
        }
