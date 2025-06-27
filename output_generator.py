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
        selected_rule = doc_dict.get('selected_rule', {})
        poco_summary = doc_dict.get('poco_summary', {})
        
        # Basic output (always shown)
        mode_prefix = "[DRY RUN] " if dry_run else ""
        
        if selected_rule.get('pass', False):
            print(f"{mode_prefix}Document {doc_id}: {title}")
            print(f"  Rule: {selected_rule.get('rule_name', 'Unknown')} ({selected_rule.get('total_score', 0)}/{selected_rule.get('threshold', 0)})")
            print(f"  POCO Score: {poco_summary.get('final_score', 0)}% ({'PASS' if poco_summary.get('pass', False) else 'FAIL'})")
        else:
            print(f"{mode_prefix}Document {doc_id}: {title} - NO MATCHING RULE")
        
        # Verbose output
        if self.verbose:
            self.generate_verbose_output(doc_dict)
        
        print()  # Empty line for readability
    
    def generate_verbose_output(self, doc_dict: Dict[str, Any]) -> None:
        """Generate detailed verbose output for a document"""
        print("  " + "="*60)
        
        # Rule evaluations table
        rule_evaluations = doc_dict.get('rule_evaluations', [])
        if rule_evaluations:
            self.print_rule_evaluations_table(rule_evaluations)
        
        print()  # Extra spacing between tables
        print()
        
        # Metadata comparison table
        self.print_metadata_comparison_table(doc_dict)
        
        print()  # Extra spacing between tables
        print()
        
        # Rule Review Table (comprehensive scoring view - replaces POCO scoring details)
        self.print_rule_review_table(doc_dict)
        
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
        
        fields = ['correspondent', 'document_type', 'date_created', 'tags', 'custom_fields']
        
        for field in fields:
            content_val = self.get_display_value(doc_dict.get('content_metadata', {}), field)
            filename_val = self.get_display_value(doc_dict.get('filename_metadata', {}), field)
            paperless_val = self.get_display_value(doc_dict.get('paperless_metadata', {}), field)
            
            # Determine selected value (priority: content > filename > paperless)
            selected_val = content_val or filename_val or paperless_val
            
            # Color coding for values with longer truncation
            content_colored = Colors.green(self.truncate_value(content_val, 28)) if content_val else Colors.red("—")
            filename_colored = Colors.blue(self.truncate_value(filename_val, 28)) if filename_val else Colors.red("—")
            paperless_colored = Colors.yellow(self.truncate_value(paperless_val, 28)) if paperless_val else Colors.red("—")
            selected_colored = Colors.bold(Colors.cyan(self.truncate_value(selected_val, 28))) if selected_val else Colors.red("—")
            
            rows.append([
                Colors.bold(field.replace('_', ' ').title()),
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
        print("    " + "─" * 85)
        
        headers = [
            Colors.bold("Metadata"), 
            Colors.bold("Rule Score"), 
            Colors.bold("Filename Score"), 
            Colors.bold("Paperless Score"), 
            Colors.bold("Final Score")
        ]
        rows = []
        
        poco_details = doc_dict.get('poco_score_details', {})
        poco_summary = doc_dict.get('poco_summary', {})
        rule_threshold = poco_summary.get('rule_threshold', 70)
        
        for field, details in poco_details.items():
            rule_score = details.get('rule_score', 0)
            filename_score = details.get('filename_score', 0)
            paperless_score = details.get('paperless_score', 0)
            final_score = details.get('final_score', 0)
            
            # Color coding for scores
            rule_colored = Colors.cyan(f"{rule_score:>3}")
            filename_colored = Colors.green(f"{filename_score:>+3}") if filename_score >= 0 else Colors.red(f"{filename_score:>3}")
            paperless_colored = Colors.yellow(f"{paperless_score:>+3}") if paperless_score >= 0 else Colors.red(f"{paperless_score:>3}")
            
            # Final score color based on threshold
            if final_score >= rule_threshold:
                final_colored = Colors.bold(Colors.green(f"{final_score:>3}"))
            else:
                final_colored = Colors.bold(Colors.red(f"{final_score:>3}"))
            
            rows.append([
                Colors.bold(field.replace('_', ' ').title()),
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
        print(f"POCO Score Passed: {poco_passed}")
        
        if processed_docs > 0:
            match_rate = (matched_docs / processed_docs) * 100
            poco_rate = (poco_passed / processed_docs) * 100
            print(f"Match Rate: {match_rate:.1f}%")
            print(f"POCO Pass Rate: {poco_rate:.1f}%")
        
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
