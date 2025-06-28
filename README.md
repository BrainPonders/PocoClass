# POCOmeta

A powerful post-consumption metadata processor for Paperless-ngx that automatically classifies and enriches your documents using intelligent rule-based pattern matching.

## 🚀 Quick Start

1. **Configure your settings** in `settings.py`
2. **Set up your Paperless connection** (URL and API token)
3. **Create classification rules** in the `rules/` folder
4. **Run the script** to process your documents

## ⚙️ Configuration

### Easy Configuration with settings.py

The script uses a user-friendly configuration file (`settings.py`) where you can customize all settings with clear explanations. Simply edit the values in this file to match your setup.

**Key settings to configure:**

```python
# Your Paperless server
PAPERLESS_URL = "https://your-paperless-server.com"
PAPERLESS_TOKEN = "your-api-token"

# Which documents to process
INCLUDE_TAG = "NEW"        # Only process documents with this tag
EXCLUDE_TAG = "POCO"       # Skip documents that already have this tag
COMPLETION_TAG = "POCO"    # Tag to add after processing

# Processing limits
MAX_DOCUMENTS = 10         # Limit for testing (0 = no limit)
```

### Environment Variables (Optional)

You can also use environment variables which take priority over settings.py:
- `PAPERLESS_URL` - Your Paperless server URL
- `PAPERLESS_TOKEN` - Your API authentication token
- `FILTER_TAG_INCLUDE` - Tag for documents to process
- `FILTER_TAG_EXCLUDE` - Tag to skip documents

## 📁 Project Structure

```
├── main.py                 # Main application entry point
├── settings.py             # User-friendly configuration
├── config.py               # Configuration handler
├── rules/                  # Your classification rules
│   ├── template.yaml       # Rule template and examples
│   └── *.yaml             # Your custom rule files
├── api_client.py           # Paperless API communication
├── pattern_matcher.py      # Rule evaluation engine
├── metadata_processor.py   # Metadata extraction
├── output_generator.py     # Results formatting
└── processor_pipeline.py   # Main processing workflow
```

## 🎯 Usage Examples

### Basic Usage
```bash
# Process all NEW documents
python main.py

# Test without making changes
python main.py --dry-run

# See detailed processing information
python main.py --verbose

# Process only 5 documents for testing
python main.py --limit 5
```

### Advanced Usage
```bash
# Process specific document
python main.py --limit-id 123

# Show document content for rule development
python main.py --show-content 123

# List all document IDs
python main.py --id-only

# Debug mode with detailed pattern matching
python main.py --debug
```

## 📋 Available Settings

### Server Connection
- **PAPERLESS_URL** - Your Paperless-ngx server address
- **PAPERLESS_TOKEN** - API authentication token

### Document Filtering
- **INCLUDE_TAG** - Only process documents with this tag
- **EXCLUDE_TAG** - Skip documents that have this tag  
- **COMPLETION_TAG** - Tag applied after successful processing
- **MAX_DOCUMENTS** - Limit number of documents processed
- **DOCUMENT_TYPES_FILTER** - Only process specific document types
- **CORRESPONDENTS_FILTER** - Only process specific correspondents

### Processing Behavior
- **RULE_MATCH_THRESHOLD** - Minimum score for rule matching (0-100)
- **CONFIDENCE_THRESHOLD** - Minimum confidence to apply metadata (0-100)
- **ENABLE_FILENAME_MATCHING** - Match patterns in filenames
- **ENABLE_CONTENT_MATCHING** - Match patterns in document text
- **ENABLE_DATE_EXTRACTION** - Extract dates from content/filename
- **ENABLE_AMOUNT_EXTRACTION** - Extract amounts from content

### Custom Fields
- **POCO_SCORE_FIELD_NAME** - Field name for confidence scores
- **DOCUMENT_CATEGORY_FIELD_NAME** - Field name for categories
- **PROCESSING_DATE_FIELD_NAME** - Field name for processing dates

### Safety Features
- **DEFAULT_DRY_RUN** - Enable dry-run mode by default
- **ENABLE_METADATA_BACKUP** - Create backups before changes
- **DEFAULT_VERBOSITY** - Output detail level ("normal", "verbose", "debug")

### Advanced Settings
- **API_TIMEOUT** - Request timeout in seconds
- **API_RETRY_COUNT** - Number of retries for failed requests
- **API_DELAY** - Delay between requests to avoid rate limiting
- **MAX_FILE_SIZE_MB** - Maximum file size to process

### Rule Development
- **SHOW_PATTERN_DETAILS** - Show detailed pattern matching info
- **HIGHLIGHT_MATCHES** - Highlight matched text in output
- **SHOW_SCORE_BREAKDOWN** - Show confidence score details

## 🔧 Getting Your API Token

1. Go to your Paperless-ngx web interface
2. Click your profile picture → Account
3. Go to "API Tokens"
4. Generate a new token
5. Copy the token to your `settings.py` or environment variables

## 📝 Creating Rules

Rules are YAML files in the `rules/` directory that define how documents should be classified. See `rules/template.yaml` for examples and documentation.

Basic rule structure:
```yaml
rule_id: "my_rule"
description: "Classify bank statements"
core_identifiers:
  group1:
    logic: "match"
    conditions:
      - field: "content"
        pattern: "BANK STATEMENT"
static_metadata:
  correspondent: "My Bank"
  document_type: "Bank Statement"
```

## 🛡️ Safety Features

- **Dry-run mode** - Test changes without applying them
- **Automatic backups** - Metadata backed up before changes
- **Confidence scoring** - Only apply changes above confidence threshold
- **Processing limits** - Limit documents processed in one run
- **Error handling** - Graceful handling of API errors

## 🔍 Troubleshooting

### Common Issues

**"PAPERLESS_TOKEN environment variable is required"**
- Set your API token in `settings.py` or as environment variable

**"No documents found with tag 'NEW'"**
- Check your tag names in `settings.py`
- Verify documents have the correct tags in Paperless

**"Failed to connect to Paperless API"**
- Verify your PAPERLESS_URL in `settings.py`
- Check if your Paperless server is running
- Confirm your API token is valid

### Debug Mode

Use `--debug` flag to see detailed information about:
- Rule evaluation process
- Pattern matching details
- Confidence score calculations
- API communication

## 📊 Understanding Output

The script provides detailed output showing:
- Documents processed
- Rules matched
- Confidence scores
- Metadata changes applied
- Processing summary

Use `--verbose` for detailed scoring breakdown and `--debug` for complete diagnostic information.

## 🔄 Integration Tips

### For New Users
1. Start with `DEFAULT_DRY_RUN = True` in settings.py
2. Test with `MAX_DOCUMENTS = 5` first
3. Use `--verbose` to understand the process
4. Gradually increase processing limits

### For Production Use
1. Set up proper tag workflow (NEW → POCO)
2. Create comprehensive rules for your document types
3. Enable metadata backups
4. Monitor processing logs

### For Rule Development
1. Enable `SHOW_PATTERN_DETAILS = True`
2. Use `--show-content ID` to examine document text
3. Test rules with `--limit-id ID` for specific documents
4. Use `--debug` to see detailed pattern matching