# PocoClass - Document Classification System for Paperless-ngx

Automated document classification and enrichment system for Paperless-ngx with POCO Scoring v2, featuring a modern React wizard interface and intelligent pattern matching.

## Overview

PocoClass is a web-based document classification system that helps you automatically classify and enrich documents in Paperless-ngx. It features:

- **Modern Web Interface**: React-based 6-step wizard for creating classification rules
- **POCO Scoring v2**: Dual-score evaluation system (OCR Score + POCO Score) for accurate classification
- **Pattern Matching**: Intelligent OCR content matching with regex support
- **Metadata Extraction**: Dynamic extraction of dates, amounts, and custom fields
- **Multi-User Support**: Secure authentication using Paperless-ngx credentials
- **Document Filtering**: Paperless-ngx-style filter bar for browsing documents

## Architecture

### Frontend (React + Vite)
- 6-step rule builder wizard with real-time POCO score visualization
- Document viewer with OCR/PDF support
- Advanced filtering system (title, tags, correspondents, document types, dates)
- Modern light-theme UI with Tailwind CSS

### Backend (Python + Flask)
- RESTful API for rule management and document processing
- POCO Scoring v2 engine with dual-score system
- Pattern matching and metadata extraction
- SQLite database for users, sessions, and Paperless data caching
- Test and execute engine for rule validation

## POCO Scoring v2

PocoClass uses a dual-score evaluation system:

1. **POCO OCR Score (Transparency Score)**: `(OCR_matched / OCR_total) × 100` (threshold: 75%)
2. **POCO Score (Actionable Score)**: Weighted combination of OCR, filename, and Paperless metadata (threshold: 80%)

Documents are classified only when **both thresholds** are met, ensuring high accuracy.

## Installation

### Prerequisites
- Python 3.11+
- Node.js 20+
- Paperless-ngx instance with API access
- Paperless-ngx API token

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/eRJe79/PocoClass.git
   cd PocoClass
   ```

2. **Generate encryption key** (REQUIRED)
   
   PocoClass encrypts Paperless API tokens for security. Generate a unique key for your installation:
   
   ```bash
   python3 generate_secret_key.py
   ```
   
   This will generate a secure encryption key and show setup instructions for different deployment methods.

3. **Set up environment variables**
   
   **Option A: Using .env file (Development - Recommended)**
   ```bash
   # Copy template
   cp .env.example .env
   
   # Edit .env and add your generated key
   nano .env
   ```
   
   Add to `.env`:
   ```bash
   # REQUIRED: Encryption key (from step 2)
   POCOCLASS_SECRET_KEY=your_generated_key_here
   
   # OPTIONAL: Paperless-ngx connection (can be configured via Web UI)
   PAPERLESS_URL=https://your-paperless-instance.com
   PAPERLESS_TOKEN=your-api-token-here
   ```
   
   **Option B: Export in terminal (Temporary)**
   ```bash
   export POCOCLASS_SECRET_KEY="your_generated_key_here"
   export PAPERLESS_URL="https://your-paperless-instance.com"
   export PAPERLESS_TOKEN="your-api-token-here"
   ```

4. **Install backend dependencies**
   ```bash
   pip install flask flask-cors pyyaml requests tabulate cryptography
   ```

5. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

6. **Build frontend**
   ```bash
   npm run build
   cd ..
   ```

7. **Run the application**
   ```bash
   ./start.sh
   ```

The application will be available at `http://localhost:5000` (HTTPS on Replit)

### Docker Installation

See detailed Docker installation guide below.

### Bare Metal Installation

See detailed bare metal installation guide below.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PAPERLESS_URL` | Paperless-ngx server URL | `http://localhost:8000` |
| `PAPERLESS_TOKEN` | Paperless-ngx API token | Required |
| `DATABASE_URL` | PostgreSQL database URL | Required |

### First-Time Setup

1. Navigate to `http://localhost:5000`
2. Complete the initial setup wizard:
   - Enter your Paperless-ngx URL and credentials
   - System will verify connection and sync initial data
3. Create your first classification rule using the wizard

## Creating Classification Rules

Rules are defined using a 6-step wizard:

1. **Basic Information**: Rule name, ID, and thresholds
2. **Core Identifiers**: OCR patterns that identify the document (logic groups)
3. **Static Metadata**: Fixed values to apply (correspondent, document type, tags)
4. **Dynamic Metadata**: Patterns to extract data from document content
5. **Filename Patterns**: Secondary verification patterns (optional)
6. **Verification Fields**: Cross-check with existing Paperless metadata

Rules are stored as YAML files in the `rules/` directory.

## Rule Template

See `rules/template_v2.yaml` for a complete example of the POCO v2 rule structure, including:
- Logic groups for pattern matching
- Dynamic metadata extraction with `beforeAnchor`/`afterAnchor`
- Filename pattern verification
- Paperless field cross-referencing

## User Management

- **Admin users**: Can manage other users, trigger data syncs, and access all features
- **Regular users**: Can create and manage rules, test rules against documents
- Authentication uses Paperless-ngx credentials
- Session timeout: 24 hours (configurable)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with Paperless credentials
- `POST /api/auth/logout` - Logout
- `GET /api/auth/status` - Check authentication status

### Documents
- `GET /api/documents` - List documents from Paperless-ngx
- `GET /api/documents/:id/content` - Get document OCR content

