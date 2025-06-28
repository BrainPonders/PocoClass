"""
POCOmeta - Post-Consumption Metadata Processor for Paperless-ngx
A modular, rule-based document classification and metadata enrichment tool
"""

__version__ = "1.0.0"
__author__ = "POCOmeta Contributors"
__description__ = "Post-Consumption Metadata Processor for Paperless-ngx"

# Make main components available at package level
from .main import main
from .config import Config
from .processor_pipeline import ProcessorPipeline

__all__ = ['main', 'Config', 'ProcessorPipeline']