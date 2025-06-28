#!/bin/bash

# POCOmeta Wrapper Script for Paperless-ngx Post-Consumption
# This script is called by Paperless after each document is consumed
# and triggers POCOmeta processing for the new document

# Get document details from Paperless environment
DOCUMENT_ID="$1"
DOCUMENT_FILE="$2"
DOCUMENT_SOURCE_PATH="$3"
DOCUMENT_THUMB_PATH="$4"
DOCUMENT_DOWNLOAD_URL="$5"
DOCUMENT_CREATED="$6"
DOCUMENT_MODIFIED="$7"

# Log file for POCOmeta processing
LOG_FILE="/tmp/poco.log"

# Function to log messages with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [POCOmeta] $1" >> "$LOG_FILE"
}

# Function to run POCOmeta with error handling
run_poco() {
    local retries=3
    local delay=5
    
    for ((i=1; i<=retries; i++)); do
        log_message "Attempt $i/$retries: Processing document $DOCUMENT_ID"
        
        cd /usr/src/paperless
        
        # Build command with conditional flags
        CMD="python3 -m scripts.post_consume.POCOmeta.main --limit-id $DOCUMENT_ID"
        
        if [ "${POCO_VERBOSE:-false}" = "true" ]; then
            CMD="$CMD --verbose"
        fi
        
        if [ "${POCO_DRY_RUN:-false}" = "true" ]; then
            CMD="$CMD --dry-run"
        fi
        
        if eval "$CMD" >> "$LOG_FILE" 2>&1; then
            log_message "SUCCESS: Document $DOCUMENT_ID processed successfully"
            return 0
        else
            log_message "FAILED: Attempt $i failed for document $DOCUMENT_ID"
            if [ $i -lt $retries ]; then
                log_message "Retrying in $delay seconds..."
                sleep $delay
            fi
        fi
    done
    
    log_message "ERROR: Document $DOCUMENT_ID failed after $retries attempts"
    return 1
}

# Main execution
log_message "Starting POCOmeta processing for document $DOCUMENT_ID"
log_message "Document file: $DOCUMENT_FILE"
log_message "Source path: $DOCUMENT_SOURCE_PATH"

# Check if POCOmeta directory exists
if [ ! -d "/usr/src/paperless/scripts/post_consume/POCOmeta" ]; then
    log_message "ERROR: POCOmeta directory not found at /usr/src/paperless/scripts/post_consume/POCOmeta"
    exit 1
fi

# Check if document ID is provided
if [ -z "$DOCUMENT_ID" ]; then
    log_message "ERROR: No document ID provided"
    exit 1
fi

# Run POCOmeta processing
if run_poco; then
    log_message "COMPLETED: POCOmeta processing finished for document $DOCUMENT_ID"
    exit 0
else
    log_message "FAILED: POCOmeta processing failed for document $DOCUMENT_ID"
    exit 1
fi