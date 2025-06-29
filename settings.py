"""
POCOmeta Settings Configuration
Environment variables take priority over these settings
"""

# Paperless-ngx API Configuration
PAPERLESS_URL = "http://localhost:8000"  # Paperless-ngx server URL
PAPERLESS_TOKEN = ""  # API token (set via environment variable)

# Document Processing Settings
DOCUMENT_LIMIT = None  # Maximum documents to process (None for no limit)
DOCUMENT_ID_FILTER = None  # Process only specific document ID (None for all)

# Tag-based Document Filtering
INCLUDE_TAGS = ["NEW"]  # Only process documents with these tags
EXCLUDE_TAGS = []  # Skip documents with these tags

# Processing Behavior
DRY_RUN_MODE = False  # Set to True to simulate without making changes
VERBOSE_OUTPUT = False  # Enable detailed output
DEBUG_MODE = False  # Enable debug logging

# Rule Configuration
RULES_DIRECTORY = "rules"  # Directory containing YAML rule files
RULE_EVALUATION_THRESHOLD = 70  # Minimum score for rule to match

# POCO Scoring Configuration (IMPLEMENTED ✓)
POCO_SCORING_ENABLED = True  # Enable POCO confidence scoring
POCO_THRESHOLD = 60  # Minimum POCO score to apply metadata
POCO_TAG_NAME = "POCO"  # Tag to apply for low-confidence matches

# Metadata Field Weights for POCO Scoring (IMPLEMENTED ✓)
POCO_FIELD_WEIGHTS = {
    "title": 20,
    "correspondent": 25,
    "document_type": 15,
    "tags": 10,
    "created": 15,
    "custom_fields": 15
}

# Processing Features (IMPLEMENTED ✓)
APPLY_METADATA_UPDATES = True  # Apply metadata to documents
CREATE_MISSING_TAGS = True  # Create tags that don't exist
CREATE_MISSING_CORRESPONDENTS = True  # Create correspondents that don't exist
CREATE_MISSING_DOCUMENT_TYPES = True  # Create document types that don't exist
CREATE_MISSING_CUSTOM_FIELDS = True  # Create custom fields that don't exist

# Output and Logging (IMPLEMENTED ✓)
LOG_TO_FILE = True  # Enable file logging
LOG_FILE_PATH = "log.txt"  # Log file location
COLORED_OUTPUT = True  # Enable colored console output
SUMMARY_STATISTICS = True  # Show processing statistics

# Performance Settings (IMPLEMENTED ✓)
API_REQUEST_TIMEOUT = 30  # API request timeout in seconds
MAX_CONCURRENT_REQUESTS = 5  # Maximum concurrent API requests
CONTENT_CACHE_SIZE = 100  # Cache size for document content

# Rule Development Features (IMPLEMENTED ✓)
SHOW_RULE_EVALUATIONS = True  # Show rule evaluation details in verbose mode
SHOW_PATTERN_MATCHING = True  # Show pattern matching details
SHOW_METADATA_COMPARISON = True  # Show metadata comparison across sources
SHOW_CONFIDENCE_SCORING = True  # Show POCO confidence scoring details

# Document Content Settings (IMPLEMENTED ✓)
CONTENT_EXTRACTION_RANGE = "0-2000"  # Character range for content analysis
FILENAME_PATTERN_MATCHING = True  # Enable filename pattern matching
CASE_SENSITIVE_MATCHING = False  # Case sensitivity for pattern matching

# Tag Management (IMPLEMENTED ✓)
REMOVE_PROCESSING_TAGS = True  # Remove NEW tag after processing
ADD_CONFIDENCE_TAGS = True  # Add confidence-based tags
CONFIDENCE_TAG_PREFIX = "POCO-"  # Prefix for confidence tags

# Custom Field Configuration (IMPLEMENTED ✓)
DEFAULT_CUSTOM_FIELDS = {
    "Document Category": "text",
    "Processing Confidence": "integer",
    "Rule Applied": "text"
}

# Error Handling (IMPLEMENTED ✓)
CONTINUE_ON_ERRORS = True  # Continue processing if individual documents fail
MAX_RETRY_ATTEMPTS = 3  # Maximum retry attempts for failed API calls
SKIP_DUPLICATE_PROCESSING = True  # Skip documents already processed by POCO

# Document Type Mapping (IMPLEMENTED ✓)
DOCUMENT_TYPE_ALIASES = {
    "bank_statement": "Bank Statement",
    "invoice": "Invoice",
    "receipt": "Receipt",
    "contract": "Contract"
}

# Advanced Features Status
# Note: These settings control implemented features
FEATURE_STATUS = {
    "rule_based_classification": "IMPLEMENTED ✓",
    "pattern_matching": "IMPLEMENTED ✓", 
    "metadata_extraction": "IMPLEMENTED ✓",
    "confidence_scoring": "IMPLEMENTED ✓",
    "api_integration": "IMPLEMENTED ✓",
    "tag_management": "IMPLEMENTED ✓",
    "custom_fields": "IMPLEMENTED ✓",
    "verbose_reporting": "IMPLEMENTED ✓",
    "error_handling": "IMPLEMENTED ✓",
    "dry_run_mode": "IMPLEMENTED ✓"
}