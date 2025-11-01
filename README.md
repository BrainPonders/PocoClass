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

---

### Recently Completed ✅
- ✅ **Enhanced Rule Activation Controls & UI Refinements** (2025-11-01):
  - **Individual Rule Activation Icons**: Each rule row now displays Power/PowerOff icon for quick activate/deactivate without selection. Green icon when active, gray when inactive. Activation requires confirmation warning about automatic document processing.
  - **Rules Page Warning Banner**: Added soft yellow warning banner at top of Rules page explaining rule activation implications and power icon functionality.
  - **Trigger Now Clarification**: Moved Trigger Now button to top-right header only on Background Process page with subtitle explaining it auto-discovers documents tagged "NEW". Removed from manual processing section to eliminate confusion. Added blue info banner explaining it's separate from filtered manual testing.
  - **Filter Bar Enhancements**: 
    - Reset button now always visible (greyed out when at default settings)
    - Date range display separated from Dates Added filter button
    - Shows "Last 7 days" text when default range is active instead of actual dates
    - Fixed hasActiveFilters() logic to ignore default 7-day range, ensuring Reset button is properly disabled at baseline
  - **Consistent Color Theme**: Standardized banner colors across all pages:
    - Soft Blue (bg-blue-50, border-blue-200) for general information and descriptions
    - Soft Yellow (bg-yellow-50, border-yellow-200) for warnings and caution messages
    - Soft Red (bg-red-50, border-red-200) for errors
  - **Manual Processing Layout**: Changed from 3-button to 2-button grid (Dry Run + Run) for clearer testing workflow

- ✅ **Comprehensive Background Process Safety Improvements** (2025-11-01):
  - **Date Filter Enhancement**: Renamed "Dates" to "Dates Added" with visible date range display. Backend filters on document added date (not created date) for accurate new document discovery.
  - **Smart Default Filters**: Background Process page defaults to NEW tag and last 7 days for safe, focused testing. Reset button restores these defaults.
  - **Redesigned Action Buttons**: Three independent buttons replace confusing toggle:
    - **Dry Run** (Blue): Test all rules without changes
    - **Run** (Orange): Apply active rules with mandatory warning confirmation
    - **Trigger Now** (Green): Auto-discover NEW documents with clear subtitle
  - **Rule Activation Warning**: Activating a rule now requires confirmation dialog warning about automatic document processing. Active rules display persistent warning banner.
  - **Settings Clarification**: Added blue info box explaining background processing automatically pauses while any user is logged in to prevent unwanted modifications during testing.
  - **Document List Display**: Real-time preview of matching documents updates as filters change, preventing accidental bulk processing.

- ✅ **Fixed rule deletion** - Deletion now works correctly by removing broken `DeletedRule.create()` call. Backend handles moving rules to deleted folder.
- ✅ **Protected Template Rule v2** - Cannot be deleted (shows error message). Bulk delete automatically skips protected rules with warning notification.
- ✅ **Status workflow redesign** - Replaced "draft" status with "new" and implemented proper lifecycle:
  - New rules start with "new" status
  - User manually changes to "active" or "inactive" via dropdown in Step 6 (Summary)
  - Once activated → can only toggle between "active" and "inactive"
  - **Edit detection**: When editing an active/inactive rule, status automatically reverts to "new" (requires re-activation)
  - Duplicated rules start with "new" status
  - Updated all filters, warnings, and bulk actions to use "new" instead of "draft"
- ✅ **Fixed rule loading issue** - Made `core_identifiers` field optional in rule loader. Rules without OCR patterns (empty configuration) now load successfully instead of failing validation. Now 3 rules load instead of just 1.
- ✅ **Keyboard navigation for dropdowns** - Added full keyboard support to Correspondent, Document Type, and Tags dropdowns in the rule editor:
  - Arrow Up/Down to navigate options
  - Enter to select highlighted option
  - Escape to close dropdown
  - Home/End to jump to first/last option
  - Blue highlight for visual feedback
  - Includes zero-options guard to prevent navigation errors and accidental form submission
- ✅ **Fixed custom fields not loading/saving** - Custom fields now properly save to and load from YAML. Previously only "Document Category" was supported; now ALL custom fields are handled. All user values are properly escaped to prevent YAML syntax errors with special characters.
- ✅ **Fixed tag extraction not saving** - Tag extraction rules (dynamic metadata) now properly save to YAML with pattern, value, and optional prefix fields. All values are escaped for safety.
- ✅ **Fixed dynamic extraction rules not loading** - Added missing conversion code in `convert_backend_to_frontend()` to properly load dynamic metadata extraction rules (date extraction and tag extraction) from YAML files when opening existing rules in the rule editor.
- ✅ **Fixed YAML regex pattern escaping bug** - Changed YAML generation to use single-quoted strings for patterns, which preserve backslashes literally. Added validation to catch YAML syntax errors before saving rules. This prevents "unknown escape character" errors that were preventing rules from loading.
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
