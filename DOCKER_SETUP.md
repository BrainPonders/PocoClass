# POCOmeta Docker Integration Guide

## Overview

This guide explains how to properly integrate POCOmeta with Paperless-ngx in a Docker environment, including automatic post-consumption execution and environment setup.

## Installation in Docker Container

### 1. Directory Structure

Place POCOmeta in the Paperless scripts directory:

```
/home/paperless/paperless-ngx/
├── scripts/
│   └── post_consume/
│       └── POCOmeta/
│           ├── __init__.py
│           ├── main.py
│           ├── settings.py
│           ├── config.py
│           ├── rules/
│           │   ├── template.yaml
│           │   └── your_custom_rules.yaml
│           └── ... (all other POCOmeta files)
```

### 2. Dependencies Installation

Add POCOmeta dependencies to your Paperless Docker setup. You have two options:

#### Option A: Custom Docker Image (Recommended)

Create a custom Dockerfile that extends the official Paperless image:

```dockerfile
FROM ghcr.io/paperless-ngx/paperless-ngx:latest

# Install POCOmeta dependencies
RUN pip install requests pyyaml tabulate

# Copy POCOmeta scripts
COPY scripts/ /usr/src/paperless/scripts/

USER paperless
```

#### Option B: Runtime Installation

Add to your docker-compose.yml:

```yaml
services:
  webserver:
    image: ghcr.io/paperless-ngx/paperless-ngx:latest
    # ... other configuration
    command: |
      sh -c "
        pip install --user requests pyyaml tabulate &&
        /usr/local/bin/paperless_cmd.sh
      "
```

### 3. Environment Configuration

Add POCOmeta configuration to your docker-compose.yml environment variables:

```yaml
services:
  webserver:
    environment:
      # Existing Paperless configuration...
      
      # POCOmeta Configuration
      PAPERLESS_URL: "http://localhost:8000"  # Internal container URL
      PAPERLESS_TOKEN: "your-api-token"
      FILTER_TAG_INCLUDE: "NEW"
      FILTER_TAG_EXCLUDE: "POCO"
      COMPLETION_TAG: "POCO"
      MAX_DOCUMENTS: "0"  # No limit in production
      POCO_DRY_RUN: "false"
      POCO_VERBOSE: "false"
```

## Post-Consumption Hook Setup

### Method 1: Direct Post-Consumption Script (Recommended)

Set the post-consumption script in your Paperless environment:

```yaml
services:
  webserver:
    environment:
      PAPERLESS_POST_CONSUME_SCRIPT: "/usr/src/paperless/scripts/post_consume/poco_wrapper.sh"
```

Create a wrapper script `/scripts/post_consume/poco_wrapper.sh`:

```bash
#!/bin/bash

# Wrapper script for POCOmeta post-consumption processing
# This script is called by Paperless after each document is consumed

DOCUMENT_ID="$1"
DOCUMENT_FILE="$2"
DOCUMENT_SOURCE_PATH="$3"
DOCUMENT_THUMB_PATH="$4"
DOCUMENT_DOWNLOAD_URL="$5"
DOCUMENT_CREATED="$6"
DOCUMENT_MODIFIED="$7"

# Log the consumption event
echo "$(date): Document $DOCUMENT_ID consumed, starting POCOmeta processing" >> /tmp/poco.log

# Run POCOmeta for the specific document
cd /usr/src/paperless
python3 -m scripts.post_consume.POCOmeta.main \
    --limit-id "$DOCUMENT_ID" \
    --verbose >> /tmp/poco.log 2>&1

# Log completion
echo "$(date): POCOmeta processing completed for document $DOCUMENT_ID" >> /tmp/poco.log
```

Make the wrapper executable:

```bash
chmod +x /scripts/post_consume/poco_wrapper.sh
```

### Method 2: Scheduled Batch Processing

For bulk processing or if post-consumption hooks don't work well:

Add a cron job inside the container:

```yaml
services:
  webserver:
    environment:
      # Add cron job via entrypoint script
      PAPERLESS_ENABLE_CRON: "true"
```

Create `/scripts/poco_cron.sh`:

```bash
#!/bin/bash
# Run POCOmeta every 5 minutes to process NEW documents

cd /usr/src/paperless
python3 -m scripts.post_consume.POCOmeta.main \
    --limit 10 \
    >> /tmp/poco_cron.log 2>&1
```

Add to crontab:
```
*/5 * * * * /usr/src/paperless/scripts/poco_cron.sh
```

## Configuration Best Practices

### 1. POCOmeta Settings File

Create `/scripts/post_consume/POCOmeta/settings.py`:

