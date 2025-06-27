#!/usr/bin/env python3
"""
Debug Pattern Matching for Specific Document
Tests each core identifier individually to identify which one is failing
"""

import re
from typing import Dict, Any
from config import Config
from api_client import PaperlessAPIClient
from rule_loader import RuleLoader
from pattern_matcher import PatternMatcher

def test_individual_patterns():
    """Test each core identifier pattern individually"""
    
    # Initialize components
    config = Config()
    api_client = PaperlessAPIClient(config)
    rule_loader = RuleLoader('rules')
    pattern_matcher = PatternMatcher()
    
    # Get document content
    document_id = 683
    content = api_client.get_document_content(document_id)
    filename = "2025-05-19-NL89RABO0330689592"
    
    if not content:
        print("Failed to fetch document content")
        return
    
    # Load the ExampleBank rule
    rules = rule_loader.load_all_rules()
    examplebank_rule = rules.get('examplebank_check_592')
    
    if not examplebank_rule:
        print("Failed to load ExampleBank rule")
        return
    
    print("="*80)
    print("PATTERN MATCHING DEBUG FOR DOCUMENT 683")
    print("="*80)
    print(f"Content length: {len(content)} characters")
    print(f"Filename: {filename}")
    print()
    
    # Get the core identifiers
    core_identifiers = examplebank_rule.get('core_identifiers', {})
    logic_groups = core_identifiers.get('logic_groups', [])
    
    print(f"Found {len(logic_groups)} core identifier logic groups:")
    print()
    
    total_score = 0
    
    for i, group in enumerate(logic_groups, 1):
        print(f"Core Identifier {i}:")
        print(f"  Type: {group.get('type')}")
        print(f"  Expected Score: {group.get('score')}")
        
        conditions = group.get('conditions', [])
        for j, condition in enumerate(conditions, 1):
            pattern = condition.get('pattern')
            source = condition.get('source')
            range_spec = condition.get('range', '')
            
            print(f"  Condition {j}:")
            print(f"    Pattern: '{pattern}'")
            print(f"    Source: {source}")
            print(f"    Range: {range_spec}")
            
            # Apply range if specified
            if source == 'content':
                test_text = content
                if range_spec:
                    test_text = pattern_matcher.apply_range(content, range_spec)
                    print(f"    Range applied - testing first {len(test_text)} characters")
            else:
                test_text = filename
            
            # Test the pattern
            try:
                if re.search(pattern, test_text, re.IGNORECASE):
                    print(f"    ✓ MATCH FOUND")
                    if group.get('type') == 'match':
                        group_score = group.get('score', 0)
                        total_score += group_score
                        print(f"    Score added: +{group_score}")
                else:
                    print(f"    ✗ NO MATCH")
                    
                    # Show nearby text for debugging
                    if source == 'content' and pattern:
                        print(f"    Debug - searching in text snippet:")
                        search_text = test_text[:600]  # First 600 chars
                        print(f"    '{search_text[:200]}...'")
                        
                        # Try case-insensitive search for partial matches
                        pattern_lower = pattern.lower()
                        text_lower = search_text.lower()
                        
                        if 'examplebank' in pattern_lower and 'examplebank' in text_lower:
                            pos = text_lower.find('examplebank')
                            print(f"    Found 'examplebank' at position {pos}")
                        elif 'rekeningafschrift' in pattern_lower and 'rekeningafschrift' in text_lower:
                            pos = text_lower.find('rekeningafschrift')
                            print(f"    Found 'rekeningafschrift' at position {pos}")
                        elif 'totaalrekening' in pattern_lower and 'totaalrekening' in text_lower:
                            pos = text_lower.find('totaalrekening')
                            print(f"    Found 'totaalrekening' at position {pos}")
                        elif 'nl89' in pattern_lower and 'nl89' in text_lower:
                            pos = text_lower.find('nl89')
                            print(f"    Found 'nl89' at position {pos}")
                            # Show the actual IBAN in the text
                            start = max(0, pos - 10)
                            end = min(len(search_text), pos + 50)
                            print(f"    Context: '{search_text[start:end]}'")
                            # Test the exact pattern match manually
                            iban_text = search_text[pos-5:pos+50]
                            print(f"    IBAN text: '{iban_text}'")
                            # Try different pattern variations
                            patterns_to_test = [
                                r"NL89 ?RABO[0-9\s]{9,12}592",
                                r"NL89 RABO[0-9\s]{9,12}592", 
                                r"NL89.*RABO.*592",
                                r"NL89\s+RABO\s+[0-9\s]+592"
                            ]
                            for test_pattern in patterns_to_test:
                                if re.search(test_pattern, iban_text, re.IGNORECASE):
                                    print(f"    ✓ Pattern '{test_pattern}' MATCHES")
                                else:
                                    print(f"    ✗ Pattern '{test_pattern}' NO MATCH")
                        
            except re.error as e:
                print(f"    ✗ REGEX ERROR: {e}")
        
        print()
    
    print(f"Total Core Score: {total_score}/80")
    print(f"Threshold: 70")
    print(f"Result: {'PASS' if total_score >= 70 else 'FAIL'}")
    print()
    
    # Show the actual rule evaluation for comparison
    print("="*80)
    print("ACTUAL RULE EVALUATION (for comparison):")
    print("="*80)
    
    evaluation = pattern_matcher.evaluate_rule(examplebank_rule, content, filename)
    print(f"Core Score: {evaluation.get('core_score', 0)}")
    print(f"Bonus Score: {evaluation.get('bonus_score', 0)}")
    print(f"Total Score: {evaluation.get('total_score', 0)}")
    print(f"Pass: {evaluation.get('pass', False)}")

if __name__ == "__main__":
    test_individual_patterns()