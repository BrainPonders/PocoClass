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
   git clone https://github.com/BrainPonders/PocoClass.git
   cd PocoClass
   ```

2. **Set up environment variables**
   ```bash
   # Paperless-ngx connection (required)
   export PAPERLESS_URL="https://your-paperless-instance.com"
   export PAPERLESS_TOKEN="your-api-token-here"
   
   # Database connection (auto-configured on Replit)
   export DATABASE_URL="postgresql://..."
   ```

3. **Install backend dependencies**
   ```bash
   pip install flask flask-cors pyyaml requests tabulate
   ```

4. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

5. **Build frontend**
   ```bash
   npm run build
   cd ..
   ```

6. **Run the application**
   ```bash
   ./start.sh
   ```

The application will be available at `http://localhost:5000`

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

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

See `LICENSE` file for details.

## Acknowledgments

PocoClass builds upon the POCO (Post-Consumption Classification) scoring methodology developed for automated document classification in Paperless-ngx environments.
