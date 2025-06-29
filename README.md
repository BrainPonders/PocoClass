# POCOmeta - Post-Consumption Metadata Processor

## Overview

POCOmeta is a sophisticated post-consumption metadata processor for Paperless-ngx that automatically enriches documents with intelligent metadata using rule-based pattern matching and confidence scoring. It's designed specifically for bulk document imports and provides automated, high-quality metadata extraction with transparency and customizability.

## Why This Project Exists

Bulk-importing documents into Paperless-ngx—such as years' worth of bank statements, tax returns, pay slips, and other records—is a common need for new users or organizations migrating from legacy archives.

However, Paperless-ngx's built-in metadata extraction and document classification capabilities often fall short when handling diverse, historic, or large sets of documents. This results in inaccurate or missing metadata (e.g., document type, date, correspondent, tags), which in turn leads to extensive manual correction and inconsistent archives.

To address these challenges, this project introduces a modular, rule-based post-consumption pipeline for Paperless-ngx:

• **Automated High-Quality Metadata Extraction:**
By defining clear rules for each document type, the pipeline ensures that imported documents are consistently and accurately classified, even during large-scale imports.

• **Customizability & Modularity:**
Rules can be tailored or extended for any kind of document, not just the most frequent types. This makes the system adaptable to different archives and future needs.

• **Transparency & Explainability:**
Every decision made by the pipeline is traceable: each rule match, score, and extracted metadata is logged and available for review. This provides users with confidence in the automation and makes troubleshooting straightforward.

• **Bulk Import Ready:**
Whether migrating a personal archive or processing corporate records, the pipeline is designed to handle high volumes with minimal manual intervention.

## Installation

POCOmeta integrates with your existing Paperless-ngx setup with minimal changes. Choose the installation method that works best for your setup.

### Prerequisites

- Working Paperless-ngx installation with Docker
- API token from Paperless-ngx (Account Settings > API Tokens)
- Python 3.7+ environment (inside Paperless container or standalone)

### Method 1: Docker Integration (Recommended)

For users running Paperless-ngx in Docker containers:

1. **Clone POCOmeta to your scripts directory**
   ```bash
   # Navigate to your Paperless installation directory
   cd /path/to/your/paperless-ngx/scripts
   git clone https://github.com/your-repo/POCOmeta.git
   ```

2. **Install Python dependencies**
   Update your Dockerfile to include:
   ```dockerfile
   # Install Python dependencies for POCOmeta
   RUN pip3 install requests pyyaml tabulate
   ```

3. **Mount scripts directory**
   Update your docker-compose.yml:
   ```yaml
   services:
     webserver:
       volumes:
         - /path/to/your/paperless-ngx/scripts:/usr/src/paperless/scripts:rw
   ```

4. **Configure POCOmeta**
   Copy and edit the settings file:
   ```bash
   cd POCOmeta
   cp settings.py.example settings.py
   # Edit settings.py with your configuration
   ```

5. **Set up post-consumption hook**
   In your paperless.env file:
   ```env
   PAPERLESS_POST_CONSUME_SCRIPT=python3 -m scripts.POCOmeta.main
   ```

6. **Rebuild and restart**
   ```bash
   docker compose build && docker compose up -d
   ```

### Method 2: Standalone Installation

For users with standalone Paperless installations or custom setups:

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/POCOmeta.git
   cd POCOmeta
   ```

2. **Install dependencies**
   ```bash
   pip install requests pyyaml tabulate
   ```

3. **Configure settings**
   ```bash
   cp settings.py.example settings.py
   # Edit settings.py with your Paperless-ngx URL and API token
   ```

4. **Test configuration**
   ```bash
   python main.py --dry-run --verbose
   ```

### Configuration

Edit your `settings.py` file with these essential settings:

```python
# Paperless-ngx connection
PAPERLESS_URL = "http://localhost:8000"  # Your Paperless-ngx URL
PAPERLESS_TOKEN = "your-api-token-here"  # Your API token

