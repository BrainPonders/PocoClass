# POCOmeta Configuration Guide

## Quick Start (Prevents Git Overwrite Issues)

### 1. Initial Setup
```bash
# Copy template to your custom settings
cp settings.py.example settings.py

# Edit your settings
nano settings.py
```

### 2. Required Changes
Edit `settings.py` and change these values:
```python
PAPERLESS_URL = "http://your-server:8000"  # Your Paperless URL
PAPERLESS_TOKEN = "your_api_token_here"    # Your API token
```

### 3. Validate Configuration
```bash
# Run validation tool
python3 setup_validation.py

# Test configuration
python3 main.py --dry-run --verbose --limit 1
```

## Preventing Git Overwrite Issues

### Problem
When you run `git pull` to update POCOmeta, it can overwrite your `settings.py` file, losing your configuration and causing the script to fail with errors like:
```
PAPERLESS_TOKEN environment variable is required
```

### Solution
POCOmeta now uses a template-based configuration system:

1. **Template File**: `settings.py.example` contains the template with documentation
2. **User File**: `settings.py` contains your customized settings (git-ignored)
3. **Validation**: Built-in validation prevents unconfigured deployments

### Safe Update Procedure
```bash
# 1. Backup your current settings (automatic)
python3 setup_validation.py  # Creates backup if needed

# 2. Pull updates safely
git pull origin main

# 3. Check if settings were overwritten
python3 setup_validation.py

# 4. If needed, restore from backup or update from template
```

## Configuration Features

### Enhanced Error Messages
Instead of cryptic errors, you now get helpful guidance:
```
================================================================================
CONFIGURATION SETUP REQUIRED
================================================================================
POCOmeta requires some basic configuration to work properly.
Please edit your settings.py file and fix the following issues:

1. PAPERLESS_URL must be changed from the template value to your actual Paperless server URL
2. PAPERLESS_TOKEN must be set either in settings.py or as environment variable

QUICK SETUP GUIDE:
1. Edit settings.py in your POCOmeta directory
2. Set PAPERLESS_URL to your server URL (e.g., 'http://localhost:8000')
3. Set PAPERLESS_TOKEN to your API token (get from Paperless > Account Settings > API Tokens)
4. Save the file and run the script again
================================================================================
```

### Validation Tool
The `setup_validation.py` tool provides comprehensive checks:
- Environment validation (Python version, packages)
- Configuration validation (required settings)
- Connection testing (Paperless API)
- Rules validation (YAML files)
- Quick functionality test

### User-Friendly Settings
The new `settings.py` includes:
- Clear documentation for every setting
- Examples for common configurations
- Required vs optional setting markers
- Quick setup checklist
- Troubleshooting tips

## Production Deployment

### Docker Environment
```bash
# In your Docker environment, set environment variables
export PAPERLESS_TOKEN="your_token_here"
export PAPERLESS_URL="http://localhost:8000"

# Run validation
docker compose exec webserver bash -c "cd /usr/src/paperless/scripts/POCOmeta && python3 setup_validation.py"

# Test configuration
docker compose exec webserver bash -c "cd /usr/src/paperless/scripts/POCOmeta && python3 main.py --dry-run --verbose --limit 1"
```

### Environment Variables (Recommended for Production)
```bash
# Set in your environment (Docker, systemd, etc.)
PAPERLESS_URL=https://paperless.yourdomain.com
PAPERLESS_TOKEN=your_secure_token_here

# These override settings.py values for security
```

## Troubleshooting

### Common Issues

1. **"Settings validation failed"**
   - Run: `python3 setup_validation.py`
   - Follow the guided setup

2. **"Connection test failed"**
   - Verify PAPERLESS_URL is correct
   - Check PAPERLESS_TOKEN is valid
   - Ensure network connectivity

3. **"No rule files found"**
   - Add `.yaml` files to `rules/` directory
   - Copy from template if needed

4. **Git overwrote settings**
   - Run: `python3 setup_validation.py`
   - Choose option 1 to restore from backup
   - Or choose option 2 to reconfigure from template

### Support Commands
```bash
# Full validation
python3 setup_validation.py

# Test with minimal output
python3 main.py --dry-run --limit 1

# Test with detailed output  
python3 main.py --dry-run --verbose --limit 1

# Debug mode for troubleshooting
python3 main.py --dry-run --debug --limit 1
```

This configuration system ensures reliable deployments and prevents the setup issues you experienced with git updates.