### Rules
- `GET /api/rules` - List all rules
- `GET /api/rules/:id` - Get specific rule
- `POST /api/rules` - Create new rule
- `PUT /api/rules/:id` - Update rule
- `DELETE /api/rules/:id` - Delete rule

### Testing
- `POST /api/test` - Test rule against document content
- `POST /api/execute` - Execute rule on Paperless document

See API documentation for complete endpoint reference.

## Development

### Frontend Development
```bash
cd frontend
npm run dev  # Runs on port 5000
```

### Backend Development
```bash
python api.py  # Runs on port 8000
```

### Running Tests
```bash
# Test a rule against a document
curl -X POST http://localhost:8000/api/test \
  -H "Content-Type: application/json" \
  -d '{"rule_id": "your_rule", "content": "document content"}'
```

## To-Do List

### Outstanding Tasks

No outstanding tasks at this time.

### Recently Completed ✅
- ✅ **Removed QuickTestModal feature** - Deleted unused Quick Test button and modal from Rules page. Users should use the Rule Reviewer page for testing rules against documents.
- ✅ **Removed duplicate stub test endpoint** from `api.py` (lines 1332-1353) - The working `/api/rules/test` endpoint provides all needed functionality
- ✅ **Cleaned up Dashboard filters** - Removed disabled/greyed-out filters (Storage Path, Custom Fields, Permissions) to reduce UI clutter and user confusion. Working filters remain: Title search, Tags, Correspondent, Document Type, and Dates
- ✅ **Fixed YAML "created by" field** showing "Unknown User" (now shows actual Paperless username)
- ✅ Fixed YAML formatting mismatch (backend/frontend alignment)
- ✅ Fixed YamlPreview component (POCO v2 format, quote escaping, nullish coalescing)
- ✅ Fixed TagSelector to use real Paperless tags (removed mock data)
- ✅ Fixed Logs page API call format (filters object)
- ✅ Added Known Limitations section to README

---

## Future Enhancements / Roadmap

### High Priority

Currently no high priority items.

### Medium Priority

#### Data Validation Integration
- **Status**: Validation methods exist in `metadata_processor.py` but not yet integrated into extraction flow
- **Tasks**:
  - Wire `validate_and_sanitize_value()` into dynamic metadata extraction
  - Apply validation for monetary (. separator, 2 decimal places), integer (whole numbers), float formats
  - Add validation error reporting in test results

#### Enhanced OCR Pattern Matching
- Support for more complex logic operators (NOT, XOR)
- Pattern libraries for common document types (invoices, receipts, contracts)
- Machine learning-based pattern suggestions based on document corpus

#### Rule Testing Enhancements
- Batch testing against multiple documents
- Performance metrics and analytics
- A/B testing for rule variations
- Historical accuracy tracking

### Low Priority

#### Dynamic Extraction for Additional Fields
Currently, only **Date Created** and **Custom Fields** (string, integer, float, monetary, date types) support dynamic extraction. The following built-in fields are planned for future support:

1. **Correspondent, Document Type, Tags** (Complex)
   - **Challenge**: Risk of database pollution from poor OCR creating duplicate entries
   - **Option A - Sanity Check (Recommended)**: 
     - Match extracted values against existing Paperless options only
     - Implement fuzzy matching algorithm (e.g., "Bank of Amercia" → "Bank of America")
     - Confidence threshold for matches (e.g., 80% similarity required)
     - Log rejected extractions for manual review
     - Safer approach, prevents OCR errors from creating "Sank of America", "Bank 0f America" as separate correspondents
   - **Option B - Auto-Create (Advanced)**:
     - Allow PocoClass to create new correspondents/types/tags automatically
     - Requires safeguards: confidence scoring, duplicate detection, similarity checking
     - Manual review queue for low-confidence extractions
     - Higher automation but riskier with poor OCR quality

2. **Title** (Medium Complexity)
   - Extract document titles from OCR content
   - Useful for standardizing document naming conventions
   - Example: Extract "Invoice #12345" from invoice header

3. **Archive Serial Number** (Low Complexity)
   - Extract archive serial numbers from document content
   - Pattern-based extraction with regex support
   - Validation against expected format (e.g., ASN-2024-001)

4. **Storage Path** (Low Complexity)
   - Dynamic assignment of storage paths based on document content
   - Requires mapping extracted values to existing storage path options

#### UI/UX Improvements
- Dark mode support
- Rule templates library with pre-built rules for common documents
- Visual pattern builder (drag-and-drop interface)
- Rule performance dashboard with charts and statistics

#### Advanced Features
- Multi-language OCR support with language detection
- Integration with external OCR engines (Tesseract, Google Vision API)
- Webhook support for real-time document processing
- Bulk rule execution with progress tracking
- Export/import rules between PocoClass instances

#### Performance Optimizations
- Rule execution caching for identical documents
- Parallel rule processing for batch operations
- Database query optimization for large document sets
- Frontend code splitting for faster initial load

### Technical Debt
- Migrate from SQLite to PostgreSQL for production deployments
- Add comprehensive unit and integration tests
- API documentation with OpenAPI/Swagger
- Implement proper logging levels and rotation
- Add database migration system (e.g., Alembic)

---

**Note**: This roadmap is subject to change based on user feedback and priorities. Contributions addressing these items are welcome!

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

See `LICENSE` file for details.

## Acknowledgments

PocoClass builds upon the POCO (Post-Consumption Classification) scoring methodology developed for automated document classification in Paperless-ngx environments.
