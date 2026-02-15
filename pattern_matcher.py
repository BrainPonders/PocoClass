"""
PocoClass - Pattern Matcher (POCO Scoring v2)

Provides regex-based pattern matching for document classification.  This module
evaluates OCR content and filenames against rule-defined logic groups and
filename patterns, returning structured match counts consumed by the scoring
calculator.

Key capabilities:
    - Logic group evaluation with AND (match_all) and OR (match) semantics
    - Regex normalisation from JavaScript-style /pattern/flags to Python re
    - Line-range filtering so patterns can target specific document regions
    - Filename pattern matching with capture-group extraction

Key class:
    PatternMatcher: Stateless matcher used by TestEngine and background processor.
"""

import re
import logging
from typing import Dict, List, Any, Tuple

class PatternMatcher:
    """Evaluates regex patterns against document content and filenames.

    Each public method returns structured dictionaries with match counts
    and detailed per-pattern results so callers can build score breakdowns.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def evaluate_rule_v2(self, rule: Dict[str, Any], content: str, filename: str) -> Dict[str, Any]:
        """
        Evaluate a rule against a document using POCO Scoring v2 semantics.

        Runs both OCR logic-group matching and filename pattern matching,
        returning aggregate counts that feed into the scoring calculator.
        
        Args:
            rule: Parsed YAML rule dictionary.
            content: Full OCR text content of the document.
            filename: Original filename of the document.

        Returns:
            Dict with 'ocr' and 'filename' sub-dicts containing matched/total
            counts and detailed match arrays.
        """
        rule_id = rule.get('rule_id', 'Unknown')
        rule_name = rule.get('rule_name', 'Unknown')
        
        # Logic groups live under core_identifiers in v2 wizard-generated rules
        core_identifiers = rule.get('core_identifiers', {}) or {}
        logic_groups = core_identifiers.get('logic_groups', []) or []
        
        ocr_result = self.count_ocr_matches(logic_groups, content, filename)
        
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
        Convert a regex pattern from wizard format (/pattern/flags) to Python.
        
        The wizard UI stores patterns in JavaScript notation (e.g. /Rabobank/i).
        This method extracts the raw pattern and maps JS flags to Python re flags.
        Plain strings without slashes are returned with sensible defaults.
        
        Args:
            pattern: Pattern string, either '/regex/flags' or a plain string.
            
        Returns:
            Tuple of (raw_pattern, compiled_re_flags).
        """
        # Detect JavaScript-style /pattern/flags format
        if pattern.startswith('/') and '/' in pattern[1:]:
            last_slash_idx = pattern.rfind('/')
            if last_slash_idx > 0:
                raw_pattern = pattern[1:last_slash_idx]
                flags_str = pattern[last_slash_idx + 1:]
                
                # Map JS regex flags to Python re constants
                flags = 0
                if 'i' in flags_str:
                    flags |= re.IGNORECASE
                if 'm' in flags_str:
                    flags |= re.MULTILINE
                if 's' in flags_str:
                    flags |= re.DOTALL
                
                return (raw_pattern, flags)
        
        # Plain pattern – default to case-insensitive multiline matching
        return (pattern, re.IGNORECASE | re.MULTILINE)
    
    def count_ocr_matches(self, logic_groups: List[Dict[str, Any]], content: str, filename: str) -> Dict[str, Any]:
        """
        Count how many OCR logic groups match the document.
        
        Each logic group counts as exactly 1 unit regardless of how many
        conditions it contains.  This keeps the scoring proportional to the
        number of *concepts* identified rather than the number of patterns.
        
        Group types:
            - 'match_all' (AND): ALL conditions must match for the group to pass.
            - 'match' / 'or' (OR): At least ONE condition must match.
        
        Args:
            logic_groups: List of logic group dicts from the rule.
            content: Document OCR content.
            filename: Document filename (some conditions target the filename).
            
        Returns:
            Dict with total_count, matched_count, and a detailed matches array.
        """
        total_count = 0
        matched_count = 0
        all_matches = []
        
        for i, group in enumerate(logic_groups):
            group_type = group.get('type', 'match')
            conditions = group.get('conditions', [])
            score = group.get('score', 0)
            
            # Each group is 1 scoring unit
            total_count += 1
            
            condition_results = []
            
            group_matched = False
            if group_type == 'match_all':
                # AND logic – every condition in the group must match
                all_match = True
                for condition in conditions:
                    pattern_str = condition.get('pattern', '')
                    match_result = self.check_pattern_match_detailed(pattern_str, condition, content, filename)
                    condition_results.append(match_result)
                    if not match_result['matched']:
                        all_match = False
                group_matched = all_match
            
            else:
                # OR logic – any single condition matching is sufficient
                for condition in conditions:
                    pattern_str = condition.get('pattern', '')
                    match_result = self.check_pattern_match_detailed(pattern_str, condition, content, filename)
                    condition_results.append(match_result)
                    if match_result['matched']:
                        group_matched = True
            
            group_name = group.get('title', f'Logic Group {i + 1}')
            
            if group_matched:
                matched_count += 1
                all_matches.append({
                    'name': group_name,
                    'matched': True,
                    'score': score,
                    'group_type': group_type,
                    'conditions': condition_results
                })
            else:
                all_matches.append({
                    'name': group_name,
                    'matched': False,
                    'score': 0,
                    'group_type': group_type,
                    'conditions': condition_results
                })
        
        return {
            'total_count': total_count,
            'matched_count': matched_count,
            'matches': all_matches
        }
    
    def check_pattern_match(self, pattern_str: str, condition: Dict[str, Any], content: str, filename: str) -> bool:
        """
        Check if a single pattern matches (boolean-only wrapper).

        Thin convenience method for callers that only need a True/False result
        without the detailed match information.
        
        Args:
            pattern_str: Pattern to match (e.g., '/Rabobank/i').
            condition: Condition config with source and range.
            content: Document OCR content.
            filename: Document filename.
            
        Returns:
            True if pattern matches, False otherwise.
        """
        result = self.check_pattern_match_detailed(pattern_str, condition, content, filename)
        return result['matched']
    
    def check_pattern_match_detailed(self, pattern_str: str, condition: Dict[str, Any], content: str, filename: str) -> Dict[str, Any]:
        """
        Check a single pattern and return detailed match information.
        
        Supports:
            - Regex patterns in wizard format (/pattern/flags)
            - Source selection: match against 'content' (OCR text) or 'filename'
            - Range filtering: restrict matching to specific line ranges
        
        Args:
            pattern_str: Pattern to match (e.g., '/Rabobank/i').
            condition: Condition config with 'source' and optional 'range'.
            content: Full document OCR content.
            filename: Document filename.
            
        Returns:
            Dict with 'matched' (bool), 'pattern', 'matched_text', and
            optionally 'error' if the regex was invalid.
        """
        source = condition.get('source', 'content')
        range_str = condition.get('range', '')
        
        # Choose text to search based on the condition's source setting
        text = content if source == 'content' else filename
        
        # Apply line-range filter when specified (only meaningful for content)
        if range_str and source == 'content' and '-' in range_str:
            try:
                parts = range_str.split('-')
                start_line = int(parts[0])
                end_line = int(parts[1])
                
                lines = text.splitlines()
                total_lines = len(lines)
                
                self.logger.info(f"Range filter: '{range_str}' on {total_lines} lines")
                
                # Clamp to valid bounds to avoid index errors
                start_line = max(0, min(start_line, total_lines))
                end_line = max(0, min(end_line, total_lines))
                
                if start_line < end_line:
                    selected_lines = lines[start_line:end_line]
                    text = '\n'.join(selected_lines)
                    self.logger.info(f"Applied range filter: lines {start_line}-{end_line-1}, extracted {len(selected_lines)} lines, {len(text)} chars")
                else:
                    self.logger.info(f"Range invalid after clamping ({start_line} to {end_line}), using full text")
            except (ValueError, IndexError) as e:
                # Gracefully fall back to full text on malformed range strings
                self.logger.info(f"Range parsing failed for '{range_str}': {e}, using full text")
                pass
        
        # Convert wizard-format regex to Python regex
        normalized_pattern, flags = self.normalize_regex_pattern(pattern_str)
        
        text_preview = text[:200].replace('\n', ' ') if text else '(empty)'
        self.logger.info(f"Searching pattern '{pattern_str}' in text preview: '{text_preview}...'")
        
        try:
            match = re.search(normalized_pattern, text, flags)
            
            if match:
                matched_text = match.group(0)
                # Truncate long matches for readability in results
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
        Count how many filename patterns match the document filename.
        
        Each pattern counts as 1 unit.  If a pattern contains a capture group,
        the first group's value is extracted; otherwise the full match is used.
        
        Args:
            filename_patterns: List of regex patterns to check.
            filename: Document filename to match against.
            
        Returns:
            Dict with total_count, matched_count, and detailed matches array
            including extracted values from capture groups.
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
                normalized_pattern, flags = self.normalize_regex_pattern(pattern)
                
                match = re.search(normalized_pattern, filename, flags)
                if match:
                    matched_count += 1
                    # Prefer first capture group if present, otherwise full match
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
