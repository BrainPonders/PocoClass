#!/bin/bash
# POCOmeta Post-Consumption Wrapper Script
# This script is called by Paperless-ngx after document consumption
# Paperless-ngx passes: document_id document_file_name document_path thumbnail_path download_url thumb_url correspondent tags

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] POCO: $1" >> /tmp/poco_wrapper.log 2>&1
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] POCO: $1"
}

log "POCOmeta post-consumption processing started with args: $*"

# Determine the correct working directory and Python execution method
if [ -d "/usr/src/paperless" ]; then
    # Running inside Paperless-ngx Docker container
    cd /usr/src/paperless
    PYTHON_CMD="python3 -m scripts.POCOmeta.main"
    log "Running in Paperless-ngx container, working directory: $(pwd)"
elif [ -f "main.py" ]; then
    # Running in POCOmeta development/standalone directory
    PYTHON_CMD="python3 main.py"
    log "Running in POCOmeta standalone mode, working directory: $(pwd)"
else
    log "ERROR: Cannot locate POCOmeta installation, working directory: $(pwd)"
    log "Contents: $(ls -la)"
    # Still return success to avoid breaking Paperless-ngx
    exit 0
fi

# Paperless-ngx passes document ID as first argument
DOCUMENT_ID="$1"

# Run POCOmeta with document ID if provided
if [ -n "$DOCUMENT_ID" ] && [ "$DOCUMENT_ID" != "" ]; then
    log "Processing document ID: $DOCUMENT_ID"
    log "Executing: $PYTHON_CMD --limit-id $DOCUMENT_ID"
    
    # Capture both stdout and stderr, and always handle errors gracefully
    OUTPUT=$($PYTHON_CMD --limit-id "$DOCUMENT_ID" 2>&1)
    POCO_EXIT_CODE=$?
    
    # Log the output for debugging
    if [ $POCO_EXIT_CODE -ne 0 ]; then
        log "POCOmeta output: $OUTPUT"
    fi
    
    log "POCOmeta exit code: $POCO_EXIT_CODE"
else
    log "Processing all NEW documents"
    log "Executing: $PYTHON_CMD"
    
    # Capture both stdout and stderr, and always handle errors gracefully
    OUTPUT=$($PYTHON_CMD 2>&1)
    POCO_EXIT_CODE=$?
    
    # Log the output for debugging
    if [ $POCO_EXIT_CODE -ne 0 ]; then
        log "POCOmeta output: $OUTPUT"
    fi
    
    log "POCOmeta exit code: $POCO_EXIT_CODE"
fi

# Log detailed execution results
if [ $POCO_EXIT_CODE -eq 0 ]; then
    log "POCOmeta processing completed successfully (exit code: 0)"
else
    log "POCOmeta processing completed with exit code: $POCO_EXIT_CODE (treating as normal)"
fi

log "POCOmeta post-consumption processing finished"

# Always return success to Paperless-ngx regardless of POCOmeta exit code
log "Wrapper script exiting with code: 0 (success)"
exit 0