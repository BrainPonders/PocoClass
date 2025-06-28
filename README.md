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

---

### Typical Use Cases

• **Initial Migration:**
Importing a large backlog of mixed documents (bank statements, invoices, contracts, etc.) into a fresh Paperless-ngx instance.

• **Ongoing Automation:**
Ensuring future bulk or scheduled imports are correctly and automatically tagged and classified.

• **Consistency Enforcement:**
Standardizing metadata across existing archives, reducing manual correction efforts.

## System Architecture

### Core Architecture Pattern
- **Modular Pipeline Design**: The system follows a pipeline architecture where each processing step is handled by a dedicated module
- **Rule-Based Classification**: Uses YAML configuration files to define document classification rules with pattern matching
- **API-First Integration**: Built around the Paperless-ngx REST API for document retrieval and updates
- **Confidence Scoring System**: Implements POCO scoring to measure metadata reliability across different sources

### Processing Flow
1. **Document Retrieval**: Fetch documents from Paperless-ngx API based on tag filters
2. **Rule Loading**: Load and validate YAML rule files from the rules directory
3. **Pattern Matching**: Apply core and bonus identifiers against document content
4. **Metadata Extraction**: Extract static and dynamic metadata from matching rules
5. **Confidence Scoring**: Calculate POCO scores based on metadata agreement
6. **Output Generation**: Provide formatted results with optional verbose reporting

## Key Components

### Configuration Management (`config.py`)
- **Environment Variable Handling**: Manages API endpoints, tokens, and processing parameters
- **Default Settings**: Provides sensible defaults for tag names, thresholds, and field names
- **Validation**: Ensures required configuration is present before processing

### API Integration (`api_client.py`)
- **Session Management**: Maintains authenticated HTTP sessions with Paperless-ngx
- **Token Authentication**: Uses API tokens for secure communication
- **Connection Testing**: Validates API connectivity before processing
- **Tag Management**: Handles tag creation and retrieval operations

### Rule Processing System
- **Rule Loader** (`rule_loader.py`): Loads and validates YAML rule files
- **Pattern Matcher** (`pattern_matcher.py`): Evaluates logic groups and pattern conditions
- **Metadata Processor** (`metadata_processor.py`): Extracts static and dynamic metadata

### Document Processing Pipeline (`processor_pipeline.py`)
- **Orchestration**: Coordinates all processing steps in sequence
- **Error Handling**: Manages processing errors and continues with remaining documents
- **Results Tracking**: Maintains statistics on processing success and rule usage
- **Performance Monitoring**: Tracks processing time and throughput

### Scoring and Confidence (`scoring_calculator.py`)
- **POCO Algorithm**: Calculates confidence scores based on metadata source agreement
- **Weighted Scoring**: Uses configurable weights for different metadata sources
- **Threshold Evaluation**: Determines pass/fail status based on confidence thresholds

## Data Flow

### Document Dictionary Structure (`document_dict.py`)
The system uses a comprehensive dictionary structure to track document processing:

```python
{
    "id": int,                    # Paperless document ID
    "title": str,                 # Document title
    "filename": str,              # Original filename
    "content": str,               # Full OCR text content
    "paperless_metadata": {...},  # API metadata
    "rule_evaluations": [...],    # Rule matching results
    "selected_rule": {...},       # Best matching rule
    "poco_summary": {...}         # Confidence scoring results
}
```

### Rule Structure (YAML)
Rules define classification logic using:
- **Core Identifiers**: Required patterns that must match (threshold-based)
- **Bonus Identifiers**: Optional patterns that increase confidence
- **Logic Groups**: Support AND/OR conditions with scoring weights
- **Metadata Extraction**: Static and dynamic metadata assignment

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
├── processor_pipeline.py   # Main processing orchestration
├── pattern_matcher.py      # Rule evaluation and pattern matching
├── metadata_processor.py   # Metadata extraction and processing
├── scoring_calculator.py   # POCO confidence scoring
├── output_generator.py     # Formatted output and reporting
└── document_dict.py        # Document data structure
```

## 🔧 Installation

### Requirements
- Python 3.11+
- Network access to your Paperless-ngx instance
- API token with read/write permissions

### Dependencies
```bash
pip install requests pyyaml tabulate
```

### Setup
1. Clone this repository
2. Install dependencies
3. Copy `settings.py.example` to `settings.py` and configure your settings
4. Create rule files in the `rules/` directory
5. Run with `python main.py`

## 📖 Usage

### Basic Usage
```bash
# Process documents with default settings
python main.py

