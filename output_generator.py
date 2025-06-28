"""
Output Generator
Handles all output formatting, logging, and report generation
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from tabulate import tabulate

# ANSI color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'
    
    @staticmethod
    def green(text):
        return f"{Colors.GREEN}{text}{Colors.END}"
    
    @staticmethod
    def red(text):
        return f"{Colors.RED}{text}{Colors.END}"
    
    @staticmethod
    def blue(text):
        return f"{Colors.BLUE}{text}{Colors.END}"
    
    @staticmethod
    def yellow(text):
        return f"{Colors.YELLOW}{text}{Colors.END}"
    
    @staticmethod
    def bold(text):
        return f"{Colors.BOLD}{text}{Colors.END}"
    
    @staticmethod
    def cyan(text):
        return f"{Colors.CYAN}{text}{Colors.END}"

class OutputGenerator:
    """Generates formatted output and logs"""
    
    def __init__(self, verbose: bool = False, debug: bool = False):
        self.verbose = verbose
        self.debug = debug
        self.logger = logging.getLogger(__name__)
    
    def generate_document_output(self, doc_dict: Dict[str, Any], dry_run: bool = False) -> None:
        """Generate output for a single document"""
        doc_id = doc_dict.get('id', 'Unknown')
        title = doc_dict.get('title', 'Unknown')
        filename = doc_dict.get('filename', 'Unknown')
        raw_api_doc = doc_dict.get('raw_api_doc', {})
        original_filename = raw_api_doc.get('original_filename', filename)
        selected_rule = doc_dict.get('selected_rule', {})
        poco_summary = doc_dict.get('poco_summary', {})
        
        # Add spacing and header
        print()
        print()
        
        from datetime import datetime
        current_time = datetime.now().strftime("%Y-%m-%d @ %H:%M:%S")
        mode_text = "[DRY RUN] " if dry_run else ""
        
        print(f"== {mode_text}{current_time} " + "="*34)
        print(f"Document {doc_id}: {filename}")
        print(f"  Original Filename: {original_filename}")
        
        if selected_rule.get('pass', False):
            print(f"  Rule: {selected_rule.get('rule_name', 'Unknown')} ({selected_rule.get('total_score', 0)}/{selected_rule.get('threshold', 0)})")
            print(f"  POCO Score: {poco_summary.get('final_score', 0)}% ({'PASS' if poco_summary.get('pass', False) else 'FAIL'})")
        else:
            print(f"  Rule: NO MATCHING RULE")
        
        print("="*64)
        
        # Verbose output
        if self.verbose:
            self.generate_verbose_output(doc_dict, dry_run)
        
        print()  # Empty line for readability
    
    def generate_verbose_output(self, doc_dict: Dict[str, Any], dry_run: bool = False) -> None:
        """Generate detailed verbose output for a document"""
        print("  " + "="*60)
        
        # Rule evaluations table
        rule_evaluations = doc_dict.get('rule_evaluations', [])
        if rule_evaluations:
            self.print_rule_evaluations_table(rule_evaluations)
        
        # Pattern matching details for verbose/debug output
        if self.verbose or self.debug:
            self.print_pattern_matching_details(doc_dict)
        
        print()  # Extra spacing between tables
        print()
        
        # Metadata comparison table
        self.print_metadata_comparison_table(doc_dict)
        
        print()  # Extra spacing between tables
        print()
        
        # Rule Review Table (comprehensive scoring view - replaces POCO scoring details)
        self.print_rule_review_table(doc_dict)
        
        print()  # Extra spacing between tables
        print()
        
        # Final metadata updates section
        self.print_final_metadata_updates(doc_dict, dry_run)
        
        print("  " + "="*60)
    
    def print_rule_evaluations_table(self, rule_evaluations: List[Dict[str, Any]]) -> None:
        """Print table of rule evaluations with enhanced formatting"""
        print()
        print("    " + Colors.bold(Colors.cyan("📋 RULE EVALUATIONS")))
        print("    " + "─" * 105)
        
        headers = [
            Colors.bold("Rule ID"), 
            Colors.bold("Rule Name"), 
            Colors.bold("Core"), 
            Colors.bold("Bonus"), 
            Colors.bold("Total"), 
            Colors.bold("Threshold"), 
            Colors.bold("Result")
        ]
        rows = []
        
        for rule_eval in rule_evaluations:
            is_pass = rule_eval.get('pass', False)
            total_score = rule_eval.get('total_score', 0)
            
            # Color coding for results
            if is_pass:
                status = Colors.green("✓ PASS")
                total_colored = Colors.green(f"{total_score:>3}")
            else:
                status = Colors.red("✗ FAIL")
                total_colored = Colors.red(f"{total_score:>3}")
            
            rows.append([
                Colors.blue(rule_eval.get('rule_id', '')),
                rule_eval.get('rule_name', ''),
                f"{rule_eval.get('core_score', 0):>3}",
                f"{rule_eval.get('bonus_score', 0):>3}",
                total_colored,
                f"{rule_eval.get('threshold', 0):>3}",
                status
            ])
        
        table = tabulate(rows, headers=headers, tablefmt="simple", 
                         colalign=("left", "left", "center", "center", "center", "center", "center"))
        for line in table.split('\n'):
            print("      " + line)
        print()

    def print_pattern_matching_details(self, doc_dict: Dict[str, Any]) -> None:
        """Print detailed pattern matching information for rule development"""
        selected_rule = doc_dict.get('selected_rule')
        if not selected_rule:
            return
            
        rule_evaluation = selected_rule.get('evaluation', {})
        rule_id = selected_rule.get('rule_id', 'unknown')
        rule_name = selected_rule.get('rule_name', 'Unknown Rule')
        
        print("    " + Colors.bold(Colors.cyan("🔍 PATTERN MATCHING DETAILS")) + f" ({rule_id})")
        print("    " + "─" * 100)
        print()
        
        # Core identifiers section
        core_details = rule_evaluation.get('core_identifiers', {})
        core_score = core_details.get('total_score', 0)
        core_threshold = core_details.get('threshold', 70)
        core_passed = core_details.get('passed', False)
        
        status_color = Colors.green if core_passed else Colors.red
        status_text = "PASS" if core_passed else "FAIL"
        
        print("    " + Colors.bold(f"CORE IDENTIFIERS ({core_score}/{core_threshold} points - {status_color(status_text)})"))
        
        # Print each core logic group with simple formatting
        logic_groups = core_details.get('logic_groups', [])
        for i, group in enumerate(logic_groups, 1):
            self._print_simple_group(group, f"Core Group {i}")
        
        print()
        
        # Bonus identifiers section
        bonus_details = rule_evaluation.get('bonus_identifiers', {})
        if bonus_details:
            bonus_score = bonus_details.get('total_score', 0)
            bonus_threshold = bonus_details.get('threshold', 0)
            bonus_passed = bonus_details.get('passed', False)
            
            status_color = Colors.green if bonus_passed else Colors.red
            status_text = "PASS" if bonus_passed else "FAIL"
            
            print("    " + Colors.bold(f"BONUS IDENTIFIERS ({bonus_score}/{bonus_threshold} points - {status_color(status_text)})"))
            
            # Print each bonus logic group with simple formatting
            logic_groups = bonus_details.get('logic_groups', [])
            for i, group in enumerate(logic_groups, 1):
                self._print_simple_group(group, f"Bonus Group {i}")
        
        # Metadata extraction details
        self._print_metadata_extraction_details(doc_dict)
        
    def _print_simple_group(self, group: Dict[str, Any], group_name: str) -> None:
        """Print details for a single logic group with proper table formatting"""
        score = group.get('score', 0)
        max_score = group.get('max_score', 0)
        passed = group.get('passed', False)
        group_title = group.get('title', group_name)
        
        status_symbol = "✓" if passed else "✗"
        status_color = Colors.green if passed else Colors.red
        status_text = f"{status_symbol} MATCH" if passed else f"{status_symbol} FAIL"
        
        # Fixed width table with proper borders - match METADATA COMPARISON table width
        width = 120
        
        # Top border
        print("    ┌" + "─" * (width - 2) + "┐")
        
        # Header line with proper padding calculation (ignoring color codes)
        header_plain_text = f" {group_title}: ({score}/{max_score} points) - {status_text}"
        padding_needed = width - len(header_plain_text) - 2
        print(f"    │ {group_title}: ({score}/{max_score} points) - {status_color(status_text)}" + " " * padding_needed + "│")
        
        # Process each condition
        conditions = group.get('conditions', [])
        for condition in conditions:
            pattern = condition.get('pattern', 'unknown')
            source = condition.get('source', 'content')
            range_spec = condition.get('range', 'full')
            matched = condition.get('matched', False)
            matches = condition.get('matches', [])
            
            cond_status_symbol = "✓" if matched else "✗"
            cond_status_color = Colors.green if matched else Colors.red
            
            # Pattern line with proper formatting
            source_info = source if range_spec == 'full' else f"{source}, {range_spec}"
            # Calculate padding based on plain text without color codes
            pattern_plain_text = f"   {cond_status_symbol} Pattern: \"{pattern}\" ({source_info})"
            
            # Truncate if too long
            max_pattern_len = width - 5
            if len(pattern_plain_text) > max_pattern_len:
                pattern_plain_text = pattern_plain_text[:max_pattern_len-3] + "..."
                pattern = pattern[:max_pattern_len-30] + "..." if len(pattern) > max_pattern_len-25 else pattern
            
            # Calculate exact padding needed (accounting for the fact that we're replacing plain symbol with colored symbol)
            pattern_padding = width - len(pattern_plain_text) - 2
            print(f"    │   {cond_status_color(cond_status_symbol)} Pattern: \"{pattern}\" ({source_info})" + " " * max(0, pattern_padding) + "│")
            
            # Match details
            if matched and matches:
                if len(matches) == 1:
                    match_info = matches[0]
                    position = match_info.get('position', 'unknown')
                    context = match_info.get('context', '')
                    
                    # Clean context by replacing newlines and extra whitespace
                    context = context.replace('\n', ' ').replace('\r', ' ')
                    # Collapse multiple spaces into single spaces
                    context = ' '.join(context.split())
                    
                    # Truncate context to fit
                    max_context_len = width - 30
                    if len(context) > max_context_len:
                        context = context[:max_context_len-3] + "..."
                    
                    detail_plain_text = f"     Found at position {position}: \"{context}\""
                    detail_padding = width - len(detail_plain_text) - 2
                    print(f"    │     Found at position {position}: \"{context}\"" + " " * max(0, detail_padding) + "│")
                else:
                    multi_plain_text = f"     Found {len(matches)} matches at multiple positions"
                    multi_padding = width - len(multi_plain_text) - 2
                    print(f"    │     Found {len(matches)} matches at multiple positions" + " " * max(0, multi_padding) + "│")
            elif not matched:
                no_match_plain_text = "     No matches found"
                no_match_padding = width - len(no_match_plain_text) - 2
                print(f"    │     No matches found" + " " * max(0, no_match_padding) + "│")
        
        # Bottom border
        print("    └" + "─" * (width - 2) + "┘")
        print()
        

            
    def _print_metadata_extraction_details(self, doc_dict: Dict[str, Any]) -> None:
        """Print metadata extraction details"""
        rule_metadata = doc_dict.get('rule_metadata', {})
        dynamic_extractions = []
        
        # Look for dynamic metadata with extraction details
        for field, value in rule_metadata.items():
            if isinstance(value, dict) and 'extracted_from' in value:
                dynamic_extractions.append((field, value))
        
        if dynamic_extractions:
            print()
            print("    " + Colors.bold(Colors.cyan("🔧 METADATA EXTRACTION DETAILS")))
            print("    " + "─" * 100)
            print("    " + Colors.bold("DYNAMIC METADATA EXTRACTED:"))
            
            box_width = 100
            for field, details in dynamic_extractions:
                field_name = field.replace('_', ' ').title()
                extracted_value = details.get('value', 'N/A')
                pattern = details.get('pattern', 'N/A')
                source = details.get('source', 'content')
                raw_match = details.get('raw_match', '')
                position = details.get('position', 'unknown')
                
                print("    ┌" + "─" * (box_width - 2) + "┐")
                
                # Field name and value
                field_text = f" {field_name}: \"{extracted_value}\""
                field_padding = box_width - len(field_text) - 2
                print(f"    │{field_text}" + " " * max(0, field_padding) + "│")
                
                # Pattern info
                pattern_text = f"   Pattern: \"{pattern}\" from {source}"
                pattern_padding = box_width - len(pattern_text) - 2
                print(f"    │{pattern_text}" + " " * max(0, pattern_padding) + "│")
                
                # Raw match conversion if different
                if raw_match and raw_match != extracted_value:
                    raw_text = f"   Raw match: \"{raw_match}\" → Converted to: \"{extracted_value}\""
                    # Truncate if too long
                    max_raw_len = box_width - 5
                    if len(raw_text) > max_raw_len:
                        raw_text = raw_text[:max_raw_len-3] + "..."
                    raw_padding = box_width - len(raw_text) - 2
                    print(f"    │{raw_text}" + " " * max(0, raw_padding) + "│")
                
                # Position info
                if position != 'unknown':
                    pos_text = f"   Found at position: {position}"
                    pos_padding = box_width - len(pos_text) - 2
                    print(f"    │{pos_text}" + " " * max(0, pos_padding) + "│")
                    
                print("    └" + "─" * (box_width - 2) + "┘")
            print()
    
    def print_metadata_comparison_table(self, doc_dict: Dict[str, Any]) -> None:
        """Print metadata comparison across sources with enhanced formatting"""
        print()
        print("    " + Colors.bold(Colors.cyan("🔍 METADATA COMPARISON")))
        print("    " + "─" * 120)
        
        headers = [
            Colors.bold("Field"), 
            Colors.bold("Content"), 
            Colors.bold("Filename"), 
            Colors.bold("Paperless"), 
            Colors.bold("Selected")
        ]
        rows = []
        
        # Standardized field order as requested
        fields = [
            ('date_created', 'Date Created'),
            ('correspondent', 'Correspondent'), 
            ('document_type', 'Document Type'),
            ('tags', 'Tags'),
            ('Document Category', 'CF: Document Category'),
            ('POCO Score', 'CF: POCO Score')
        ]
        
        for field_key, field_display in fields:
            if field_key.startswith('CF:') or field_display.startswith('CF:'):
                # Handle custom fields
                cf_name = field_key if not field_key.startswith('CF:') else field_key[4:]
                content_val = self.get_custom_field_value(doc_dict.get('content_metadata', {}), cf_name)
                filename_val = self.get_custom_field_value(doc_dict.get('filename_metadata', {}), cf_name)
                paperless_val = self.get_custom_field_value(doc_dict.get('paperless_metadata', {}), cf_name)
            else:
                # Handle regular fields
                content_val = self.get_display_value(doc_dict.get('content_metadata', {}), field_key)
                filename_val = self.get_display_value(doc_dict.get('filename_metadata', {}), field_key)
                paperless_val = self.get_display_value(doc_dict.get('paperless_metadata', {}), field_key)
            
            # Color coding: Content is green baseline, others green if matching, red if different
            content_colored = Colors.green(self.truncate_value(content_val, 28)) if content_val else Colors.red("—")
            
            # Filename: green if matches content, red if different, red dash if empty
            if filename_val:
                if filename_val == content_val:
                    filename_colored = Colors.green(self.truncate_value(filename_val, 28))
                else:
                    filename_colored = Colors.red(self.truncate_value(filename_val, 28))
            else:
                filename_colored = Colors.red("—")
            
            # Paperless: green if matches content, red if different, red dash if empty
            if paperless_val:
                if paperless_val == content_val:
                    paperless_colored = Colors.green(self.truncate_value(paperless_val, 28))
                else:
                    paperless_colored = Colors.red(self.truncate_value(paperless_val, 28))
            else:
                paperless_colored = Colors.red("—")
            
            # Selected value (priority: content > filename > paperless)
            selected_val = content_val or filename_val or paperless_val
            selected_colored = Colors.bold(Colors.cyan(self.truncate_value(selected_val, 28))) if selected_val else Colors.red("—")
            
            rows.append([
                Colors.bold(field_display),
                content_colored,
                filename_colored,
                paperless_colored,
                selected_colored
            ])
        
        table = tabulate(rows, headers=headers, tablefmt="simple", 
                         colalign=("left", "left", "left", "left", "left"))
        for line in table.split('\n'):
            print("      " + line)
        print()
    
    def print_poco_scoring_table(self, doc_dict: Dict[str, Any]) -> None:
        """Print POCO scoring details"""
        headers = ["Field", "Content", "Filename", "Paperless", "Total", "Reason"]
        rows = []
        
        poco_details = doc_dict.get('poco_score_details', {})
        
        for field, details in poco_details.items():
            content_score = details.get('content', {}).get('score', 0)
            filename_score = details.get('filename', {}).get('score', 0)
            paperless_score = details.get('paperless', {}).get('score', 0)
            total_score = details.get('total', 0)
            reason = details.get('match_reason', 'none')
            
            rows.append([
                field.replace('_', ' ').title(),
                f"{content_score}",
                f"{filename_score}",
                f"{paperless_score}",
                f"{total_score}",
                reason
            ])
        
        print("    " + tabulate(rows, headers=headers, tablefmt="simple"))
    
    def print_rule_review_table(self, doc_dict: Dict[str, Any]) -> None:
        """Print rule review table showing confidence scoring breakdown with enhanced formatting"""
        print()
        print("    " + Colors.bold(Colors.cyan("📊 CONFIDENCE SCORING")))
        print("    " + "─" * 120)
        
        headers = [
            Colors.bold("Field"), 
            Colors.bold("Content"), 
            Colors.bold("Filename"), 
            Colors.bold("Paperless"), 
            Colors.bold("Final Score")
        ]
        rows = []
        
        poco_details = doc_dict.get('poco_score_details', {})
        poco_summary = doc_dict.get('poco_summary', {})
        rule_threshold = poco_summary.get('rule_threshold', 70)
        
        # Standardized field order matching metadata comparison table
        fields = [
            ('date_created', 'Date Created'),
            ('correspondent', 'Correspondent'), 
            ('document_type', 'Document Type'),
            ('tags', 'Tags'),
            ('Document Category', 'CF: Document Category'),
            ('POCO Score', 'CF: POCO Score')
        ]
        
        for field_key, field_display in fields:
            details = poco_details.get(field_key, {})
            rule_score = details.get('rule_score', 0)
            filename_score = details.get('filename_score', 0)
            paperless_score = details.get('paperless_score', 0)
            final_score = details.get('final_score', 0)
            
            # Color coding: Content (rule) is green baseline, others green if positive, red if negative/zero
            rule_colored = Colors.green(f"{rule_score:>3}")
            
            # Filename: green if positive, red if zero/negative
            if filename_score > 0:
                filename_colored = Colors.green(f"{filename_score:>+3}")
            else:
                filename_colored = Colors.red(f"{filename_score:>3}")
            
            # Paperless: green if positive, red if zero/negative
            if paperless_score > 0:
                paperless_colored = Colors.green(f"{paperless_score:>+3}")
            else:
                paperless_colored = Colors.red(f"{paperless_score:>3}")
            
            # Final score color based on threshold
            if final_score >= rule_threshold:
                final_colored = Colors.bold(Colors.green(f"{final_score:>3}"))
            else:
                final_colored = Colors.bold(Colors.red(f"{final_score:>3}"))
            
            rows.append([
                Colors.bold(field_display),
                rule_colored,
                filename_colored,
                paperless_colored,
                final_colored
            ])
        
        table = tabulate(rows, headers=headers, tablefmt="simple", colalign=("left", "center", "center", "center", "center"))
        for line in table.split('\n'):
            print("      " + line)
        
        # Add summary information with colors
        final_poco_score = poco_summary.get('final_score', 0)
        should_continue = poco_summary.get('should_continue_processing', False)
        
        print()
        print("      " + Colors.bold(f"Final POCO Score: {Colors.cyan(str(final_poco_score))} (Lowest final score)"))
        print("      " + Colors.bold(f"Rule Threshold: {Colors.yellow(str(rule_threshold))}"))
        status_color = Colors.green if should_continue else Colors.red
        status_text = "CONTINUE" if should_continue else "ABORT - Apply POCO tag only"
        print("      " + Colors.bold(f"Processing Status: {status_color(status_text)}"))
        print()
    
    def print_final_metadata_updates(self, doc_dict: Dict[str, Any], dry_run: bool = False) -> None:
        """Print final metadata updates that will be sent to Paperless"""
        print()
        print("    " + Colors.bold(Colors.cyan("📤 FINAL METADATA UPDATES")))
        print("    " + "─" * 120)
        
        # Get current Paperless metadata and selected metadata
        paperless_metadata = doc_dict.get('paperless_metadata', {})
        selected_rule = doc_dict.get('selected_rule', {})
        content_metadata = doc_dict.get('content_metadata', {})
        filename_metadata = doc_dict.get('filename_metadata', {})
        
        # Determine what will be sent to Paperless (based on POCO scoring)
        poco_summary = doc_dict.get('poco_summary', {})
        should_continue = poco_summary.get('should_continue_processing', False)
        
        if not should_continue:
            print("    " + Colors.yellow("⚠️  Low confidence - Only POCO tag will be added"))
            print("    " + f"POCO Score: {poco_summary.get('final_score', 0)}")
            print()
            return
        
        print("    " + Colors.green("✓ High confidence - Full metadata update"))
        print()
        
        # Show what will be updated
        updates = {}
        
        # Date Created
        current_date = self.get_display_value(paperless_metadata, 'date_created')
        new_date = self.get_display_value(content_metadata, 'date_created') or self.get_display_value(filename_metadata, 'date_created')
        if new_date:
            updates['Date Created'] = {
                'current': current_date,
                'new': new_date,
                'changed': current_date != new_date
            }
        
        # Correspondent
        current_corr = self.get_display_value(paperless_metadata, 'correspondent')
        new_corr = self.get_display_value(content_metadata, 'correspondent') or self.get_display_value(filename_metadata, 'correspondent')
        if new_corr:
            updates['Correspondent'] = {
                'current': current_corr,
                'new': new_corr,
                'changed': current_corr != new_corr
            }
        
        # Document Type
        current_type = self.get_display_value(paperless_metadata, 'document_type')
        new_type = self.get_display_value(content_metadata, 'document_type') or self.get_display_value(filename_metadata, 'document_type')
        if new_type:
            updates['Document Type'] = {
                'current': current_type,
                'new': new_type,
                'changed': current_type != new_type
            }
        
        # Tags (always add POCO tag)
        current_tags = paperless_metadata.get('tags', [])
        content_tags = content_metadata.get('tags', [])
        filename_tags = filename_metadata.get('tags', [])
        
        # Combine all tags and add POCO
        new_tags = []
        if isinstance(current_tags, list):
            new_tags.extend([tag['name'] if isinstance(tag, dict) else str(tag) for tag in current_tags])
        elif current_tags:
            new_tags.append(str(current_tags))
        
        # Add content/filename tags
        for tag_list in [content_tags, filename_tags]:
            if isinstance(tag_list, list):
                for tag in tag_list:
                    tag_name = tag if isinstance(tag, str) else str(tag)
                    if tag_name and tag_name not in new_tags:
                        new_tags.append(tag_name)
        
        # Add POCO tag
        if 'POCO' not in new_tags:
            new_tags.append('POCO')
        
        updates['Tags'] = {
            'current': ', '.join([tag['name'] if isinstance(tag, dict) else str(tag) for tag in current_tags]) if current_tags else '—',
            'new': ', '.join(new_tags),
            'changed': True  # Always changed because we add POCO
        }
        
        # Custom Fields
        current_custom = paperless_metadata.get('custom_fields', [])
        content_custom = content_metadata.get('custom_fields', [])
        
        custom_updates = {}
        
        # Add content custom fields
        if isinstance(content_custom, list):
            for field in content_custom:
                if isinstance(field, dict) and 'name' in field:
                    custom_updates[field['name']] = field.get('value', '')
        
        # Add POCO Score
        custom_updates['POCO Score'] = str(poco_summary.get('final_score', 0))
        
        if custom_updates:
            current_custom_display = []
            if isinstance(current_custom, list):
                for field in current_custom:
                    if isinstance(field, dict) and 'name' in field:
                        current_custom_display.append(f"{field['name']}: {field.get('value', '')}")
            
            new_custom_display = []
            for name, value in custom_updates.items():
                new_custom_display.append(f"{name}: {value}")
            
            updates['Custom Fields'] = {
                'current': '; '.join(current_custom_display) if current_custom_display else '—',
                'new': '; '.join(new_custom_display),
                'changed': True  # Always changed because we add POCO Score
            }
        
        # Print updates in a clean format
        for field_name, field_data in updates.items():
            current_val = field_data['current']
            new_val = field_data['new']
            is_changed = field_data['changed']
            
            print(f"    {Colors.bold(field_name + ':'):.<25}", end='')
            
            if is_changed:
                if current_val and current_val != '—':
                    print(f" {Colors.red(current_val)} → {Colors.green(new_val)}")
                else:
                    print(f" {Colors.green(new_val)} {Colors.green('(NEW)')}")
            else:
                print(f" {Colors.blue(new_val)} {Colors.blue('(unchanged)')}")
        
        print()
        if dry_run:
            print("    " + Colors.yellow("💡 DRY RUN - No actual changes will be made"))
        else:
            print("    " + Colors.green("🚀 These updates will be sent to Paperless"))
        print()
    
    def get_display_value(self, metadata: Dict[str, Any], field: str) -> str:
        """Get display value for a metadata field"""
        if field not in metadata:
            return ""
        
        field_data = metadata[field]
        
        if isinstance(field_data, dict):
            # Handle Paperless API objects with ID and name
            if 'id' in field_data and 'name' in field_data:
                return str(field_data['name'])
            elif 'value' in field_data:
                return str(field_data['value']) if field_data['value'] else ""
            elif 'name' in field_data:
                return str(field_data['name']) if field_data['name'] else ""
            elif 'parsed' in field_data:
                return str(field_data['parsed']) if field_data['parsed'] else ""
        
        if isinstance(field_data, list):
            if field == 'tags':
                # Handle both string tags and dict tags with ID/name
                tag_names = []
                for tag in field_data:
                    if isinstance(tag, dict) and 'name' in tag:
                        tag_names.append(tag['name'])
                    else:
                        tag_names.append(str(tag))
                return ", ".join(tag_names)
            elif field == 'custom_fields':
                return ", ".join([f"{item.get('name', '')}:{item.get('value', '')}" for item in field_data if isinstance(item, dict)])
        
        return str(field_data) if field_data else ""
    
    def get_custom_field_value(self, metadata: Dict[str, Any], field_name: str) -> str:
        """Get value for a specific custom field"""
        if 'custom_fields' not in metadata:
            return ""
        
        custom_fields_data = metadata['custom_fields']
        if isinstance(custom_fields_data, dict):
            custom_fields = custom_fields_data.get('value', [])
        else:
            custom_fields = custom_fields_data
        
        if isinstance(custom_fields, list):
            for cf in custom_fields:
                if isinstance(cf, dict) and cf.get('name') == field_name:
                    return str(cf.get('value', ''))
        
        return ""
    
    def truncate_value(self, value: str, max_length: int = 35) -> str:
        """Truncate long values for display"""
        if not value:
            return ""
        
        if len(value) > max_length:
            return value[:max_length-3] + "..."
        return value
    
    def generate_summary(self, results: Dict[str, Any]) -> None:
        """Generate final summary of processing results"""
        total_docs = results.get('total_documents', 0)
        processed_docs = results.get('processed_documents', 0)
        matched_docs = results.get('matched_documents', 0)
        poco_passed = results.get('poco_passed', 0)
        
        print("="*80)
        print("PROCESSING SUMMARY")
        print("="*80)
        print(f"Total Documents Found: {total_docs}")
        print(f"Documents Processed: {processed_docs}")
        print(f"Documents Matched: {matched_docs}")
        print(f"High Confidence Updates: {poco_passed}")
        
        if processed_docs > 0:
            match_rate = (matched_docs / processed_docs) * 100
            confidence_rate = (poco_passed / processed_docs) * 100
            print(f"Match Rate: {match_rate:.1f}%")
            print(f"High Confidence Rate: {confidence_rate:.1f}%")
        
        # Rule usage statistics
        rule_usage = results.get('rule_usage', {})
        if rule_usage:
            print("\nRule Usage:")
            for rule_id, count in sorted(rule_usage.items(), key=lambda x: x[1], reverse=True):
                rule_name = results.get('rule_names', {}).get(rule_id, rule_id)
                print(f"  {rule_name}: {count} documents")
        
        # Processing time
        processing_time = results.get('processing_time', 0)
        print(f"\nProcessing Time: {processing_time:.2f} seconds")
        
        print("="*80)
        
        # Log to file
        self.log_summary_to_file(results)
    
    def log_summary_to_file(self, results: Dict[str, Any]) -> None:
        """Log summary to log.txt file"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        with open('log.txt', 'a', encoding='utf-8') as f:
            f.write(f"\n{timestamp} - POST-CONSUMPTION PROCESSING SUMMARY\n")
            f.write(f"Total Documents: {results.get('total_documents', 0)}\n")
            f.write(f"Processed: {results.get('processed_documents', 0)}\n")
            f.write(f"Matched: {results.get('matched_documents', 0)}\n")
            f.write(f"POCO Passed: {results.get('poco_passed', 0)}\n")
            f.write(f"Processing Time: {results.get('processing_time', 0):.2f}s\n")
            f.write("-" * 50 + "\n")
    
    def log_document_processing(self, doc_dict: Dict[str, Any], dry_run: bool = False) -> None:
        """Log document processing details to log.txt"""
        doc_id = doc_dict.get('id', 'Unknown')
        title = doc_dict.get('title', 'Unknown')
        selected_rule = doc_dict.get('selected_rule', {})
        poco_summary = doc_dict.get('poco_summary', {})
        
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        mode = "DRY_RUN" if dry_run else "LIVE"
        
        with open('log.txt', 'a', encoding='utf-8') as f:
            f.write(f"{timestamp} - [{mode}] Document {doc_id}: {title}\n")
            
            if selected_rule.get('pass', False):
                f.write(f"  Rule: {selected_rule.get('rule_name', 'Unknown')} ")
                f.write(f"({selected_rule.get('total_score', 0)}/{selected_rule.get('threshold', 0)})\n")
                f.write(f"  POCO Score: {poco_summary.get('final_score', 0)}% ")
                f.write(f"({'PASS' if poco_summary.get('pass', False) else 'FAIL'})\n")
            else:
                f.write("  NO MATCHING RULE\n")
    
    def print_document_content(self, document_id: int, content: str) -> None:
        """Print document content for debugging"""
        print(f"Document {document_id} Content:")
        print("="*80)
        print(content)
        print("="*80)
    
    def print_document_ids(self, documents: List[Dict[str, Any]]) -> None:
        """Print list of document IDs"""
        print("Document IDs:")
        for doc in documents:
            print(f"  {doc.get('id', 'Unknown')}: {doc.get('title', 'Unknown')}")
        print(f"\nTotal: {len(documents)} documents")