# Document filtering
INCLUDE_TAG = "NEW"     # Process documents with this tag
COMPLETION_TAG = "POCO" # Add this tag after successful processing

# Processing behavior
DRY_RUN = False        # Set to True to simulate without changes
DOCUMENT_LIMIT = None  # Limit documents per run (None = no limit)
```

### Testing Your Installation

Verify everything works correctly:

```bash
# Test API connection and configuration
python main.py --dry-run --verbose

# Process a specific document by ID
python main.py --limit-id 123

# Bulk verification mode for rule testing
python main.py --dry-run --bulk-verify --limit 10
```

## How It Works

POCOmeta follows a systematic pipeline approach to document processing:

### System Architecture

**Pipeline Design**: Each processing step is handled by a dedicated module, ensuring modularity and maintainability.

**Rule-Based Classification**: YAML configuration files define document classification rules with flexible pattern matching capabilities.

**API Integration**: Built around the Paperless-ngx REST API for seamless document retrieval and metadata updates.

**Confidence Scoring**: POCO (Post-COnsumption) scoring system measures metadata reliability across different sources.

### Processing Workflow

1. **Document Retrieval**: Fetch documents from Paperless-ngx based on tag filters
2. **Rule Evaluation**: Apply classification rules using pattern matching against content and filenames
3. **Metadata Extraction**: Extract both static metadata and dynamic values from document content
4. **Confidence Calculation**: Calculate POCO scores based on metadata agreement between sources
5. **Document Update**: Apply validated metadata back to Paperless-ngx (or simulate in dry-run mode)

### Key Components

- **Configuration Management**: Handles settings, environment variables, and validation
- **API Client**: Manages authentication and communication with Paperless-ngx
- **Rule Processing**: Loads YAML rules and evaluates pattern matching logic
- **Scoring System**: Calculates confidence scores using weighted metadata comparison
- **Output Generation**: Provides detailed reporting with colored console output

## Rule Development

### Rule Structure

Rules are defined in YAML files with this structure:

```yaml
rule_id: "example_rule"
rule_name: "Example Document Type"
threshold: 70

identifiers:
  core:
    - logic_group:
        match:
          - field: "content"
            pattern: "Required Pattern"
            points: 50
  
  bonus:
    - logic_group:
        match:
          - field: "filename"
            pattern: "Optional Pattern"
            points: 25

metadata:
  static:
    correspondent: "Example Corp"
    document_type: "Invoice"
    tags: ["finance", "invoice"]
  
  dynamic:
    date_patterns:
      - pattern: "Date: (\\d{4}-\\d{2}-\\d{2})"
        format: "%Y-%m-%d"
```

### Pattern Matching

- **Core Identifiers**: Required patterns that must achieve the threshold score
- **Bonus Identifiers**: Optional patterns that increase confidence
- **Logic Groups**: Support AND (`match`) and OR (`or`) conditions
- **Field Targets**: Match against `content`, `filename`, or both

### Metadata Extraction

- **Static Metadata**: Fixed values assigned when rule matches
- **Dynamic Metadata**: Values extracted from document content using regex patterns
- **Date Handling**: Automatic date parsing with configurable formats

## Command Line Usage

POCOmeta provides comprehensive command-line options:

### Basic Commands

```bash
# Process all NEW documents
python main.py

# Dry-run mode (simulate without changes)
python main.py --dry-run

# Verbose output with detailed scoring
python main.py --verbose

# Debug mode with comprehensive diagnostics
python main.py --debug
```

### Document Targeting

```bash
# Process specific document
python main.py --limit-id 123

# Limit number of documents
python main.py --limit 50

# Show document IDs only
python main.py --id-only

# Display document content
python main.py --show-content 123
```

### Rule Validation

```bash
# Bulk verification mode
python main.py --dry-run --bulk-verify

# Test against all documents (ignore tag filtering)
python main.py --dry-run --bulk-verify --ignore-tags