# Dry run (no changes made)
python main.py --dry-run

# Verbose output with detailed information
python main.py --verbose

# Process specific document by ID
python main.py --document-id 123

# Limit processing to 5 documents
python main.py --limit 5
```

### Command Line Options
- `--dry-run` - Simulate processing without making changes
- `--verbose` - Show detailed processing information
- `--debug` - Enable debug output and logging
- `--document-id ID` - Process only a specific document
- `--limit N` - Process maximum N documents
- `--help` - Show all available options

## 📝 Creating Rules

### Rule File Structure
Rules are defined in YAML files in the `rules/` directory. Each rule contains:

```yaml
rule_id: "example_rule"
description: "Example document classification rule"
version: "1.0"

# Core patterns that must match
core_identifiers:
  - type: "match"
    score: 50
    conditions:
      - pattern: "Required Pattern"
        source: "content"

# Optional bonus patterns
bonus_identifiers:
  - type: "or"
    score: 10
    conditions:
      - pattern: "Bonus Pattern"
        source: "content"

# Metadata to extract and apply
static_metadata:
  correspondent: "Example Corp"
  document_type: "Invoice"
  tags: ["Finance", "Important"]

# Dynamic extraction from content
dynamic_metadata:
  date_created:
    pattern: "Date: (\\d{4}-\\d{2}-\\d{2})"
    date_format: "%Y-%m-%d"
```

### Pattern Matching
- **Content patterns**: Match against OCR text
- **Filename patterns**: Match against original filename
- **Logic groups**: Combine patterns with AND/OR logic
- **Scoring**: Weight patterns by importance

## 📊 Output and Reporting

### Standard Output
- Document processing summary
- Rule matching results
- Metadata extraction details
- POCO confidence scores

### Verbose Mode
- Detailed pattern matching analysis
- Step-by-step processing breakdown
- Metadata comparison across sources
- Rule evaluation scoring

### Debug Mode
- Complete document data structures
- API response details
- Internal processing states
- Error diagnostics

## 🔒 Security and Privacy

### Data Protection
- No personal information stored in code
- Rule files can be kept private
- Secure API token handling
- Local processing only

### Git Repository
The following files are excluded from version control:
- Personal rule files (`*_###.yaml`)
- Development documentation (`replit.md`)
- Debug and log files
- API tokens and credentials

## 🤝 Contributing

### Rule Development
1. Create rule files in the `rules/` directory
2. Test with `--dry-run` and `--verbose` flags
3. Validate pattern matching with debug output
4. Share templates (without personal data)

### Code Contributions
1. Follow existing code structure
2. Add comprehensive docstrings
3. Test with real Paperless data
4. Document changes in commit messages

## 📋 External Dependencies

### Required Libraries
- **requests**: HTTP client for Paperless-ngx API communication
- **pyyaml**: YAML parsing for rule configuration files
- **tabulate**: Formatted table output for reporting

### Paperless-ngx Integration
- **API Version**: Compatible with Paperless-ngx REST API v1
- **Authentication**: Token-based authentication required
- **Required Permissions**: Read access for documents, write access for tags and metadata

### Environment Requirements
- **Python 3.11+**: Modern Python runtime with type hints support
- **Network Access**: HTTP/HTTPS connectivity to Paperless-ngx instance
- **File System**: Read access to rules directory, write access for logging

## 🚀 Deployment Strategy

### Container Environment
- **Python Environment**: Uses Python 3.11 with YAML system dependencies
- **Package Management**: Standard pip installation with requirements
- **Configuration**: Environment variables or settings file

### Configuration Management
- **Environment Variables**: All sensitive configuration via environment variables
- **Default Values**: Sensible defaults for development and testing
- **Validation**: Runtime validation of required configuration

### Execution Modes
- **Production Mode**: Normal processing with API updates
- **Dry Run Mode**: Simulation without making changes
- **Verbose Mode**: Detailed logging and debugging output
- **Limited Processing**: Support for processing subsets of documents

## 📄 License

This project is released under the GNU General Public License. See LICENSE file for details.

## 🆕 Recent Changes

### Initial Release
- Complete modular document classification system
- Rule-based pattern matching with confidence scoring
- Comprehensive API integration with Paperless-ngx
- User-friendly configuration and extensive documentation
- Privacy-focused design with secure rule management