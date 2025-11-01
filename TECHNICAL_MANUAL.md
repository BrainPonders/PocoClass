# PocoClass Technical Manual
**Version:** 2.0  
**Last Updated:** 2025-11-01  
**Purpose:** Internal reference for developers and maintainers

---

## Table of Contents
1. [Overview](#overview)
2. [POCO Scoring System v2](#poco-scoring-system-v2)
3. [Document Processing Workflow](#document-processing-workflow)
4. [Tagging System](#tagging-system)
5. [Custom Fields Architecture](#custom-fields-architecture)
6. [Background Processing Engine](#background-processing-engine)
7. [Document Notes Mechanism](#document-notes-mechanism)
8. [Database Schema](#database-schema)
9. [API Architecture](#api-architecture)

---

## Overview

PocoClass is an automated document classification system for Paperless-ngx that uses a dual-score evaluation mechanism to classify documents based on OCR content, filename patterns, and existing Paperless metadata.

### Core Philosophy
- **OCR as Source of Truth**: Pattern matching against OCR content is the primary classification mechanism
- **Always Score, Always Tag**: Every processed document receives a score and a tag (POCO+ or POCO-), even if score is 0%
- **No Gaps**: Once processed, documents are permanently marked to prevent re-processing loops

---

## POCO Scoring System v2

### Dual-Score Evaluation

PocoClass calculates TWO scores for every document:

#### 1. POCO OCR Score (Transparency Score)
**Purpose**: Shows how well OCR content matched the rule patterns  
**Formula**: `(OCR_matched / OCR_total) × 100`  
**Range**: 0-100%  
**Default Threshold**: 75%

**Calculation**:
```python
ocr_weighted = ocr_matches × 3.0  # 3x multiplier (trust factor)
ocr_max_weight = ocr_total × 3.0
poco_ocr_score = (ocr_weighted / ocr_max_weight) × 100
```

**Usage**: 
- ALWAYS calculated for every rule evaluation
- ALWAYS written to document notes
- OPTIONALLY written to Paperless custom field (user configurable)

#### 2. POCO Score (Actionable Score)
**Purpose**: Final classification score combining OCR, filename, and Paperless verification  
**Formula**: `(OCR_weighted + Filename_weighted + Paperless_weighted) / Total_max_weight × 100`  
**Range**: 0-100%  
**Default Threshold**: 80% (configurable per rule via `threshold` field)

**Calculation**:
```python
# OCR Component (3x multiplier)
ocr_weighted = ocr_matches × 3.0
ocr_max_weight = ocr_total × 3.0

# Filename Component (1x multiplier)
filename_weighted = filename_matches × 1.0
filename_max_weight = filename_total × 1.0

# Paperless Component (neutralized to prevent inflation)
paperless_multiplier = 1.0 / paperless_total  # Auto-calculated
paperless_weighted = paperless_matches × paperless_multiplier
paperless_max_weight = 1.0  # Always 1.0 due to neutralization

# Final Score
total_weighted = ocr_weighted + filename_weighted + paperless_weighted
total_max_weight = ocr_max_weight + filename_max_weight + paperless_max_weight
poco_score = (total_weighted / total_max_weight) × 100
```

**Usage**:
- Determines POCO+ vs POCO- tag assignment
- ALWAYS written to document notes
- ALWAYS written to Paperless custom field "POCO Score" (mandatory)

### Classification Decision

A document is classified (POCO+) if **BOTH** thresholds are met:
```python
if poco_ocr_score >= ocr_threshold AND poco_score >= threshold:
    # Classified - apply metadata, assign POCO+ tag
else:
    # Not classified - assign POCO- tag, no metadata changes
```

**Key Points**:
- OCR threshold acts as a "gate" - if OCR patterns don't match well enough, classification fails immediately
- POCO threshold determines final classification after considering all data sources
- Thresholds are **per-rule** (not global)

---

## Document Processing Workflow

### Complete Processing Flow

```
1. Document Discovery
   ↓
2. Fetch Document Content (OCR)
   ↓
3. Test Against All Active Rules
   ↓
4. Select Best Match (highest POCO Score)
   ↓
5. Calculate Scores (POCO Score + POCO OCR)
   ↓
6. Determine Classification (compare to thresholds)
   ↓
7. Apply Metadata (if classified)
   ↓
8. Write Scores to Custom Fields
   ↓
9. Add POCO Tag (+ or -)
   ↓
10. Write Scoring Table to Notes
    ↓
11. Log Result
```

### Step-by-Step Details

#### 1. Document Discovery
**Location**: `background_processor.py::_discover_documents()`

Documents are discovered using tag-based filtering:
```python
# Include: Documents with NEW tag
# Exclude: Documents with POCO+ or POCO- tags
tags = [new_tag_id]
exclude_tags = [poco_plus_tag_id, poco_minus_tag_id]
```

**Result**: Only unprocessed documents are discovered (prevents infinite loops)

#### 2. Fetch Document Content
**Location**: `api_client.py::get_document_content()`

Fetches OCR text from Paperless-ngx:
```
GET /api/documents/{doc_id}/
→ Extract doc['content'] field
```

#### 3-4. Rule Testing
**Location**: `background_processor.py::_process_single_document()`

Tests document against ALL active rules:
```python
best_result = None
best_score = 0

for rule in active_rules:
    result = test_engine.test_rule(rule, doc_id, content, filename, doc)
    poco_score = result.get('poco_score', 0)
    
    if poco_score > best_score:
        best_score = poco_score
        best_result = result
        best_rule = rule
```

**Result**: Best matching rule is selected (or None if no matches)

#### 5. Score Calculation
Performed by `scoring_calculator_v2.py::POCOScoringV2`

Even if no rules match, scores are calculated (will be 0):
```python
poco_score = best_score if best_result else 0
poco_ocr = best_result.get('poco_ocr', 0) if best_result else 0
```

#### 6. Classification Decision
```python
threshold = best_rule.get('threshold', 75) if best_rule else 75
classified = (
    best_result and 
    best_result.get('match', False) and 
    best_score >= threshold
)
```

#### 7. Apply Metadata
**Location**: `background_processor.py::_build_metadata_updates()`

If classified, extract and apply:
- Title
- Created date
- Correspondent
- Document type
- Tags
- Custom fields

#### 8. Write Scores to Custom Fields
**Location**: `background_processor.py::_add_poco_scores()`

```python
# POCO Score field (MANDATORY)
custom_fields.append({
    'field': poco_score_field_id,
    'value': str(round(poco_score, 1))
})

# POCO OCR field (OPTIONAL - only if field exists)
if poco_ocr_field_id:
    custom_fields.append({
        'field': poco_ocr_field_id,
        'value': str(round(poco_ocr, 1))
    })
```

**Result**: Scores visible in Paperless UI

#### 9. Add POCO Tag
**Location**: `background_processor.py::_add_poco_tag()`

```python
tag_name = 'POCO+' if classified else 'POCO-'
# Add tag to document
```

**Tags**:
- **POCO+** (Green #10b981): Document matched rule, metadata applied
- **POCO-** (Red #ef4444): Document processed but no match found

#### 10. Write Scoring Table to Notes
**Location**: `background_processor.py::_add_scoring_note()`

Creates detailed scoring table in Paperless document notes:
```
=== PocoClass Scoring Report ===
Processed: 2025-11-01 14:30:45
Rule: Invoice_Processor_v2
Result: ✓ CLASSIFIED

--- Score Breakdown ---
POCO Score: 85.3% (Minimum 80.0%)
POCO OCR: 92.1% (Minimum 75.0%, Multiplier: 3.0x)

Metric          Matched  Total  Weighted  Max Weight  Multiplier
OCR Patterns    12       13     36.0      39.0        3.0x
Filename        2        2      2.0       2.0         1.0x
Paperless       3        4      0.75      1.0         0.25x
```

**Key Points**:
- ALWAYS written (even for POCO- documents)
- Old PocoClass notes are deleted before writing new one
- Includes timestamp, rule name, all scores, and detailed breakdown

#### 11. Log Result
**Location**: `database.py::add_log()`

Stores processing result in SQLite logs table for audit trail.

---

## Tagging System

### Tag Architecture

PocoClass uses a **tri-tag system**:

#### 1. NEW Tag
- **Color**: Blue (#3b82f6)
- **Purpose**: Marks documents for processing
- **Assignment**: Manual (user adds via Paperless UI or consumption template)
- **Removal**: Never removed by PocoClass

#### 2. POCO+ Tag
- **Color**: Green (#10b981)
- **Purpose**: Document matched a rule and was classified
- **Assignment**: Automatic (background processor)
- **Criteria**: `poco_score >= rule.threshold AND poco_ocr_score >= rule.ocr_threshold`

#### 3. POCO- Tag
- **Color**: Red (#ef4444)
- **Purpose**: Document processed but no rule matched
- **Assignment**: Automatic (background processor)
- **Criteria**: Processed but did not meet classification thresholds

### Tag Lifecycle

```
1. User adds document to Paperless
   ↓
2. User/system adds NEW tag
   ↓
3. Background processor discovers document (has NEW, no POCO+/-)
   ↓
4. Document processed against all rules
   ↓
5a. Match found → Add POCO+ tag
5b. No match → Add POCO- tag
   ↓
6. NEW tag remains (for user reference)
```

**Important**: 
- NEW tag is NEVER removed (indicates "processed at least once")
- POCO+/POCO- tags prevent re-processing
- A document can only have ONE POCO tag (+ or -)

### Discovery Logic

```python
def _discover_documents():
    # Include documents with NEW tag
    tags = [new_tag_id]
    
    # Exclude documents already processed (have POCO+ or POCO-)
    exclude_tags = [poco_plus_tag_id, poco_minus_tag_id]
    
    # Result: Only unprocessed documents
```

This ensures:
- No infinite processing loops
- Once tagged with POCO+/-, document is never re-processed
- Clear separation between "new" and "processed" states

---

## Custom Fields Architecture

### POCO Score Field (MANDATORY)

**Name**: `POCO Score`  
**Type**: String  
**Purpose**: Stores final actionable score  
**Range**: "0.0" to "100.0"  
**Required**: Yes (system fails validation without it)

**Creation**: 
- Auto-created during sync via `sync_service.py::_ensure_mandatory_data()`
- Can be manually created via Settings > Data Validation > Fix Missing Data

**Usage**:
- ALWAYS written by background processor
- Displayed in Dashboard and RuleReviewer document lists
- Used for filtering and sorting (via API extraction)

### POCO OCR Field (OPTIONAL)

**Name**: `POCO OCR`  
**Type**: String  
**Purpose**: Stores OCR transparency score for advanced users  
**Range**: "0.0" to "100.0"  
**Required**: No (controlled by `poco_ocr_enabled` config)

**Configuration**:
- Toggle: Settings > Optional Features > "POCO OCR Transparency Score Field"
- Default: Disabled (false)
- Admin-only setting

**Behavior When Disabled**:
- POCO OCR score is STILL calculated
- POCO OCR score is STILL written to document notes
- POCO OCR field is NOT created in Paperless
- Background processor does NOT write to custom field (field doesn't exist)

**Behavior When Enabled**:
- POCO OCR field is created during next sync
- Background processor writes POCO OCR to custom field
- Score visible in Paperless UI alongside POCO Score

**Rationale for Optional**:
- Most users only need final POCO Score
- OCR score is always in notes for reference
- Reduces Paperless custom field clutter
- Advanced users can enable for additional visibility

### Custom Field Creation Flow

```python
# sync_service.py::_ensure_mandatory_data()

# Check setting
poco_ocr_enabled = db.get_config('poco_ocr_enabled') == 'true'

# POCO Score (always required)
required_fields = [{'name': 'POCO Score', 'data_type': 'string'}]

# POCO OCR (conditional)
if poco_ocr_enabled:
    required_fields.append({'name': 'POCO OCR', 'data_type': 'string'})

# Create missing fields
for field in required_fields:
    if not api_client.get_custom_field_id(field['name']):
        api_client.create_custom_field(field['name'], field['data_type'])
```

---

## Background Processing Engine

### Architecture Overview

**Location**: `background_processor.py`  
**Pattern**: Module-level singleton  
**Initialization**: On API startup via `api.py`

### Key Components

#### 1. Debounced Triggering
```python
trigger_processing() → _debounced_trigger() → process_batch()
```

**Debounce Settings**:
- Default: 30 seconds
- Configurable: `bg_debounce_seconds` config
- Cancels previous trigger if new one arrives

**Purpose**: Prevents rapid-fire processing when multiple documents added

#### 2. Auto-Pause with Web UI
```python
if self._is_session_active():
    logger.info("Web UI active - auto-pausing background processing")
    return
```

**Purpose**: Prevents unwanted processing while users are testing/viewing

#### 3. Processing Lock
```python
if db.get_processing_lock():
    return {'status': 'locked', 'message': 'Processing already running'}

db.set_processing_lock(True)
try:
    # Process documents
finally:
    db.set_processing_lock(False)
```

**Purpose**: Prevents concurrent processing runs

#### 4. Needs Rerun Flag
```python
if documents_arrive_during_processing:
    db.set_needs_rerun(True)

if db.get_needs_rerun():
    db.set_needs_rerun(False)
    trigger_processing()  # Start new cycle
```

**Purpose**: Ensures documents arriving during processing are caught in next cycle

### Processing Modes

#### Automatic (Debounced)
- Triggered by: NEW tag addition in Paperless
- Trigger endpoint: `POST /api/background/trigger`
- Respects: Auto-pause, debounce, processing lock

#### Manual
- Triggered by: User via Background Process page
- Endpoint: `POST /api/background/process`
- Bypasses: Auto-pause (user override)
- Respects: Processing lock

### Processing History Tracking

**Table**: `processing_history`  
**Fields**:
- `started_at`: Processing start time
- `completed_at`: Processing end time
- `status`: success | failed | cancelled
- `trigger_type`: auto | manual | scheduled
- `documents_processed`: Count
- `documents_classified`: Count
- `rules_applied`: Count
- `error_message`: If failed

**Purpose**: Audit trail, performance monitoring, debugging

---

## Document Notes Mechanism

### Purpose
Document notes provide a detailed, human-readable scoring report that is:
- Always present (even for non-matches)
- Permanent (until next processing)
- Visible in Paperless UI
- Independent of custom fields

### Note Structure

```
=== PocoClass Scoring Report ===
Processed: 2025-11-01 14:30:45 UTC
Rule: Invoice_Processor_v2
Result: ✓ CLASSIFIED

--- Score Breakdown ---
POCO Score: 85.3% (Minimum 80.0%)
POCO OCR: 92.1% (Minimum 75.0%, Multiplier: 3.0x)

Metric           Matched  Total  Weighted  Max Weight  Multiplier
OCR Patterns     12       13     36.0      39.0        3.0x
Filename         2        2      2.0       2.0         1.0x
Paperless        3        4      0.75      1.0         0.25x

Total Weighted:  38.75
Total Max:       42.0
Final Score:     85.3%

Status: ✓ CLASSIFIED (Threshold: 80.0%)
```

### Note Management

#### Creation
```python
# background_processor.py::_add_scoring_note()

# 1. Delete old PocoClass notes
for note in existing_notes:
    if 'PocoClass Scoring Report' in note['note']:
        delete_note(note['id'])

# 2. Create new note
requests.post(
    f'{paperless_url}/api/documents/{doc_id}/notes/',
    json={'note': scoring_table, 'document': doc_id}
)
```

**Key Points**:
- Old notes are deleted to prevent clutter
- Each processing creates ONE note
- Notes are permanent until next processing

#### Note Content

**For Classified Documents (POCO+)**:
- Shows which rule matched
- Displays both scores with thresholds
- Includes detailed breakdown table
- Status: ✓ CLASSIFIED

**For Non-Matches (POCO-)**:
```
=== PocoClass Scoring Report ===
Processed: 2025-11-01 14:30:45 UTC
Rule: Best_Match_Rule_Name (or "None" if no rules tested)
Result: ✗ NO MATCH

--- Score Breakdown ---
POCO Score: 42.3% (Minimum 80.0%)
POCO OCR: 58.1% (Minimum 75.0%, Multiplier: 3.0x)

[Same table structure]

Status: ✗ NO MATCH (Threshold: 80.0%)
```

**Purpose of Notes for POCO-**:
- Shows why document didn't match (scores too low)
- Helps identify rule problems (close but not quite)
- Provides audit trail for manual review
- Score of 0% = absolutely no pattern matches
- Score > 0% but < threshold = possible faulty rule

---

## Database Schema

### Core Tables

#### config
```sql
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT
)
```

**Key Settings**:
- `setup_completed`: boolean (true/false)
- `paperless_url`: string
- `poco_ocr_enabled`: boolean (true/false) - Controls POCO OCR custom field
- `bg_enabled`: boolean (true/false) - Background processing enabled
- `bg_debounce_seconds`: integer (default 30)
- `bg_tag_new`: string (default "NEW")
- `bg_tag_poco`: string (default "POCO")
- `bg_processing_lock`: boolean (true/false) - Processing lock flag
- `bg_needs_rerun`: boolean (true/false) - Rerun needed flag

#### users
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paperless_username TEXT UNIQUE,
    paperless_user_id INTEGER,
    role TEXT DEFAULT 'user',
    is_enabled INTEGER DEFAULT 1,
    encrypted_token BLOB,
    created_at TEXT,
    last_login TEXT
)
```

**Roles**: `admin` | `user`  
**Token Encryption**: Fernet (AES-128) using `POCOCLASS_SECRET_KEY`

#### sessions
```sql
CREATE TABLE sessions (
    session_token TEXT PRIMARY KEY,
    user_id INTEGER,
    paperless_token TEXT,
    created_at TEXT,
    expires_at TEXT,
    last_activity TEXT
)
```

**Timeout**: 24 hours (configurable via `session_timeout_hours`)

#### logs
```sql
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    type TEXT,
    level TEXT,
    message TEXT,
    rule_name TEXT,
    rule_id TEXT,
    document_id INTEGER,
    document_name TEXT,
    poco_score REAL,
    poco_ocr REAL,
    source TEXT
)

CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX idx_logs_type ON logs(type);
CREATE INDEX idx_logs_level ON logs(level);
```

**Types**: classification | processing | system | error  
**Levels**: debug | info | warning | error

#### processing_history
```sql
CREATE TABLE processing_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT,
    completed_at TEXT,
    status TEXT,
    trigger_type TEXT,
    documents_processed INTEGER DEFAULT 0,
    documents_classified INTEGER DEFAULT 0,
    rules_applied INTEGER DEFAULT 0,
    error_message TEXT
)

CREATE INDEX idx_processing_history_started ON processing_history(started_at DESC);
CREATE INDEX idx_processing_history_status ON processing_history(status);
```

### Cached Data Tables

#### paperless_correspondents
```sql
CREATE TABLE paperless_correspondents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paperless_id INTEGER UNIQUE,
    name TEXT,
    last_sync TEXT
)
```

#### paperless_document_types
```sql
CREATE TABLE paperless_document_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paperless_id INTEGER UNIQUE,
    name TEXT,
    last_sync TEXT
)
```

#### paperless_tags
```sql
CREATE TABLE paperless_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paperless_id INTEGER UNIQUE,
    name TEXT,
    color TEXT,
    last_sync TEXT
)
```

#### paperless_custom_fields
```sql
CREATE TABLE paperless_custom_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paperless_id INTEGER UNIQUE,
    name TEXT,
    data_type TEXT,
    extra_data TEXT,
    last_sync TEXT
)
```

**Note**: `extra_data` stores JSON for select field options

#### paperless_users
```sql
CREATE TABLE paperless_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paperless_id INTEGER UNIQUE,
    username TEXT,
    last_sync TEXT
)
```

**Purpose**: Username lookup for document owner display

---

## API Architecture

### Authentication

**Method**: Session-based with encrypted Paperless tokens  
**Storage**: SQLite sessions table  
**Encryption**: Fernet (AES-128)  
**Timeout**: 24 hours (configurable)

#### Decorators
```python
@require_auth       # Any authenticated user
@require_admin      # Admin users only
```

### Key Endpoints

#### Authentication
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/status
```

#### Documents
```
GET  /api/documents
  Parameters:
    - limit: int
    - title: string
    - tags: comma-separated IDs
    - tags_mode: include|exclude
    - exclude_tags: comma-separated IDs
    - correspondents: comma-separated IDs
    - correspondents_mode: include|exclude
    - doc_types: comma-separated IDs
    - doc_types_mode: include|exclude
    - date_from: ISO date
    - date_to: ISO date
  
  Response:
    [{
      id: int,
      title: string,
      created: ISO date,
      added: ISO date,
      correspondent: string,
      documentType: string,
      tags: [string],
      owner: string,
      originalFileName: string,
      pdfUrl: string,
      downloadUrl: string,
      content: string,
      pocoScore: float | null  // POCO Score from custom fields
    }]
```

#### Rules
```
GET    /api/rules
GET    /api/rules/:id
POST   /api/rules
PUT    /api/rules/:id
DELETE /api/rules/:id
POST   /api/rules/test       # Test rule against content
POST   /api/rules/execute    # Execute rule on document
```

#### Validation
```
GET  /api/validation/mandatory-data
  Response:
    {
      valid: boolean,
      missing_fields: [string],
      missing_tags: [string],
      poco_ocr_enabled: boolean,
      fields: {
        poco_score: boolean,
        poco_ocr: boolean
      },
      tags: {
        poco_plus: boolean,
        poco_minus: boolean,
        new: boolean
      }
    }

POST /api/validation/fix-mandatory-data (admin only)
  Creates missing fields/tags based on poco_ocr_enabled setting
```

#### Settings
```
GET /api/settings/poco-ocr-enabled
  Response: { enabled: boolean }

PUT /api/settings/poco-ocr-enabled (admin only)
  Body: { enabled: boolean }
  Response: {
    success: boolean,
    enabled: boolean,
    field_exists?: boolean,
    message?: string
  }
```

#### Background Processing
```
POST /api/background/trigger
  Triggers debounced processing (respects auto-pause)

POST /api/background/process
  Body: {
    dry_run?: boolean,
    filters?: {
      tags?: [string],
      exclude_tags?: [string],
      date_from?: ISO date,
      date_to?: ISO date,
      limit?: int
    }
  }
  
  Manual processing (bypasses auto-pause)

GET /api/background/status
  Response: {
    is_running: boolean,
    processing_lock: boolean,
    needs_rerun: boolean,
    last_run?: ISO datetime
  }

GET /api/background/history?limit=10
  Response: [processing_history records]

POST /api/background/settings (admin only)
  Body: {
    enabled?: boolean,
    debounce_seconds?: int,
    tag_new?: string,
    tag_poco?: string
  }
```

#### Sync
```
POST /api/sync (admin only)
  Manual sync of Paperless data

GET /api/sync/status
  Response: {
    correspondents: { last_sync: ISO datetime, count: int },
    tags: { ... },
    document_types: { ... },
    custom_fields: { ... },
    users: { ... }
  }

GET /api/sync/history?limit=10 (admin only)
  Response: [{ timestamp, operation, counts, errors }]
```

### API Client (Paperless Communication)

**Location**: `api_client.py::PaperlessAPIClient`

**Features**:
- Cache-first lookups for correspondents, tags, doc types
- 30-second timeouts for all requests (10s for auth)
- Automatic token management
- Pagination handling

**Key Methods**:
```python
get_documents(filters) → [dict]
get_document_content(doc_id) → str
get_custom_field_id(name) → int | None
get_tag_id(name) → int | None
create_custom_field(name, type) → bool
create_tag(name, color, is_inbox) → bool
update_document(doc_id, updates) → bool
```

---

## Error Handling

### Validation Guards

#### Mandatory Data Check
```python
# Before processing
if not poco_score_exists or (poco_ocr_enabled and not poco_ocr_exists):
    return {'error': 'Missing required custom fields'}

if not (poco_plus_exists and poco_minus_exists and new_tag_exists):
    return {'error': 'Missing required tags'}
```

#### Global Warning Banner
- Displayed when mandatory data missing
- Auto-navigates to Settings > Data Validation
- Blocks background processing until fixed

### Processing Error Handling

```python
try:
    result = process_document(doc_id)
except Exception as e:
    logger.error(f"Processing failed for {doc_id}: {e}")
    db.add_log(
        type='error',
        level='error',
        message=f"Processing error: {e}",
        document_id=doc_id
    )
    # Continue with next document (don't fail entire batch)
```

---

## Configuration Reference

### Environment Variables

**Required**:
- `POCOCLASS_SECRET_KEY`: Encryption key for API tokens (32 bytes, base64)
  - Generate: `python generate_secret_key.py`
  - Must be set in production
  - Validated on startup (fail-fast)

**Optional**:
- `DATABASE_URL`: PostgreSQL connection string (Replit only)
- `PAPERLESS_URL`: Default Paperless URL (can be set via UI)
- `PAPERLESS_TOKEN`: Default Paperless token (can be set via UI)

### Database Configuration Keys

**System**:
- `setup_completed`: "true" | "false"
- `paperless_url`: Full URL including protocol
- `session_timeout_hours`: Default "24"

**Optional Features**:
- `poco_ocr_enabled`: "true" | "false" (default: "false")

**Background Processing**:
- `bg_enabled`: "true" | "false" (default: "false")
- `bg_debounce_seconds`: "30" (default)
- `bg_tag_new`: "NEW" (default)
- `bg_tag_poco`: "POCO" (legacy, not used in v2)
- `bg_processing_lock`: "true" | "false" (runtime state)
- `bg_needs_rerun`: "true" | "false" (runtime state)

---

## Troubleshooting

### Document Not Processing

**Symptoms**: Document has NEW tag but not being discovered

**Check**:
1. Does document already have POCO+ or POCO- tag? (prevents re-processing)
2. Is background processing enabled? (Settings > Background Processing)
3. Is background processing paused? (auto-pauses when Web UI active)
4. Check processing lock: `SELECT value FROM config WHERE key='bg_processing_lock'`

**Solution**:
- Remove POCO+/POCO- tags to allow re-processing
- Trigger manual processing from Background Process page
- Check logs: `GET /api/logs?type=processing&level=error`

### Scores Not Appearing

**Symptoms**: Document processed but POCO Score missing

**Check**:
1. Validation status: `GET /api/validation/mandatory-data`
2. Custom field exists: Check Paperless UI > Settings > Custom Fields
3. Check logs: Search for "Failed to add POCO scores"

**Solution**:
- Settings > Data Validation > Fix Missing Data
- Manually create "POCO Score" field in Paperless
- Re-process document

### POCO OCR Field Issues

**Symptoms**: POCO OCR not appearing in Paperless

**Check**:
1. Is POCO OCR enabled? Settings > Optional Features
2. Check config: `SELECT value FROM config WHERE key='poco_ocr_enabled'`
3. Does field exist in Paperless?

**Remember**:
- POCO OCR is ALWAYS in document notes (regardless of field)
- Field is optional - only for visibility in Paperless UI
- Enable via Settings > Optional Features

### Processing Loops

**Symptoms**: Document being processed repeatedly

**Check**:
1. Is POCO tag being applied? Check document tags
2. Are tags in exclude list? Check `_discover_documents()` logic
3. Check processing history: `GET /api/background/history?limit=20`

**Solution**:
- Ensure POCO+/POCO- tags are being written
- Check tag IDs match cached IDs (sync may be needed)
- Review processing logs for errors

---

## Performance Considerations

### Caching Strategy

**Correspondents, Tags, Doc Types**:
- Cached in SQLite on sync
- Cache-first lookups (no API call if in cache)
- Sync frequency: Manual or on-demand

**Custom Field IDs**:
- Looked up once per processing batch
- Stored in memory for duration of batch
- Re-fetched on API restart

### API Timeouts

**Standard**: 30 seconds  
**Auth**: 10 seconds  
**Rationale**: Prevents indefinite hangs, fast-fail on network issues

### Background Processing

**Debounce**: 30 seconds (reduces rapid-fire triggers)  
**Batch Size**: Configurable via limit parameter  
**Concurrency**: Single-threaded (processing lock prevents parallel runs)

### Database Indexes

**Optimized Queries**:
```sql
-- Logs
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX idx_logs_type ON logs(type);
CREATE INDEX idx_logs_level ON logs(level);

-- Processing History
CREATE INDEX idx_processing_history_started ON processing_history(started_at DESC);
CREATE INDEX idx_processing_history_status ON processing_history(status);
```

---

## Security

### Token Encryption

**Method**: Fernet (AES-128)  
**Key Source**: `POCOCLASS_SECRET_KEY` environment variable  
**Storage**: Encrypted tokens in `users.encrypted_token` (BLOB)

**Encryption Flow**:
```python
from cryptography.fernet import Fernet

# On login
cipher = Fernet(POCOCLASS_SECRET_KEY)
encrypted_token = cipher.encrypt(paperless_token.encode())
db.store_encrypted_token(user_id, encrypted_token)

# On API call
encrypted_token = db.get_encrypted_token(user_id)
paperless_token = cipher.decrypt(encrypted_token).decode()
```

### Session Management

**Token**: Random 32-char hex string  
**Storage**: SQLite sessions table  
**Cleanup**: Expired sessions automatically excluded from queries  
**Timeout**: Configurable (default 24h)

### SQL Injection Protection

**Logs Endpoint**: Whitelisted ORDER BY fields
```python
ALLOWED_SORT_FIELDS = ['timestamp', 'type', 'level']
if order_by not in ALLOWED_SORT_FIELDS:
    order_by = 'timestamp'  # Safe default
```

**General**: Parameterized queries throughout

---

## Deployment

### Docker Installation

See `README.md` for Docker setup instructions.

### Bare Metal Installation

1. Generate encryption key: `python generate_secret_key.py`
2. Set environment variable: `export POCOCLASS_SECRET_KEY="..."`
3. Install dependencies: `pip install -r requirements.txt`
4. Build frontend: `cd frontend && npm install && npm run build`
5. Run: `./start.sh`

### Replit Deployment

1. Set secret `POCOCLASS_SECRET_KEY` in Secrets tab
2. Database automatically provisioned (PostgreSQL via DATABASE_URL)
3. Workflow auto-runs on fork

---

## Version History

### v2.0 (2025-11-01)
- Dual-score system (POCO Score + POCO OCR)
- Mandatory tagging (POCO+/POCO-)
- Background processing with tag-based discovery
- Optional POCO OCR custom field
- Comprehensive document notes
- Validation system with auto-remediation

### v1.x (Legacy)
- Single score system
- Manual processing only
- Optional tagging
- Basic notes

---

## Glossary

**POCO**: Post-Consumption Classification  
**POCO Score**: Final actionable score (OCR + filename + Paperless)  
**POCO OCR**: Transparency score (OCR pattern matching only)  
**POCO+**: Tag indicating document matched a rule  
**POCO-**: Tag indicating document processed but no match  
**NEW**: Tag indicating document ready for processing  
**Classified**: Document that met both POCO and OCR thresholds  
**Processed**: Document that was evaluated (may or may not be classified)  
**Threshold**: Minimum score required for classification (per-rule)  
**Multiplier**: Trust factor applied to matching components  
**Debounce**: Delay before processing to batch multiple triggers

---

**End of Technical Manual**
