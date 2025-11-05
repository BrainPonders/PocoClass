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
        core_identifiers = rule.get('core_identifiers', {}) or {}
        logic_groups = core_identifiers.get('logic_groups', []) or []
        
        # Count OCR pattern matches
        ocr_result = self.count_ocr_matches(logic_groups, content, filename)
        
        # Count filename pattern matches
        filename_patterns = rule.get('filename_patterns', []) or []
        filename_result = self.count_filename_matches(filename_patterns, filename)
        
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
            
            # Track condition results for detailed breakdown
            condition_results = []
            
            # Evaluate conditions
            group_matched = False
            if group_type == 'match':
                # ALL conditions must match (AND logic)
                all_match = True
                for condition in conditions:
                    pattern_str = condition.get('pattern', '')
                    match_result = self.check_pattern_match_detailed(pattern_str, condition, content, filename)
                    condition_results.append(match_result)
                    if not match_result['matched']:
                        all_match = False
                group_matched = all_match
            
            elif group_type == 'or':
                # At least ONE condition must match (OR logic)
                for condition in conditions:
                    pattern_str = condition.get('pattern', '')
                    match_result = self.check_pattern_match_detailed(pattern_str, condition, content, filename)
                    condition_results.append(match_result)
                    if match_result['matched']:
                        group_matched = True
            
            # Record match result with condition details
            group_name = group.get('title', f'Logic Group {i + 1}')
            if group_matched:
                matched_count += 1
                all_matches.append({
                    'name': group_name,
                    'matched': True,
                    'score': score,
                    'conditions': condition_results
                })
            else:
                all_matches.append({
                    'name': group_name,
                    'matched': False,
                    'score': 0,
                    'conditions': condition_results
                })
        
        return {
            'total_count': total_count,
            'matched_count': matched_count,
            'matches': all_matches
        }
    
    def check_pattern_match(self, pattern_str: str, condition: Dict[str, Any], content: str, filename: str) -> bool:
        """
        Check if a single pattern matches (boolean only, for backward compatibility)
        
        Args:
            pattern_str: Pattern to match (e.g., '/Rabobank/i')
            condition: Condition config with source and range
            content: Document OCR content
            filename: Document filename
            
        Returns:
            True if pattern matches, False otherwise
        """
        result = self.check_pattern_match_detailed(pattern_str, condition, content, filename)
        return result['matched']
    
    def check_pattern_match_detailed(self, pattern_str: str, condition: Dict[str, Any], content: str, filename: str) -> Dict[str, Any]:
        """
        Check if a single pattern matches and return detailed match information
        
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
            Dict with matched (bool), pattern (str), and matched_text (str or None)
        """
        source = condition.get('source', 'content')
        range_str = condition.get('range', '')
        
        # Select text source
        text = content if source == 'content' else filename
        
        # Apply range if specified and using content
        if range_str and source == 'content' and '-' in range_str:
            try:
                # Parse range like "0-25" (line numbers) to extract specific lines
                parts = range_str.split('-')
                start_line = int(parts[0])
                end_line = int(parts[1])
                
                # Split content into lines
                lines = text.splitlines()
                total_lines = len(lines)
                
                self.logger.info(f"Range filter: '{range_str}' on {total_lines} lines")
                
                # Clamp line numbers to valid range
                start_line = max(0, min(start_line, total_lines))
                end_line = max(0, min(end_line, total_lines))
                
                # Extract the requested line range (inclusive on start, exclusive on end)
                if start_line < end_line:
                    selected_lines = lines[start_line:end_line]
                    text = '\n'.join(selected_lines)
                    self.logger.info(f"Applied range filter: lines {start_line}-{end_line-1}, extracted {len(selected_lines)} lines, {len(text)} chars")
                else:
                    self.logger.info(f"Range invalid after clamping ({start_line} to {end_line}), using full text")
                # If range is invalid, use full text
            except (ValueError, IndexError) as e:
                self.logger.info(f"Range parsing failed for '{range_str}': {e}, using full text")
                pass  # Use full text if range parsing fails
        
        # Normalize regex pattern
        normalized_pattern, flags = self.normalize_regex_pattern(pattern_str)
        
        # Log first 200 chars of text being searched
        text_preview = text[:200].replace('\n', ' ') if text else '(empty)'
        self.logger.info(f"Searching pattern '{pattern_str}' in text preview: '{text_preview}...'")
        
        # DEBUG: Log all lines if range is small (0-25)
        if range_str and range_str == '0-25':
            lines = text.splitlines()
            self.logger.info(f"DEBUG: Searching '{pattern_str}' in {len(lines)} lines:")
            for i, line in enumerate(lines):
                if pattern_str.lower() in line.lower():
                    self.logger.info(f"  Line {i}: FOUND '{pattern_str}' in: {line[:80]}")
            
            # Log the actual regex being used
            flag_names = []
            if flags & re.IGNORECASE: flag_names.append('IGNORECASE')
            if flags & re.MULTILINE: flag_names.append('MULTILINE')
            if flags & re.DOTALL: flag_names.append('DOTALL')
            self.logger.info(f"DEBUG: Using regex pattern='{normalized_pattern}', flags={flag_names}")
        
        # Check for match
        try:
            match = re.search(normalized_pattern, text, flags)
            
            # DEBUG: Log regex result
            if range_str and range_str == '0-25':
                if match:
                    self.logger.info(f"DEBUG: re.search() FOUND match: '{match.group(0)[:50]}'")
                else:
                    self.logger.info(f"DEBUG: re.search() returned NO MATCH")
            
            if match:
                matched_text = match.group(0)
                # Truncate if too long
                if len(matched_text) > 50:
                    matched_text = matched_text[:47] + '...'
                return {
                    'matched': True,
                    'pattern': pattern_str,
                    'matched_text': matched_text
                }
            else:
                return {
                    'matched': False,
                    'pattern': pattern_str,
                    'matched_text': None
                }
        except re.error as e:
            self.logger.error(f"Invalid regex pattern '{normalized_pattern}': {e}")
            return {
                'matched': False,
                'pattern': pattern_str,
                'matched_text': None,
                'error': str(e)
            }
    
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