```python
def get_settings():
    return {
        # Paperless Connection
        "PAPERLESS_URL": "http://localhost:8000",  # Internal container URL
        "PAPERLESS_TOKEN": "",  # Set via environment variable
        
        # Document Filtering
        "INCLUDE_TAG": "NEW",
        "EXCLUDE_TAG": "POCO", 
        "COMPLETION_TAG": "POCO",
        
        # Processing Settings
        "MAX_DOCUMENTS": 0,  # No limit in production
        "DRY_RUN": False,
        "VERBOSE": False,
        
        # Retry Settings
        "MAX_RETRIES": 3,
        "RETRY_DELAY": 5,
        
        # Logging
        "LOG_FILE": "/tmp/poco.log",
        "LOG_LEVEL": "INFO"
    }
```

### 2. Environment Variable Priority

Environment variables override settings.py values. This allows:
- Sensitive data (API tokens) via Docker secrets
- Environment-specific settings (dev/prod)
- Easy configuration changes without code updates

### 3. Health Checks and Monitoring

Add health checks to monitor POCOmeta:

```yaml
services:
  webserver:
    healthcheck:
      test: ["CMD", "python3", "-m", "scripts.post_consume.POCOmeta.main", "--help"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Production Deployment

### 1. Volume Mounts

Mount POCOmeta and rules as volumes for easy updates:

```yaml
services:
  webserver:
    volumes:
      - ./scripts:/usr/src/paperless/scripts:ro
      - ./poco-rules:/usr/src/paperless/scripts/post_consume/POCOmeta/rules:ro
      - poco-logs:/tmp/poco-logs
```

### 2. Logging Strategy

Configure centralized logging:

```python
# In settings.py
LOG_CONFIG = {
    "version": 1,
    "formatters": {
        "standard": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        }
    },
    "handlers": {
        "file": {
            "class": "logging.FileHandler",
            "filename": "/tmp/poco-logs/poco.log",
            "formatter": "standard"
        }
    },
    "root": {
        "level": "INFO",
        "handlers": ["file"]
    }
}
```

### 3. Error Handling

Implement robust error handling in the wrapper script:

```bash
#!/bin/bash

# Enhanced wrapper with error handling
set -e

DOCUMENT_ID="$1"
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if python3 -m scripts.post_consume.POCOmeta.main --limit-id "$DOCUMENT_ID"; then
        echo "Success: Document $DOCUMENT_ID processed"
        exit 0
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "Retry $RETRY_COUNT/$MAX_RETRIES for document $DOCUMENT_ID"
        sleep 5
    fi
done

echo "Failed: Document $DOCUMENT_ID failed after $MAX_RETRIES attempts"
exit 1
```

## Testing the Setup

### 1. Manual Test

Test POCOmeta in the container:

```bash
# Enter container
docker compose exec webserver bash

# Test POCOmeta
cd /usr/src/paperless
python3 -m scripts.post_consume.POCOmeta.main --dry-run --limit 1 --verbose

# Test specific document
python3 -m scripts.post_consume.POCOmeta.main --limit-id 123 --dry-run
```

### 2. Post-Consumption Test

1. Upload a test document to Paperless
2. Tag it with "NEW"
3. Check logs: `docker compose logs webserver | grep -i poco`
4. Verify the document gets processed and tagged with "POCO"

### 3. Rule Validation

Test your rules without making changes:

```bash
python3 -m scripts.post_consume.POCOmeta.main --dry-run --verbose --limit 5
```

## Troubleshooting

### Common Issues

1. **Module Import Errors**: Ensure `__init__.py` exists and PYTHONPATH is set
2. **Permission Errors**: Check file ownership and execute permissions
3. **API Connection**: Verify internal container URL and token
4. **Missing Dependencies**: Ensure requests, pyyaml, tabulate are installed

### Debug Mode

Enable detailed debugging:

```bash
python3 -m scripts.post_consume.POCOmeta.main --debug --dry-run --limit 1
```

### Log Analysis

Monitor POCOmeta activity:

```bash
# Real-time logs
docker compose logs -f webserver | grep -i poco

# Check wrapper script logs
docker compose exec webserver cat /tmp/poco.log
```

## Security Considerations

1. **API Token**: Use Docker secrets or environment variables, never hardcode
2. **File Permissions**: Ensure POCOmeta runs with minimal required permissions
3. **Rule Files**: Keep personal rule files outside the container image
4. **Network Access**: Restrict container network access if needed

## Maintenance

### Updates

1. Update POCOmeta code via volume mounts or container rebuilds
2. Update rules files independently of code
3. Monitor logs for processing errors
4. Regular testing with new document types

### Backup

Backup your custom rule files and configuration:

```bash
# Backup rules
docker compose exec webserver tar czf - /usr/src/paperless/scripts/post_consume/POCOmeta/rules > poco-rules-backup.tar.gz

# Backup logs
docker compose exec webserver tar czf - /tmp/poco-logs > poco-logs-backup.tar.gz
```

This setup provides a robust, production-ready integration of POCOmeta with Paperless-ngx in Docker.