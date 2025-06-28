# Paperless-ngx + POCOmeta Deployment Guide

This guide shows you how to deploy Paperless-ngx with POCOmeta integrated directly into the Docker container.

## Quick Start

### 1. Prepare Your Server
```bash
# Create deployment directory
mkdir -p /home/paperless/paperless-poco
cd /home/paperless/paperless-poco

# Download POCOmeta files
git clone https://github.com/your-repo/POCOmeta.git .
cd docker
```

### 2. Configure Environment
```bash
# Copy and edit environment file
cp paperless.env.example paperless.env
nano paperless.env
```

**Required settings in paperless.env:**
```env
# Basic Paperless Configuration
PAPERLESS_SECRET_KEY=your-secret-key-here
PAPERLESS_URL=http://localhost:8000

# POCOmeta Configuration
PAPERLESS_POST_CONSUME_SCRIPT=/usr/src/paperless/scripts/post_consume/poco_wrapper.sh
POCO_DRY_RUN=false
POCO_VERBOSE=false
POCO_MAX_DOCUMENTS=0

# API Configuration (POCOmeta will use internal connection)
PAPERLESS_TOKEN=your-api-token-here
```

### 3. Set Up Rule Files
```bash
# Create your rule files in the rules directory
cd ../rules
cp example_bank_statement.yml my_bank_statement.yml
nano my_bank_statement.yml
```

### 4. Deploy
```bash
cd ../docker

# Build the custom image with POCOmeta
docker compose build

# Start services
docker compose up -d

# Create admin user (first time only)
docker compose run --rm webserver createsuperuser
```

## How It Works

### Automatic Processing
1. Upload documents to Paperless (via web interface or watch folder)
2. Tag documents with "NEW" 
3. POCOmeta automatically processes them after consumption
4. Successfully processed documents get tagged "POCO"
5. Failed documents get tagged "POCO_FAILED"

### Manual Processing
You can also process documents manually:
```bash
# Process all NEW documents
docker compose exec webserver python /usr/src/paperless/scripts/post_consume/POCOmeta/main.py

# Test processing (dry run)
docker compose exec webserver python /usr/src/paperless/scripts/post_consume/POCOmeta/main.py --dry-run

# Process specific document
docker compose exec webserver python /usr/src/paperless/scripts/post_consume/POCOmeta/main.py --limit-id 123
```

## Directory Structure

After deployment, your structure will be:
```
/home/paperless/paperless-poco/
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── paperless.env
│   └── scripts/
│       └── post_consume/
│           ├── poco_wrapper.sh
│           └── POCOmeta/
│               ├── main.py
│               ├── rules/
│               └── logs/
├── rules/
│   └── your_rule_files.yml
└── POCOmeta source files...
```

## Configuration Files

### paperless.env
Main configuration file with all environment variables.

### Rule Files (rules/*.yml)
YAML files defining how to classify and extract metadata from documents.

### Volume Mounts
- Data: `/home/paperless/paperless-ngx/data`
- Media: `/home/paperless/paperless-ngx/media`  
- Consume: `/home/paperless/paperless-ngx/consume`
- Export: `/home/paperless/paperless-ngx/export`

## Troubleshooting

### Check Logs
```bash
# Paperless logs
docker compose logs webserver

# POCOmeta logs
docker compose exec webserver cat /usr/src/paperless/scripts/post_consume/POCOmeta/logs/poco.log
```

### Test Connection
```bash
# Test POCOmeta connection to Paperless API
docker compose exec webserver python /usr/src/paperless/scripts/post_consume/POCOmeta/main.py --dry-run --verbose
```

### Common Issues

**POCOmeta not running:**
- Check that `PAPERLESS_POST_CONSUME_SCRIPT` is set correctly
- Verify script permissions: `chmod +x poco_wrapper.sh`

**API connection failed:**
- Verify `PAPERLESS_TOKEN` in paperless.env
- Check Paperless is running and accessible

**No documents processed:**
- Ensure documents are tagged with "NEW"
- Check rule files exist in rules/ directory

## Next Steps

1. Upload a test document
2. Tag it with "NEW"
3. Watch the logs to see POCOmeta process it
4. Create your own rule files for your document types
5. Adjust settings in paperless.env as needed

The system is now ready for production use!