# POCOmeta Installation Guide

This guide shows how to add POCOmeta to your existing Paperless-ngx installation with minimal changes.

## Prerequisites

- Working Paperless-ngx installation with Docker
- Access to your Paperless server files
- API token from Paperless-ngx (Account Settings > API Tokens)

## Installation Steps

### 1. Get POCOmeta Files
```bash
cd /home/paperless/paperless-ngx/scripts
git clone https://github.com/your-repo/POCOmeta.git
```

### 2. Copy Wrapper Script
```bash
cp POCOmeta/docker/scripts/post_consume/poco_wrapper.sh /home/paperless/paperless-ngx/scripts/poco_wrapper.sh
chmod +x /home/paperless/paperless-ngx/scripts/poco_wrapper.sh
```

### 3. Update Dockerfile
Add Python dependencies to your existing Dockerfile:
```dockerfile
FROM ghcr.io/paperless-ngx/paperless-ngx:latest

# Install OCR languages (your existing setup)
RUN apt-get update && \
    apt-get install -y tesseract-ocr-nld && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies for POCOmeta
RUN pip3 install requests pyyaml tabulate
```

### 4. Update docker-compose.yml
Add volume mount for scripts directory:
```yaml
services:
  webserver:
    # ... your existing configuration ...
    volumes:
      # ... your existing volumes ...
      - /home/paperless/paperless-ngx/scripts:/usr/src/paperless/scripts:rw
```

### 5. Configure POCOmeta
Edit `/home/paperless/paperless-ngx/scripts/POCOmeta/settings.py`:
```python
# Your Paperless-ngx server URL
PAPERLESS_URL = "http://localhost:8000"

# Your Paperless API token (get from Account Settings > API Tokens)
PAPERLESS_TOKEN = "your-api-token-here"

# Tags for document processing
INCLUDE_TAG = "NEW"        # Process documents with this tag
EXCLUDE_TAG = "POCO"       # Skip documents with this tag
COMPLETION_TAG = "POCO"    # Add this tag after successful processing

# Processing behavior
MAX_DOCUMENTS = 0          # 0 = no limit
RULE_MATCH_THRESHOLD = 70  # Confidence threshold (0-100)
CONFIDENCE_THRESHOLD = 60  # Minimum score to apply metadata

# Rules directory
RULES_DIRECTORY = "rules"  # Relative to POCOmeta directory
```

### 6. Update paperless.env
Add post-consumption script setting:
```env
# Enable POCOmeta post-consumption processing
PAPERLESS_POST_CONSUME_SCRIPT=python3 -m scripts.POCOmeta.main
```

### 7. Create Rule Files
Create your document classification rules in `/home/paperless/paperless-ngx/scripts/POCOmeta/rules/`:
```bash
# Copy example rule
cp /home/paperless/paperless-ngx/scripts/POCOmeta/rules/example_bank_statement.yml \
   /home/paperless/paperless-ngx/scripts/POCOmeta/rules/my_bank.yml

# Edit the rule file
nano /home/paperless/paperless-ngx/scripts/POCOmeta/rules/my_bank.yml
```

### 8. Rebuild and Start
```bash
docker compose build
docker compose up -d
```

## How It Works

1. Upload documents to Paperless (web interface or consume folder)
2. Tag new documents with "NEW"
3. POCOmeta automatically processes them after consumption
4. Successfully processed documents get tagged "POCO"
5. Failed documents get tagged "POCO_FAILED"

## Testing

Test POCOmeta manually:
```bash
# Dry run to test configuration
docker compose exec webserver python3 -m scripts.POCOmeta.main --dry-run --verbose

# Process specific document
docker compose exec webserver python3 -m scripts.POCOmeta.main --limit-id 123

# Check logs
docker compose logs webserver | grep -i poco
```

## Directory Structure

After installation:
```
/home/paperless/paperless-ngx/scripts/
├── poco_wrapper.sh
└── POCOmeta/
    ├── main.py
    ├── settings.py
    ├── rules/
    │   └── your_rules.yml
    └── [other POCOmeta files]
```

## Troubleshooting

**Module not found errors:**
- Ensure volume mount is correct in docker-compose.yml
- Verify files are in `/home/paperless/paperless-ngx/scripts/POCOmeta/`

**API connection failed:**
- Check `PAPERLESS_TOKEN` in settings.py
- Verify `PAPERLESS_URL` is correct (usually `http://localhost:8000` inside container)

**No documents processed:**
- Ensure documents are tagged with "NEW"
- Check rule files exist in `rules/` directory
- Run with `--verbose` flag to see detailed output

This minimal setup keeps your Paperless installation clean while adding intelligent document processing.