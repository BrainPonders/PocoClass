# PocoClass Administrator Guide

This guide is intended for administrators who need to install, configure, and maintain PocoClass. For user-focused documentation, refer to the in-app Guide and Quick Start accessible from the navigation menu.

## Table of Contents
1. [What is PocoClass?](#what-is-pococlass)
2. [Installation](#installation)
3. [Initial Setup](#initial-setup)
4. [Understanding Paperless-ngx](#understanding-paperless-ngx)
5. [How PocoClass Syncs with Paperless](#how-pococlass-syncs-with-paperless)
6. [Building Rules: The 6-Step Wizard](#building-rules-the-6-step-wizard)
7. [Testing Your Rules](#testing-your-rules)
8. [Background Processing](#background-processing)
9. [Setting Up Automatic Processing](#setting-up-automatic-processing)
10. [The POCO Scoring Mechanism](#the-poco-scoring-mechanism)
11. [Key Concepts & Terminology](#key-concepts--terminology)
12. [Troubleshooting](#troubleshooting-tips)

---

## What is PocoClass?

**PocoClass is an intelligent document classification system** that automatically sorts and organizes your documents in Paperless-ngx. Think of it as teaching Paperless to recognize patterns in your documents and automatically assign the right categories (correspondents, document types, tags, and custom fields) without you having to do it manually.

### When You'd Use PocoClass

- **Bulk imports**: You have 500 documents to process and they need to be sorted into departments
- **Daily processing**: New documents arrive daily and need consistent, reliable categorization
- **Pattern recognition**: Your documents follow recognizable patterns (letterheads, specific formats, keywords)

---

## Installation

PocoClass can be installed using Docker (recommended) or manually. Both methods require a running Paperless-ngx instance to connect to.

### Prerequisites

- A running Paperless-ngx instance (v2.0+)
- Network connectivity between PocoClass and Paperless-ngx
- Admin credentials for Paperless-ngx

### Docker Installation (Recommended)

Docker is the easiest way to run PocoClass alongside your existing Paperless-ngx setup.

**1. Generate a secret key** for session encryption:

```bash
python3 -c "import os, base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
```

Save this key securely - you'll need it for the configuration.

**2. Create a docker-compose.yml** (or add to your existing Paperless stack):

```yaml
version: "3.8"

services:
  pococlass:
    image: pococlass:latest
    container_name: pococlass
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - POCOCLASS_SECRET_KEY=your-generated-secret-key-here
      - PAPERLESS_URL=http://paperless-ngx:8000
      - GUNICORN_WORKERS=3
      - GUNICORN_THREADS=2
    volumes:
      - pococlass-data:/app/data
      - ./rules:/app/rules:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - paperless-network

volumes:
  pococlass-data:

networks:
  paperless-network:
    external: true
```

**3. Build and start the container:**

```bash
# Navigate to project root, then build from docker folder
cd docker
docker-compose up -d --build

# Or build manually from project root
docker build -t pococlass:latest -f docker/Dockerfile .
```

**4. Access PocoClass:**

Open `http://your-server:5000` in your browser.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POCOCLASS_SECRET_KEY` | **Required.** Encryption key for sessions and API tokens | None (auto-generated if not set) |
| `PAPERLESS_URL` | URL to your Paperless-ngx instance | `http://localhost:8000` |
| `GUNICORN_WORKERS` | Number of Gunicorn worker processes | `3` |
| `GUNICORN_THREADS` | Number of threads per worker | `2` |
| `GUNICORN_TIMEOUT` | Request timeout in seconds | `120` |

### Docker Volumes

| Volume | Description |
|--------|-------------|
| `/app/data` | Persistent storage for SQLite database (user data, settings, logs) |
| `/app/rules` | Classification rules directory (mount your rules here) |

### Manual Installation

For environments where Docker is not available.

**1. Clone the repository:**

```bash
git clone https://github.com/your-repo/pococlass.git
cd pococlass
```

**2. Install Python dependencies:**

```bash
# Recommended: use a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**3. Install frontend dependencies:**

```bash
cd frontend
npm install
npm run build
cd ..
```

**4. Start PocoClass:**

```bash
# Development mode
python api.py

# Or use the start script
./start.sh
```

**5. Access PocoClass:**

Open `http://localhost:5000` in your browser.

---

## Initial Setup

After installation, complete these steps to connect PocoClass to your Paperless-ngx instance.

### Step 1: Create Required Items in Paperless

Before using PocoClass, create these items in Paperless-ngx:

**Required Custom Fields:**
- **POCO Score** (Number type) - Stores classification confidence (0-100)

**Optional Custom Fields:**
- **POCO OCR** (Number type) - Stores OCR transparency score (0-100)

**Required Tags:**
- **NEW** - Marks documents ready for processing
- **POCO+** - Applied when classification succeeds
- **POCO-** - Applied when classification fails

> **Tip:** PocoClass can create missing items for you during setup. Go to Settings → Data Validation to check and create missing items.

### Step 2: First Login

1. Open PocoClass in your browser
2. Enter your Paperless-ngx admin credentials
3. PocoClass will validate the connection and guide you through setup

### Step 3: Run Initial Sync

1. Go to Settings → System → Paperless Datafield Synchronisation
2. Click "Sync Now"
3. Wait for sync to complete

This fetches all your tags, correspondents, document types, and custom fields from Paperless.

### Step 4: Verify Setup

Go to Settings → Data Validation to confirm:
- ✅ POCO Score custom field exists
- ✅ Required tags (NEW, POCO+, POCO-) exist
- ✅ Connection to Paperless is working

---

## Understanding Paperless-ngx

### What is Paperless-ngx?

Paperless-ngx is a document management system that stores and organizes your physical or digital documents. It's like a digital filing cabinet with powerful search capabilities.

### Key Paperless Concepts

#### 1. **Documents**
Each document you scan or upload becomes a searchable entry in Paperless. When you extract text from a PDF (OCR), Paperless makes that text searchable.

#### 2. **Document Properties** (Classifications)
Each document has properties that help organize it:
- **Correspondent**: Who the document is from (e.g., "Financial Institution", "Government Agency")
- **Document Type**: What kind of document it is (e.g., "Invoice", "Receipt", "Letter")
- **Tags**: Labels you can apply (e.g., "Important", "Finance", "2024")
- **Custom Fields**: Extra data specific to your needs (e.g., "Invoice Amount", "Account Number")

#### 3. **OCR (Optical Character Recognition)**
When you scan a document, Paperless uses OCR to extract the text from images so you can search for it. The extracted text is what PocoClass analyzes to make classification decisions.

#### 4. **Custom Fields**
These are extra information fields you create in Paperless beyond the standard properties. For PocoClass to work, you need at least one custom field called <span style="color: #2563eb;">**"POCO Score"**</span> which stores classification confidence scores and <span style="color: #2563eb;">**"POCO OCR"**</span> for transparency scores.

### How Paperless API Works

Paperless exposes a REST API (a way for programs to communicate with Paperless). PocoClass uses this API to:
- Read document information and OCR text
- Retrieve your document types, correspondents, and tags
- Fetch custom field information
- Apply classifications to documents
- Create tags and update documents with new classifications

---

## How PocoClass Syncs with Paperless

### What is Syncing?

Syncing is the process of keeping PocoClass updated with the latest information from Paperless. Since things change in Paperless (you create new tags, delete custom fields, etc.), PocoClass needs to stay in sync so it knows what's currently available.

### The Sync Process (Step-by-Step)

**Where to find it**: Settings → System → Paperless Datafield Synchronisation

#### Step 1: Connect to Paperless
When you first set up PocoClass, you provide:
- Your Paperless URL (where your Paperless instance runs)
- Your admin username and password

PocoClass uses these credentials to connect and fetch data from Paperless.

#### Step 2: Fetch Current Data
During sync, PocoClass retrieves:
- All **Tags** (labels in your system)
- All **Correspondents** (who documents are from)
- All **Document Types** (what kind of document)
- All **Custom Fields** (your special fields)

#### Step 3: Cache the Data
PocoClass stores this information in its database so it can use it instantly without constantly asking Paperless. This is called "caching" and makes the system fast.

#### Step 4: Detect Changes
PocoClass checks what changed:
- **New items**: Tags or fields you created in Paperless that PocoClass doesn't know about
- **Deleted items**: Paperless items that PocoClass still has cached (which gets removed)

#### Step 5: Update Field Visibility Settings
After syncing, PocoClass updates its Field Visibility settings to reflect what's currently available. If you deleted a custom field in Paperless, it gets removed from PocoClass too.

### Manual vs Automatic Sync

**Manual Sync** (What you typically do):
1. Go to Settings → System → Paperless Datafield Synchronisation
2. Click "Sync Now"
3. Wait for it to complete

**When Should You Sync?**
- After you create new tags or custom fields in Paperless
- After you delete tags or custom fields from Paperless
- When PocoClass isn't recognizing your Paperless data
- Roughly once per day if you actively manage your Paperless configuration

### What Gets Cached?

PocoClass caches (stores locally):

| Item | Why? |
|------|------|
| Tags | Lets you select them when building rules and apply them to documents |
| Correspondents | Lets you match against and assign correspondents |
| Document Types | Lets you match against and assign document types |
| Custom Fields & Options | Lets you work with custom field data without constant API calls |
| Users | Tracks which Paperless users can use PocoClass |

---

## Building Rules: The 6-Step Wizard

A "rule" is a set of instructions that tells PocoClass: "If a document looks like THIS, classify it as THAT."

### The 6-Step Process

#### **Step 1: Basic Information**
- **Rule Name**: Give your rule a meaningful name (e.g., "Bank Statements")
- **Rule ID**: A unique identifier for the rule (auto-generated, but you can customize it)
- **Description**: Optional notes about what this rule does

#### **Step 2: OCR Identification**
OCR patterns are text strings you're looking for in the document's extracted text. Think of it as: "Does this document mention specific keywords or patterns?"

**How it works**:
1. You enter a search pattern (can be a simple word or a complex regular expression)
2. You can set how many OCR patterns must match (all, any, etc.)
3. You can adjust the **OCR threshold** (default 75%) - this means "at least 75% of my OCR patterns must match"

**Example**:
- Pattern 1: `/Bank Statement/i` (case-insensitive match for "Bank Statement")
- Pattern 2: `/IBAN/i`
- If both patterns match, this could be a bank document

**What are Regular Expressions?**
Regular expressions (regex) are a way to describe text patterns. The `/pattern/flags` format means:
- `/` marks the start and end
- `pattern` is what you're searching for
- `flags` are options like `i` (case-insensitive)

> [!TIP]
> **Regex Builder Available**: Use the built-in Regex Generator (available in the pattern editor) to assist in creating complex patterns without writing code manually.

Example patterns:
- `/invoice/i` - matches "invoice", "Invoice", "INVOICE" (case-insensitive)
- `/\d{4}-\d{2}-\d{2}/` - matches dates like "2024-01-15"
- `/Organization1|Organization2/i` - matches either "Organization1" OR "Organization2"

#### **Step 3: Filename Patterns**
These patterns search for text in the **document filename** (not the content).

**Example**:
- If your files are named "2024-01-Bank-Statement.pdf"
- You could search for `/Bank-Statement/i` to match bank documents

Filename patterns are optional. The system applies a multiplier (default 1×) to their scoring.

#### **Step 4: Paperless Comparison**
This is a safety check. You can verify that extracted or assigned classifications match what's already in Paperless.

**Example**:
- Rule extracted "John Smith" as the correspondent
- Paperless has a correspondent called "John Smith"
- Verification confirms: ✓ Match found

If verification fails, the document might not be classified using this rule (depending on your settings).

#### **Step 5: Document Classifications**
This is what happens when the rule matches a document:

**Static Classifications** (Always assign the same value):
- "Assign Correspondent → Financial Institution"
- "Assign Document Type → Statement"
- "Assign Tags → Finance, 2024"

**Dynamic Classifications** (Extract from the document):
- "Extract Correspondent from the document text using a pattern"
- "Extract Invoice Number from text between 'Invoice #' and the next space"
- Uses "anchors" - text markers that tell PocoClass where to look

**Example Dynamic Extraction**:
- You want to extract an invoice number that appears after "Inv: "
- Set `beforeAnchor` = `Inv: `
- Set `afterAnchor` = (space or newline)
- PocoClass will find the text between these markers

#### **Step 6: Review**
Review your rule configuration before saving. You can see the calculated max weights and thresholds that will be applied to documents.

---

## Testing Your Rules

### Why Test?

Before you let PocoClass automatically classify hundreds of documents, you want to make sure your rule works correctly on real documents.

### Two Types of Testing

#### **1. Dry Run** (Simulation - No Changes)
"What would happen if I ran this rule?"
- PocoClass tests your rule against selected documents
- Shows you what would happen (classifications, scores)
- **Does not make any changes** to Paperless
- Perfect for testing before you're confident

**How to do it**:
1. Select documents you want to test against
2. Click "Dry Run"
3. Review the results

#### **2. Full Run** (Real - Makes Changes)
"Apply this rule for real"
- PocoClass tests your rule and actually classifies the documents
- Makes changes in Paperless
- Applied tags, correspondents, and classifications to documents
- Scores are recorded in the POCO Score custom field

**How to do it**:
1. Select documents
2. Click "Run"
3. Documents are classified in Paperless

### Understanding Test Results

When you test, PocoClass shows you a report with:

| Column | What it shows |
|--------|---------------|
| Document | Which document was tested |
| Rule Matched | Did the rule match? (Yes/No) |
| OCR Score | What % of OCR patterns matched? |
| POCO Score | What was the final classification score? |
| Classification | Was it tagged POCO+ (matched) or POCO- (no match)? |
| Classifications Applied | What got assigned (correspondent, tags, etc.) |

**Scores Explained**:
- **OCR Score 85%**: 85% of your OCR patterns matched the document
- **POCO Score 92%**: When you combine OCR (85%) with other factors, you get 92%
- If POCO Score ≥ 75% (your threshold), the rule triggers

### The Visual Chart

Test results include a bar chart showing:
- Blue bar = OCR Score (how many patterns matched)
- Green/Red bar = POCO Score (final decision score)
- Orange line = Your threshold (75% by default)

If the bars reach the orange line, the rule triggers.

---

## Background Processing

Background processing is how PocoClass classifies new documents. When enabled, PocoClass waits for a trigger event, then processes all documents tagged with "NEW".

### How It Works

**Important:** PocoClass does **not** continuously poll or watch for new documents. It requires an external trigger to start processing. This is by design - it prevents resource waste and gives you control over when processing happens.

### Triggering Methods

There are three ways to trigger background processing:

#### **1. Post-Consumption Script (Recommended for Automation)**
Paperless-ngx supports post-consumption scripts that run automatically after a document is consumed. You can configure a script that calls PocoClass's trigger endpoint.

**Note:** The NEW tag is assigned automatically by Paperless-ngx when the tag is configured as an "inbox tag". PocoClass creates the NEW tag with this option enabled by default.

See the [Setting Up Automatic Processing](#setting-up-automatic-processing) section below for setup instructions.

#### **2. Manual Trigger via UI**
Click "Trigger Background Processing" in Settings → Background Processing to run processing once on demand.

#### **3. Scheduled Trigger (Cron Job)**
Set up a cron job or scheduled task that calls PocoClass's API endpoint at regular intervals.

---

### The Processing Flow

#### Step 1: The Trigger
When triggered, PocoClass looks for documents with the **"NEW"** tag. Paperless-ngx automatically applies this tag to new documents because it's configured as an "inbox tag" (PocoClass sets this up automatically when creating the tag).

#### Step 2: Filter Documents
PocoClass finds documents that are:
- Tagged with **"NEW"**
- NOT already tagged with **"POCO+"** or **"POCO-"** (not already classified)

#### Step 3: Apply Rules
PocoClass runs all enabled rules against these documents in order, testing each document until one rule matches.

#### Step 4: Tag & Score
When a rule matches, PocoClass:
- Applies the rule's classifications (correspondent, document type, tags)
- Writes the POCO Score to the custom field
- Applies either **"POCO+"** tag (matched) or **"POCO-"** tag (no match)
- Optionally removes the **"NEW"** tag (if enabled in Settings → Background Processing → Tag Configuration)

#### Step 5: Repeat
Background processing continues looking for more documents with the "NEW" tag.

> **Tip:** You can choose whether PocoClass automatically removes the **NEW** tag after processing. Enable this option to keep your Paperless inbox clean, or leave it disabled if you prefer to manually verify documents before removing the tag yourself.
>
> **Location:** Settings → Background Processing → Tag Configuration

### Three Processing Modes

**1. Automatic Mode**
- Runs continuously in the background every few minutes
- Always watching for new documents with "NEW" tag
- Pauses when you're using the web interface (so it doesn't interfere)
- Pauses when no documents need processing (saves resources)

**2. Trigger Mode**
- Runs once when you manually ask it to
- Useful for testing or processing a specific batch of documents
- You click "Trigger Background Processing" and it processes once

**3. Dry Run Mode**
- Same as Trigger Mode, but doesn't make changes
- Shows you what would happen without actually classifying

### Processing History

PocoClass keeps track of what it processed:

**Summary View**:
- When was the run (timestamp)
- What type of run (Automatic, Manual, Dry Run)
- How many documents were processed
- How many matched rules

**Detail View** (expandable):
Shows each document:
- Document title
- Which rule matched (if any)
- OCR and POCO scores
- What classification it got (POCO+ or POCO-)
- What classifications were applied

### Monitoring Background Processing

**Where to check**: Settings → Background Processing

You can see:
- Is background processing enabled?
- When was the last automatic run?
- How many documents are waiting to be processed?
- Processing status and any recent errors

---

## Setting Up Automatic Processing

To have PocoClass automatically process documents as they arrive in Paperless-ngx, you need to configure a post-consumption script.

### What is a Post-Consumption Script?

Paperless-ngx runs post-consumption scripts automatically after a document is fully processed (OCR completed, added to database). This is the perfect hook to trigger PocoClass.

### Requirements

1. PocoClass must be accessible from your Paperless-ngx server (via network URL)
2. You need a valid authentication token for PocoClass
3. Background processing must be enabled in PocoClass settings

### The Post-Consumption Script

A ready-to-use script is included at `scripts/pococlass_trigger.sh`. This script triggers PocoClass background processing when new documents are consumed.

**Note:** The NEW tag is assigned automatically by Paperless-ngx. When PocoClass creates the NEW tag, it configures it as an "inbox tag", which makes Paperless automatically assign it to all newly consumed documents. The script only needs to trigger PocoClass - it doesn't need to tag documents.

### Setup Steps

#### Step 1: Generate a System API Token
1. Log into PocoClass as an administrator
2. Go to **Settings → Background Processing**
3. Scroll down to **System API Token** section
4. Click **Generate Token**
5. **Important:** Copy the token immediately and save it securely. It will only be shown once.

#### Step 2: Copy and Configure the Script
1. Copy `scripts/pococlass_trigger.sh` to your Paperless scripts directory
2. Edit the configuration section at the top:
   - `POCOCLASS_URL` - Your PocoClass server address (e.g., `http://192.168.1.100:5000`)
   - `POCOCLASS_TOKEN` - The System API Token you generated in Step 1

#### Step 3: Make it Executable
```bash
chmod +x pococlass_trigger.sh
```

#### Step 4: Configure Paperless-ngx
Add the script path to your Paperless configuration:

**For Docker installations**, add to your `docker-compose.yml`:
```yaml
environment:
  PAPERLESS_POST_CONSUME_SCRIPT: /path/to/scripts/pococlass_trigger.sh
```

**For bare-metal installations**, add to your `paperless.conf`:
```
PAPERLESS_POST_CONSUME_SCRIPT=/path/to/scripts/pococlass_trigger.sh
```

### Authentication

#### System API Token (Recommended for Automation)
PocoClass provides a permanent System API Token specifically designed for automation scripts.

**Benefits:**
- **Permanent**: Does not expire like user session tokens
- **System-wide**: Not tied to any specific user account
- **Secure**: Token is hashed and stored securely; cannot be retrieved after initial generation
- **Revocable**: Can be regenerated or revoked at any time from the settings

**To generate or regenerate:**
1. Go to Settings → Background Processing → System API Token
2. Click "Generate Token" (or "Regenerate Token" if one exists)
3. Copy and save the token immediately - it cannot be retrieved later

**If the token is compromised:**
1. Go to Settings → Background Processing → System API Token
2. Click "Revoke Token" to immediately invalidate the old token
3. Generate a new token and update your scripts

### Debouncing

PocoClass includes built-in debouncing (default: 30 seconds). This means:
- Multiple rapid triggers (e.g., bulk import of 50 documents) won't cause 50 separate processing runs
- PocoClass waits for triggers to stop, then processes all pending documents in one batch
- Configure the debounce delay in Settings → Background Processing

### Troubleshooting

**Script not running?**
- Check Paperless logs for script execution errors
- Verify the script has execute permissions
- Test the script manually: `./pococlass_trigger.sh`

**PocoClass not processing?**
- Verify background processing is enabled
- Check documents have the "NEW" tag
- Look at PocoClass logs for connection errors
- Verify the URL and System API Token are correct
- If token errors occur, regenerate the System API Token in Settings

**Documents processed but no results?**
- Check Processing History in PocoClass
- Verify your rules match the document patterns
- Test rules manually using Dry Run

---

## The POCO Scoring Mechanism

POCO stands for "Post Consumption" - it originated from a simple script triggered by Paperless's post-consumption mechanism. It's PocoClass's intelligent scoring system.

### Why Two Scores?

POCO uses two scores because different data matters for different decisions:

#### **POCO OCR Score** (Transparency Score)
"How confident am I based on the text I can read?"

**Calculation**:
```
OCR Score = (Patterns that matched / Total patterns) × 100%
```

**Example**:
- You have 4 OCR patterns
- 3 of them match the document
- OCR Score = (3/4) × 100% = 75%

**Purpose**: Shows how much of your expected text was actually found in the document. If you expect to find "Invoice", "Amount", and "Date" and all three are there, you're more confident it's an invoice.

**Always recorded**: Every document gets an OCR Score recorded in notes, even if it's 0%.

#### **POCO Score** (Actionable Score)
"How confident am I combining everything?"

**Calculation**:
```
POCO Score = (OCR_weighted + Filename_weighted + Classification_weighted) / Total_weights × 100%
```

Where:
- `OCR_weighted` = OCR patterns matched × OCR multiplier
- `Filename_weighted` = Filename patterns matched × Filename multiplier
- `Classification_weighted` = Classification verification results × Classification multiplier

**Example with defaults** (OCR 3×, Filename 1×, Classifications auto):
- OCR patterns: 3 matched out of 4 (75%)
- Filename patterns: 1 matched out of 2 (50%)
- Classification verification: Passed

POCO Score = ((0.75 × 3) + (0.50 × 1)) / 4 ≈ 69%

If your POCO threshold is 75%, this rule wouldn't trigger (69% < 75%).

### Why Multipliers?

Multipliers let you say: "Trust the OCR text 3 times more than the filename."

**Default multipliers**:
- **OCR: 3×** - OCR text is usually very reliable
- **Filename: 1×** - Filenames are less reliable
- **Classifications: Auto** - Calculated based on other factors

**When to adjust**:
- Using unreliable OCR? Lower the OCR multiplier
- Filenames are super reliable in your organization? Raise the Filename multiplier
- Trust Paperless classifications more? Adjust accordingly

### Thresholds

**POCO Threshold** (default 75%):
- The minimum POCO Score needed to trigger the rule
- If POCO Score ≥ 75%, the rule matches
- Documents below 75% get tagged **"POCO-"** (no match)

**OCR Threshold** (default 75%):
- Minimum percentage of OCR patterns that must match
- If less than 75% of OCR patterns match, the rule can't trigger
- Acts as an initial filter before POCO Score is calculated

### Classification Tags

Every processed document gets one of two tags:

- **POCO+**: Rule matched and classification was applied
- **POCO-**: Rule tested but didn't match (score was too low)

These tags let you see at a glance which documents have been processed by PocoClass.

---

## Key Concepts & Terminology

### Regex (Regular Expression)
A pattern language for searching text. Format: `/pattern/flags`

**Common patterns**:
- `/invoice/i` - matches "invoice" (case-insensitive, the "i" flag)
- `/\d+/` - matches any numbers
- `/2024|2023/` - matches either "2024" or "2023"
- `/^Invoice/` - matches "Invoice" at the start of a line

### Anchors (beforeAnchor / afterAnchor)
Text markers that tell PocoClass where to extract data from.

**Example**:
- Before Anchor: `Invoice #`
- After Anchor: ` `
- Text: `Invoice # 12345 Date`
- Result: Extracted "12345"

### Logic Groups
A way to combine multiple OCR patterns with logic (ALL must match, ANY can match, etc.)

### Dry Run vs Run
- **Dry Run**: Test without making changes (simulation mode)
- **Run**: Apply the rule for real (makes changes in Paperless)

### Classifications
Information about a document:
- Static classifications: Always the same value
- Dynamic classifications: Extracted from the document

### Correspondent
Who the document is from (sender). Examples: "Bank", "Insurance Company", "Government"

### Document Type
What kind of document. Examples: "Invoice", "Receipt", "Letter", "Report"

### Custom Field
Extra information fields you create. Examples: "Invoice Amount", "Account Number", "Policy Number"

### Cache
Temporary storage of Paperless data in PocoClass's database for fast access without constantly querying Paperless.

### Token / API Token
A secret password that PocoClass uses to communicate with Paperless. Never share it.

### Threshold
A minimum score or percentage that triggers an action.

---

## Troubleshooting Tips

### Rule Isn't Matching Documents
1. **Check OCR threshold**: Are your patterns too strict?
2. **Test with Dry Run first**: See what scores you're getting
3. **Lower the POCO threshold**: Try 70% instead of 75%
4. **Use the Regex helper**: Make sure your patterns are correct
5. **Check the OCR text**: Maybe the text isn't in the document

### Documents Not Syncing from Paperless
1. Go to Settings → System → Paperless Datafield Synchronisation
2. Click "Sync Now"
3. Check the sync status - any errors?
4. Verify your Paperless connection is still working (test connection button)

### Custom Field Deleted from Paperless But Still Shows in PocoClass
1. Sync manually: Settings → System → Sync Now
2. The field should disappear after sync

### Background Processing Not Working
1. Go to Settings → Background Processing
2. Check if it's enabled
3. Look for any error messages
4. Try clicking "Trigger Background Processing" manually
5. Check if you have documents tagged with "NEW"

---

## Best Practices

1. **Start with Dry Run**: Always test rules with dry run first
2. **Test on varied documents**: Try your rule on 5-10 different documents
3. **Use meaningful patterns**: Specific patterns work better than generic ones
4. **Document your rules**: Give rules clear names describing what they match
5. **Keep rules organized**: Use naming conventions (e.g., "Bank-", "Invoice-")
6. **Monitor processing history**: Check results regularly to see if rules are working
7. **Adjust thresholds slowly**: Change by 5% at a time, not 20%
8. **Sync regularly**: Keep PocoClass in sync with Paperless changes

---

## Need Help?

- Check the rule preview pane - it shows example matches from your documents
- Use the Regex helper modal when building patterns
- Review past test results in Processing History to understand how rules are working
- Use Dry Run liberally - it's risk-free testing
