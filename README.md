# POCOmeta - Post-Consumption Metadata Processor

## Overview

POCOmeta is a post-consumption metadata processor for Paperless-ngx that automatically enriches documents with metadata using rule-based pattern matching and confidence scoring. It's designed specifically for bulk document imports and provides automated, high-quality metadata extraction with transparency and customizability.

## Why This Project Exists

When I first set up Paperless-ngx and began importing decades’ worth of bank statements, payslips, tax returns, and other routine documents, I quickly realized that the built-in learning and classification system wasn’t keeping up. Even after manually correcting dozens of documents, Paperless kept making the same mistakes. What began as a simple post-consumption script, tailored for a few common document types, gradually evolved into this project—a flexible, rule-based tool that lets me accurately identify and tag any document, reliably and repeatably, with minimal manual effort.

## How it works

POCOmeta uses simple YAML rule files to describe how each document type can be recognized. For every rule, you define core and bonus identifiers—key words or patterns to look for in the document’s OCR text, filename, or even its existing Paperless metadata. Each rule can also include scoring instructions and patterns for extracting specific metadata, such as dates.

When POCOmeta runs, it loads all your rules and checks each document against them. It matches the document’s content and filename to the patterns you set, calculates a confidence score based on your rules, and then applies the static and dynamic metadata you’ve defined—like document type, tags, or a creation date. The end result: every document is classified using transparent, fully customizable logic, with a confidence score to help you catch any uncertainties.

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

**Document Processing**
-	Modular, human-readable YAML rules
-	Full support for static and dynamic metadata extraction
-	Confidence (“POCO”) scoring for every field and document
-	Compatible with bulk imports and archive rescans

**Test File Mode**
- Bulk Rule evaluation to see which rule matches which files
- Detailed file rule evaluation to examine the rule and scoring


### 🚀 Planned Features

**Interactive Rule Editor**
- Wizard-based rule creation tool with guided workflow
- Visual pattern highlighting and validation testing
- Automatic threshold calculation and scoring optimization


## Contributing

POCOmeta is designed to be extensible and welcomes contributions:

- **Feature Enhancements**: Improve scoring algorithms or add new capabilities
- **Bug Reports**: Report issues with detailed reproduction steps
- **Documentation**: Help improve setup guides and usage examples

## License

This project is licensed under the MIT License. See LICENSE file for details.