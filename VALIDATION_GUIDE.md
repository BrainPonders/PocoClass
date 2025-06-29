# Setup Validation Tool Guide

## What It Does

The setup validation tool (`setup_validation.py`) performs comprehensive checks on your POCOmeta installation and helps fix configuration issues.

## How to Use It

### Basic Usage
```bash
python3 setup_validation.py
```

### What It Checks

**1. Environment Check**
- Python version (requires 3.7+)
- Required packages (requests, pyyaml, tabulate)

**2. Settings Configuration**
- Checks if settings.py exists
- Validates configuration values
- Detects template placeholders

**3. Connection Test**
- Tests Paperless-ngx API connection
- Verifies API token validity
- Checks server accessibility

**4. Rules Validation**
- Scans rules directory for YAML files
- Validates rule file syntax
- Reports rule loading status

**5. Quick Functionality Test**
- Runs a dry-run test with one document
- Verifies complete processing pipeline

## Common Scenarios

### Fresh Installation
```
📝 Initial setup required: settings.py not found
✅ Found settings.py.example template
📋 Run this command to get started:
   cp settings.py.example settings.py
   Then edit settings.py with your Paperless server details
```

**What to do**: Copy the template and edit it with your server details.

### Unconfigured Settings
```
❌ PAPERLESS_URL still contains template placeholder
   Please edit settings.py and set your actual Paperless server URL
```

**What to do**: Open settings.py and replace placeholder values with real ones.

### Connection Issues
```
❌ Connection test failed: HTTPConnectionPool(host='localhost', port=8000)
```

**What to do**: Check your PAPERLESS_URL and ensure the server is running.

### Invalid API Token
```
❌ Connection test failed: 401 Unauthorized
```

**What to do**: Verify your PAPERLESS_TOKEN is correct and active.

## Interactive Options

When validation fails, you get three choices:

**Option 1: Restore from backup**
- Automatically restores previous working configuration
- Useful after git updates that might have caused issues

**Option 2: Copy from template**
- Creates fresh settings.py from template
- Guides you through manual configuration

**Option 3: Exit and fix manually**
- Lets you fix issues yourself
- Run validation again after making changes

## Configuration Examples

### Minimal Working Configuration
```python
PAPERLESS_URL = "http://localhost:8000"
PAPERLESS_TOKEN = "your_actual_token_here"
INCLUDE_TAGS = ["NEW"]
```

### Docker Configuration
```python
PAPERLESS_URL = "http://paperless:8000"  # Internal Docker network
PAPERLESS_TOKEN = "your_token"
INCLUDE_TAGS = ["NEW"]
EXCLUDE_TAGS = ["PROCESSED"]
```

### Remote Server Configuration
```python
PAPERLESS_URL = "https://paperless.yourdomain.com"
PAPERLESS_TOKEN = "your_secure_token"
INCLUDE_TAGS = ["NEW"]
DOCUMENT_LIMIT = 50  # Process in batches
```

## Environment Variables (Alternative)

Instead of editing settings.py, you can use environment variables:

```bash
export PAPERLESS_URL="http://localhost:8000"
export PAPERLESS_TOKEN="your_token_here"
python3 setup_validation.py
```

Environment variables take priority over settings.py values.

## Troubleshooting Validation

### Tool Won't Run
```bash
# Check Python version
python3 --version

# Install missing packages
pip3 install requests pyyaml tabulate
```

### Settings File Issues
```bash
# Check if template exists
ls -la settings.py*

# Create from template if missing
cp settings.py.example settings.py
```

### API Connection Problems
1. **Check URL format**: Must include http:// or https://
2. **Verify server is running**: Try accessing web interface
3. **Test token**: Go to Paperless > Account Settings > API Tokens
4. **Check network**: Ensure POCOmeta can reach Paperless server

### Rules Directory Issues
```bash
# Check rules directory
ls -la rules/

# Copy template if empty
cp rules/template.yaml rules/my_rule.yaml
```

## Best Practices

### Before Production Deployment
```bash
# Always validate before going live
python3 setup_validation.py

# Test with limited documents
python3 main.py --dry-run --limit 1 --verbose
```

### After Git Updates
```bash
# Check if configuration is still valid
python3 setup_validation.py

# Update from template if needed
diff settings.py settings.py.example
```

### Regular Monitoring
```bash
# Quick health check
python3 setup_validation.py

# Test processing pipeline
python3 main.py --dry-run --limit 5
```

The validation tool is designed to catch configuration issues before they cause processing failures, making your POCOmeta deployment more reliable.