# Quick rule testing with limited documents
python main.py --dry-run --bulk-verify --limit 25
```

## Features

### ✅ Fully Implemented

**Core Document Processing**
- Document retrieval from Paperless-ngx API with flexible filtering
- OCR content analysis and pattern matching
- YAML-based rule system for document classification
- Static and dynamic metadata extraction

**Filtering and Selection**
- Tag-based document filtering (include/exclude)
- Document type and correspondent filtering
- Individual document targeting by ID
- Configurable processing limits

**Confidence Scoring**
- Multi-tier rule scoring (core + bonus identifiers)
- POCO confidence calculation across metadata sources
- Configurable thresholds for rule matching and metadata application
- Detailed score breakdown and analysis

**API Integration**
- Full Paperless-ngx REST API integration
- Token-based authentication with environment variable support
- Automatic tag, correspondent, and document type creation
- Custom field support for extended metadata

**Output and Reporting**
- Colored console output for enhanced readability
- Verbose mode with detailed processing information
- Debug mode for rule development and troubleshooting
- Bulk verification mode for efficient rule testing
- Comprehensive processing summaries and statistics

**Safety Features**
- Dry-run mode for safe testing
- Configuration validation before processing
- Graceful error handling with detailed reporting
- Automatic success/failure tagging

### 🚧 Partially Implemented

**Advanced Error Recovery**
- Basic error handling and logging implemented
- Automatic retry mechanisms planned for future implementation

### 🚀 Planned Features

**Interactive Rule Editor**
- Wizard-based rule creation tool with guided workflow
- Fetch document content via API and display for pattern identification
- Step-by-step questions to generate optimized YAML rules
- Visual pattern highlighting and validation testing
- Automatic threshold calculation and scoring optimization

**Test File Mode**
- YAML-based test data input for testing POCO scoring logic
- Validate scoring algorithms and test edge cases quickly
- Fast execution without live Paperless connection

**Rule Templates**
- Pre-built rule templates for common document types
- Faster setup for new users with standard document categories

**Webhook Integration**
- Send processing results to external systems
- Integration with workflow automation tools

**Enhanced Analytics**
- Processing statistics and performance metrics
- Monitor system performance and rule effectiveness

## Typical Use Cases

**Initial Migration**: Import large backlogs of mixed documents (bank statements, invoices, contracts) into fresh Paperless-ngx instances with automatic classification.

**Ongoing Automation**: Ensure future bulk or scheduled imports are correctly and automatically tagged and classified without manual intervention.

**Consistency Enforcement**: Standardize metadata across existing archives, reducing manual correction efforts and improving searchability.

**Rule Development**: Use bulk verification mode to test and refine classification rules against large document sets.

## Troubleshooting

### Common Issues

**API Connection Problems**
- Verify `PAPERLESS_URL` and `PAPERLESS_TOKEN` in settings
- Test with: `python main.py --dry-run --verbose`
- Check Paperless-ngx logs for authentication errors

**No Documents Found**
- Ensure documents are tagged with your `INCLUDE_TAG` (default: "NEW")
- Verify tag filtering settings in configuration
- Use `--id-only` to list available documents

**Rule Matching Issues**
- Use `--debug` mode to see detailed pattern matching
- Test with single documents: `--limit-id 123 --verbose`
- Verify rule YAML syntax and pattern formatting

**Performance Issues**
- Use `--limit` to process smaller batches
- Consider rule optimization for complex patterns
- Monitor processing time in verbose output

### Getting Help

1. **Enable debug mode**: `python main.py --debug` for detailed diagnostics
2. **Check configuration**: Use `python setup_validation.py` to verify settings
3. **Test with single documents**: `--limit-id` for isolated testing
4. **Review logs**: Check both POCOmeta and Paperless-ngx logs

## Contributing

POCOmeta is designed to be extensible and welcomes contributions:

- **Rule Templates**: Share rules for common document types
- **Feature Enhancements**: Improve scoring algorithms or add new capabilities
- **Bug Reports**: Report issues with detailed reproduction steps
- **Documentation**: Help improve setup guides and usage examples

## License

This project is licensed under the MIT License. See LICENSE file for details.