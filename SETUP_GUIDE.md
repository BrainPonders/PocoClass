# POCOmeta Setup Guide

## Fresh Installation

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/POCOmeta.git
cd POCOmeta
```

### 2. Create Configuration File
```bash
# Copy template to create your settings
cp settings.py.example settings.py
```

### 3. Configure Your Settings
Edit `settings.py` and update these required values:
```python
PAPERLESS_URL = "http://your-server:8000"     # Your Paperless server URL
PAPERLESS_TOKEN = "your_api_token_here"       # Your API token
```

### 4. Validate Setup
```bash
# Check configuration
python3 setup_validation.py

# Test with one document
python3 main.py --dry-run --verbose --limit 1
```

## Docker Installation

### Add to Existing Paperless Container
```bash
# Enter your Paperless container
docker compose exec webserver bash

# Clone POCOmeta
cd /usr/src/paperless/scripts
git clone https://github.com/yourusername/POCOmeta.git
cd POCOmeta

# Install dependencies
pip3 install requests pyyaml tabulate

# Create configuration
cp settings.py.example settings.py
nano settings.py

# Validate setup
python3 setup_validation.py
```

### Environment Variables (Recommended)
Instead of editing settings.py, use environment variables:
```bash
export PAPERLESS_URL="http://localhost:8000"
export PAPERLESS_TOKEN="your_token_here"
```

## Post-Consumption Hook

Add to your Paperless configuration:
```bash
PAPERLESS_POST_CONSUME_SCRIPT="/usr/src/paperless/scripts/POCOmeta/poco_wrapper.sh"
```

## Configuration Security

### Git Safety
- `settings.py` is automatically ignored by git
- Your configuration will never be overwritten by updates
- `settings.py.example` provides the template

### Safe Updates
```bash
# Pull updates without losing configuration
git pull origin main

# Verify configuration is still intact
python3 setup_validation.py
```

## Required Configuration

### Minimum Settings
```python
PAPERLESS_URL = "http://your-server:8000"
PAPERLESS_TOKEN = "your_token_here"
INCLUDE_TAGS = ["NEW"]
```

### API Token Setup
1. Login to Paperless web interface
2. Go to Account Settings > API Tokens
3. Create new token
4. Copy token to settings.py or environment variable

## Rule Configuration

### Basic Rules
- Place `.yaml` rule files in `rules/` directory
- Use `rules/template.yaml` as starting point
- Each rule defines document classification patterns

### Example Rule Structure
```yaml
rule_id: "my_document_type"
rule_name: "My Document Type"
threshold: 70

identifiers:
  core:
    match:
      - field: "content"
        pattern: "INVOICE"
        points: 50

metadata:
  static:
    document_type: "Invoice"
    correspondent: "Vendor Name"
```

## Troubleshooting

### Common Issues

**"settings.py not found"**
```bash
cp settings.py.example settings.py
# Edit the file with your settings
```

**"Connection failed"**
- Verify PAPERLESS_URL is correct
- Check PAPERLESS_TOKEN is valid
- Test network connectivity

**"No documents found"**
- Verify documents have INCLUDE_TAGS (default: "NEW")
- Check document filters in settings

### Support Commands
```bash
# Full validation and diagnostics
python3 setup_validation.py

# Test processing
python3 main.py --dry-run --limit 1

# Debug mode
python3 main.py --dry-run --debug --limit 1

# Show help
python3 main.py --help
```

## Production Deployment

### Automated Processing
```bash
# Process all new documents
python3 main.py

# Process with limits
python3 main.py --limit 10

# Dry run for testing
python3 main.py --dry-run --verbose
```

### Monitoring
- Check `log.txt` for processing history
- Use `--verbose` for detailed output
- Monitor POCO confidence scores

This setup ensures reliable configuration management and prevents the git overwrite issues experienced in previous versions.