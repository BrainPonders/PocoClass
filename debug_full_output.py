#!/usr/bin/env python3
"""
Full Debug Output Script
Shows complete step-by-step processing with all debug information
"""

import sys
import os
from config import Config
from processor_pipeline import ProcessorPipeline

def main():
    """Run complete debug output"""
    print("="*80)
    print("COMPLETE DEBUG OUTPUT - ALL PROCESSING STEPS")
    print("="*80)
    
    # Create mock arguments for debug mode
    class MockArgs:
        def __init__(self):
            self.dry_run = True
            self.verbose = True
            self.debug = True
            self.limit = None
            self.limit_id = 683
            self.id_only = False
            self.show_content = None
    
    # Initialize configuration and pipeline
    config = Config()
    args = MockArgs()
    
    # Create pipeline
    pipeline = ProcessorPipeline(config, args)
    
    # Execute with full debug output
    results = pipeline.execute()
    
    print("\n" + "="*80)
    print("DEBUG OUTPUT COMPLETE")
    print("="*80)
    
    return results

if __name__ == "__main__":
    main()