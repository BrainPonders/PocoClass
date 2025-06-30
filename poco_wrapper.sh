#!/bin/bash
# POCOmeta Post-Consumption Wrapper Script
# This script is called by Paperless-ngx after document consumption
# Paperless-ngx passes: document_id document_file_name document_path thumbnail_path download_url thumb_url correspondent tags

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] POCO: $1"
}

log "POCOmeta post-consumption processing started"

# Determine the correct working directory and Python execution method
if [ -d "/usr/src/paperless" ]; then
    # Running inside Paperless-ngx Docker container
    cd /usr/src/paperless
    PYTHON_CMD="python3 -m scripts.POCOmeta.main"
    log "Running in Paperless-ngx container"
elif [ -f "main.py" ]; then
    # Running in POCOmeta development/standalone directory
    PYTHON_CMD="python3 main.py"
    log "Running in POCOmeta standalone mode"
else
    log "ERROR: Cannot locate POCOmeta installation"
    exit 0  # Still return success to avoid breaking Paperless-ngx
fi

# Paperless-ngx passes document ID as first argument
DOCUMENT_ID="$1"

# Run POCOmeta with document ID if provided
if [ -n "$DOCUMENT_ID" ] && [ "$DOCUMENT_ID" != "" ]; then
    log "Processing document ID: $DOCUMENT_ID"
    $PYTHON_CMD --limit-id "$DOCUMENT_ID"
    POCO_EXIT_CODE=$?
else
    log "Processing all NEW documents"
    $PYTHON_CMD
    POCO_EXIT_CODE=$?
fi

# Always exit with success (0) for post-consumption scripts
# POCOmeta "no match" scenarios are normal outcomes, not errors
if [ $POCO_EXIT_CODE -eq 0 ]; then
    log "POCOmeta processing completed successfully"
else
    log "POCOmeta processing completed (no matching rules found - this is normal)"
fi

log "POCOmeta post-consumption processing finished"

# Always return success to Paperless-ngx
exit 0