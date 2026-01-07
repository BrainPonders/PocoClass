#!/bin/bash
# PocoClass Post-Consumption Trigger Script
# Place this in your Paperless-ngx post-consumption scripts directory
#
# This script is called by Paperless-ngx after a document is consumed.
# It triggers PocoClass to check for documents with the NEW tag.
#
# NOTE: The NEW tag should be configured as an "inbox tag" in Paperless-ngx,
# so Paperless automatically assigns it to newly consumed documents.
# PocoClass creates the NEW tag with this option enabled by default.
#
# Setup:
# 1. Update POCOCLASS_URL to your PocoClass server address
# 2. Update POCOCLASS_TOKEN with a valid session token
# 3. Make executable: chmod +x pococlass_trigger.sh
# 4. Configure in Paperless: PAPERLESS_POST_CONSUME_SCRIPT=/path/to/pococlass_trigger.sh

# ============================================
# CONFIGURATION - UPDATE THESE VALUES
# ============================================

# PocoClass server URL (no trailing slash)
POCOCLASS_URL="http://your-pococlass-server:5000"

# PocoClass session token (from browser dev tools after login)
# NOTE: Session tokens expire. For long-term automation, consider:
# - Refreshing the token periodically by logging in again
# - Using a dedicated automation user account
# - Keeping PocoClass running to maintain session
POCOCLASS_TOKEN="your-pococlass-session-token"

# Optional: Log file location (set to empty string to disable logging)
LOG_FILE="/var/log/pococlass_trigger.log"

# ============================================
# DO NOT EDIT BELOW THIS LINE
# ============================================

# Environment variables provided by Paperless-ngx:
# DOCUMENT_ID - The ID of the consumed document
# DOCUMENT_FILE_NAME - Original filename

DOCUMENT_ID="${DOCUMENT_ID:-}"
DOCUMENT_FILE_NAME="${DOCUMENT_FILE_NAME:-unknown}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log messages
log_message() {
    if [ -n "$LOG_FILE" ]; then
        echo "[$TIMESTAMP] $1" >> "$LOG_FILE" 2>/dev/null || true
    fi
}

log_message "Document consumed: ID=${DOCUMENT_ID}, filename=${DOCUMENT_FILE_NAME}"

# Trigger PocoClass background processing
log_message "Triggering PocoClass processing..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${POCOCLASS_URL}/api/background/trigger" \
    -H "Content-Type: application/json" \
    -H "Cookie: session=${POCOCLASS_TOKEN}" \
    --max-time 10 \
    2>&1)

# Parse response
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Check result
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
    log_message "SUCCESS - PocoClass triggered (HTTP ${HTTP_CODE})"
    exit 0
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    log_message "ERROR - Authentication failed (HTTP ${HTTP_CODE}). Session token may have expired."
    log_message "To refresh: Log into PocoClass, get new session token from browser dev tools"
    exit 0
else
    log_message "ERROR - Failed to trigger PocoClass (HTTP ${HTTP_CODE}): ${BODY}"
    exit 0
fi
