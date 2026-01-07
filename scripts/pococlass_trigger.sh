#!/bin/bash
# PocoClass Post-Consumption Trigger Script
# Place this in your Paperless-ngx post-consumption scripts directory
#
# This script is called by Paperless-ngx after a document is consumed.
# It adds the NEW tag to the document (preserving existing tags) and triggers PocoClass.
#
# Setup:
# 1. Update POCOCLASS_URL to your PocoClass server address
# 2. Update POCOCLASS_TOKEN with a valid session token
# 3. Update PAPERLESS_URL and PAPERLESS_TOKEN for tagging
# 4. Make executable: chmod +x pococlass_trigger.sh
# 5. Configure in Paperless: PAPERLESS_POST_CONSUME_SCRIPT=/path/to/pococlass_trigger.sh

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

# Paperless-ngx API configuration (for applying NEW tag)
PAPERLESS_URL="http://your-paperless-server:8000"
PAPERLESS_TOKEN="your-paperless-api-token"

# The tag name that PocoClass looks for (must match PocoClass settings)
NEW_TAG_NAME="NEW"

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

# Exit if no document ID provided
if [ -z "$DOCUMENT_ID" ]; then
    log_message "ERROR - No DOCUMENT_ID provided, skipping"
    exit 0
fi

log_message "Processing document ID: ${DOCUMENT_ID}, filename: ${DOCUMENT_FILE_NAME}"

# ============================================
# STEP 1: Add the NEW tag to the document (preserving existing tags)
# ============================================

# First, get the NEW tag ID from Paperless
NEW_TAG_RESPONSE=$(curl -s -X GET "${PAPERLESS_URL}/api/tags/?name__iexact=${NEW_TAG_NAME}" \
    -H "Authorization: Token ${PAPERLESS_TOKEN}" \
    --max-time 10 \
    2>&1)

# Extract tag ID using grep/sed (compatible with basic shells)
NEW_TAG_ID=$(echo "$NEW_TAG_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$NEW_TAG_ID" ]; then
    log_message "ERROR - Could not find NEW tag '${NEW_TAG_NAME}' in Paperless. Create the tag first."
else
    log_message "Found NEW tag with ID: ${NEW_TAG_ID}"
    
    # Get current document data including existing tags
    DOC_RESPONSE=$(curl -s -X GET "${PAPERLESS_URL}/api/documents/${DOCUMENT_ID}/" \
        -H "Authorization: Token ${PAPERLESS_TOKEN}" \
        --max-time 10 \
        2>&1)
    
    # Extract current tags array - handles format like "tags":[1,2,3] or "tags":[]
    CURRENT_TAGS=$(echo "$DOC_RESPONSE" | grep -o '"tags":\[[^]]*\]' | sed 's/"tags":\[//' | sed 's/\]//')
    
    # Check if NEW tag is already present
    if echo ",$CURRENT_TAGS," | grep -q ",$NEW_TAG_ID,"; then
        log_message "Document ${DOCUMENT_ID} already has NEW tag, skipping tag update"
    else
        # Build new tags array: existing tags + NEW tag
        if [ -z "$CURRENT_TAGS" ]; then
            # No existing tags
            NEW_TAGS_ARRAY="[${NEW_TAG_ID}]"
        else
            # Append NEW tag to existing tags
            NEW_TAGS_ARRAY="[${CURRENT_TAGS},${NEW_TAG_ID}]"
        fi
        
        log_message "Updating tags: ${NEW_TAGS_ARRAY}"
        
        # PATCH the document with merged tags (preserves existing tags)
        PATCH_RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "${PAPERLESS_URL}/api/documents/${DOCUMENT_ID}/" \
            -H "Authorization: Token ${PAPERLESS_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{\"tags\": ${NEW_TAGS_ARRAY}}" \
            --max-time 10 \
            2>&1)
        
        PATCH_HTTP_CODE=$(echo "$PATCH_RESPONSE" | tail -n1)
        
        if [ "$PATCH_HTTP_CODE" = "200" ]; then
            log_message "SUCCESS - Added NEW tag to document ${DOCUMENT_ID} (preserved existing tags)"
        else
            PATCH_BODY=$(echo "$PATCH_RESPONSE" | sed '$d')
            log_message "WARNING - Failed to add NEW tag (HTTP ${PATCH_HTTP_CODE}): ${PATCH_BODY}"
        fi
    fi
fi

# ============================================
# STEP 2: Trigger PocoClass background processing
# ============================================

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
