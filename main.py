#!/usr/bin/env python3
"""
POCOmeta - Post-Consumption Metadata Processor for Paperless-ngx
A modular, rule-based document classification and metadata enrichment tool

Main entry point that orchestrates the step-by-step processing pipeline
"""

import argparse
import sys
import logging
from pathlib import Path
from datetime import datetime

from config import Config
from processor_pipeline import ProcessorPipeline
from output_generator import OutputGenerator

def setup_logging(debug=False):
    """Configure logging for the application"""
    log_level = logging.DEBUG if debug else logging.INFO
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('log.txt', mode='a'),
            logging.StreamHandler(sys.stdout) if debug else logging.NullHandler()
        ]
    )
    
    return logging.getLogger(__name__)

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description='POCOmeta - Post-Consumption Metadata Processor for Paperless-ngx',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                          # Process all NEW documents
  %(prog)s --dry-run                # Simulate processing without changes
  %(prog)s --verbose                # Show detailed processing information
  %(prog)s --limit 10               # Process only first 10 documents
  %(prog)s --limit-id 123           # Process only document ID 123
  %(prog)s --show-content 123       # Show OCR content for document 123
  %(prog)s --id-only                # List document IDs only
        """
    )
    
    parser.add_argument('--dry-run', action='store_true',
                       help='Simulate processing without making changes')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose output with detailed scoring')
    parser.add_argument('--debug', action='store_true',
                       help='Enable debug mode with extended diagnostics')
    parser.add_argument('--debug-raw', action='store_true',
                       help='Enable raw debug mode with complete dictionary output')
    parser.add_argument('--limit', type=int, metavar='N',
                       help='Limit processing to first N documents')
    parser.add_argument('--limit-id', type=int, metavar='ID',
                       help='Process only the document with specified ID')
    parser.add_argument('--id-only', action='store_true',
                       help='Print document IDs and exit')
    parser.add_argument('--show-content', type=int, metavar='ID',
                       help='Show OCR content for specified document ID and exit')
    
    return parser.parse_args()

def main():
    """Main application entry point"""
    args = parse_arguments()
    logger = setup_logging(args.debug or args.debug_raw)
    
    logger.info("=" * 80)
    logger.info("POCOmeta - POST-CONSUMPTION METADATA PROCESSOR STARTED")
    logger.info(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    logger.info(f"Verbose: {args.verbose}")
    logger.info("=" * 80)
    
    try:
        # Initialize configuration
        config = Config()
        
        # Initialize pipeline
        pipeline = ProcessorPipeline(config, args)
        
        # Initialize output generator
        output_gen = OutputGenerator(args.verbose, args.debug)
        
        # Execute processing pipeline
        results = pipeline.execute()
        
        # Generate output and summary
        output_gen.generate_summary(results)
        
        logger.info("=" * 80)
        logger.info("POST-CONSUMPTION SCRIPT COMPLETED SUCCESSFULLY")
        logger.info("=" * 80)
        
        return 0
        
    except KeyboardInterrupt:
        logger.warning("Processing interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}", exc_info=True)
        return 1

if __name__ == '__main__':
    sys.exit(main())
