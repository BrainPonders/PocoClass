#!/bin/bash
# POCOmeta Post-Consumption Wrapper Script
# This script is called by Paperless-ngx after document consumption

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] POCO: $1"
}

log "POCOmeta post-consumption processing started"

# Change to the paperless working directory
cd /usr/src/paperless

# Run POCOmeta as a Python module with document ID if provided
if [ -n "$DOCUMENT_ID" ]; then
    log "Processing document ID: $DOCUMENT_ID"
    python3 -m scripts.POCOmeta.main --limit-id "$DOCUMENT_ID"
else
    log "Processing all NEW documents"
    python3 -m scripts.POCOmeta.main
fi

POCO_EXIT_CODE=$?

if [ $POCO_EXIT_CODE -eq 0 ]; then
    log "POCOmeta processing completed successfully"
else
    log "POCOmeta processing failed with exit code: $POCO_EXIT_CODE"
fi

log "POCOmeta post-consumption processing finished"

exit $POCO_EXIT_CODE