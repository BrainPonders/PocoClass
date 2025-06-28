"""
User-Friendly Configuration Settings
====================================

This file contains all the customizable settings for the Post-Consumption Script.
New users can easily modify these values to match their Paperless setup.

IMPORTANT: After changing settings here, restart the script for changes to take effect.
"""

# =============================================================================
# PAPERLESS SERVER CONNECTION
# =============================================================================

# Your Paperless-ngx server URL (include http:// or https://)
# Examples: 
#   - Local server: "http://localhost:8000"
#   - Remote server: "https://paperless.mydomain.com"
#   - Dockerized: "http://192.168.1.100:8000"
PAPERLESS_URL = "http://localhost:8000"

# Your Paperless API token (get this from Account Settings > API Tokens)
# Leave empty to use environment variable PAPERLESS_TOKEN
PAPERLESS_TOKEN = ""

# =============================================================================
# DOCUMENT FILTERING
# =============================================================================

# Only process documents that have this tag
# Set to the tag you apply to new documents that need processing
INCLUDE_TAG = "NEW"

# Skip documents that already have this tag  
# This prevents reprocessing documents that were already handled
EXCLUDE_TAG = "POCO"

# Tag to add to documents after successful processing
# This marks documents as completed so they won't be processed again
COMPLETION_TAG = "POCO"

# =============================================================================
# PROCESSING BEHAVIOR
# =============================================================================

# Maximum number of documents to process in one run
# Set to 0 for no limit, or a number like 10 for testing
MAX_DOCUMENTS = 0

# Only process specific document types
# Leave empty for all types, or specify like: ["Invoice", "Bank Statement"]
DOCUMENT_TYPES_FILTER = []

# Only process documents from specific correspondents
# Leave empty for all correspondents, or specify like: ["Bank", "Insurance Co"]
CORRESPONDENTS_FILTER = []

# =============================================================================
# CONFIDENCE SCORING
# =============================================================================

# Minimum score for a rule to be considered a match (0-100)
# Higher values = stricter matching, lower values = more permissive
RULE_MATCH_THRESHOLD = 70

# Minimum POCO confidence score to apply metadata (0-100)
# Documents below this score will be tagged but not have metadata applied
CONFIDENCE_THRESHOLD = 60

# =============================================================================
# CUSTOM FIELD NAMES
# =============================================================================

# Name of the custom field to store POCO confidence scores
# Make sure this field exists in your Paperless custom fields
POCO_SCORE_FIELD_NAME = "POCO Score"

# Name of the custom field to store document categories
# Make sure this field exists in your Paperless custom fields  
DOCUMENT_CATEGORY_FIELD_NAME = "Document Category"

# Name of the custom field to store processing date
# Leave empty to not track processing dates
PROCESSING_DATE_FIELD_NAME = "Processing Date"

# =============================================================================
# RULE CONFIGURATION
# =============================================================================

# Directory containing your YAML rule files
# The script will load all .yaml files from this directory
RULES_DIRECTORY = "rules"

# Enable/disable specific rule features
ENABLE_FILENAME_MATCHING = True      # Match patterns in filenames
ENABLE_CONTENT_MATCHING = True       # Match patterns in document text
ENABLE_DATE_EXTRACTION = True        # Extract dates from content/filename
ENABLE_AMOUNT_EXTRACTION = True      # Extract amounts from content

# =============================================================================
# OUTPUT AND LOGGING
# =============================================================================

# Default output verbosity level
# Options: "normal", "verbose", "debug"
DEFAULT_VERBOSITY = "normal"

# Save processing logs to file
ENABLE_FILE_LOGGING = True

# Log file name (will be created in project directory)
LOG_FILE_NAME = "processing.log"

# Include debug information in logs
ENABLE_DEBUG_LOGGING = False

# =============================================================================
# SAFETY AND BACKUP
# =============================================================================

# Enable dry-run mode by default (safer for new users)
# When True, shows what would be changed without actually changing anything
DEFAULT_DRY_RUN = False

# Create backup of document metadata before making changes
ENABLE_METADATA_BACKUP = True

# Backup file name
BACKUP_FILE_NAME = "metadata_backup.json"

# =============================================================================
# ADVANCED SETTINGS
# =============================================================================

# API request timeout in seconds
API_TIMEOUT = 30

# Number of retries for failed API requests
API_RETRY_COUNT = 3

# Delay between API requests to avoid rate limiting (seconds)
API_DELAY = 0.1

# Maximum file size to process (in MB, 0 = no limit)
MAX_FILE_SIZE_MB = 100

# =============================================================================
# NOTIFICATION SETTINGS
# =============================================================================

# Send summary email after processing (requires email configuration)
ENABLE_EMAIL_NOTIFICATIONS = False

# Email address to send notifications to
NOTIFICATION_EMAIL = ""

# Send notification only if errors occurred
NOTIFY_ON_ERRORS_ONLY = True

# =============================================================================
# RULE DEVELOPMENT HELPERS
# =============================================================================

# Show detailed pattern matching information (helpful for writing rules)
SHOW_PATTERN_DETAILS = False

# Highlight matched text in output
HIGHLIGHT_MATCHES = True

# Show confidence score breakdown
SHOW_SCORE_BREAKDOWN = True

# =============================================================================
# END OF CONFIGURATION
# =============================================================================

# Do not modify below this line unless you know what you're doing
def get_settings():
    """Return all settings as a dictionary"""
    import sys
    settings = {}
    current_module = sys.modules[__name__]
    
    for name in dir(current_module):
        if name.isupper() and not name.startswith('_'):
            settings[name] = getattr(current_module, name)
    
    return settings