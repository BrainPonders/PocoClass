# PocoClass

PocoClass is a companion application for [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) that automates document classification with a focus on control and transparency.

<br>

### The Problem: Learning Has Limits

Paperless-ngx is an excellent tool for document indexing. While its built-in classifier uses OCR and statistical learning to suggest metadata, this approach has inherent limitations:

- **Training Requirements:** The classifier requires a large volume of manually classified documents before it becomes reliable.
- **Contextual Confusion:** Subtle nuances often lead to misclassification. For instance, a classifier might select the wrong date from a document containing multiple timestamps or confuse two similar documents from the same organization (e.g., an account summary versus a contract update).
- **Format Shifts:** Annual formatting changes or minor variations between subsidiaries can easily disrupt pattern-based recognition.

As archives grow into the thousands, manual corrections become a repetitive burden. When users stop correcting these small errors, metadata becomes inconsistent and the quality of the digital archive degrades.

<br>

### The Solution: Deterministic Rule-Based Logic

PocoClass addresses these gaps by introducing deterministic, rule-based classification. Rather than relying on learned behaviors, it uses explicit identification logic — including flexible pattern matching and dynamic data extraction — to classify documents with high precision.

- **Step-by-Step Wizard:** Create complex rules without writing code.
- **Background Processing:** Automatically monitors for new or unclassified documents.
- **Transparent Scoring:** When a document matches a rule, PocoClass provides clear reasoning for the match.
- **Direct Integration:** Applied classifications are pushed directly to your Paperless-ngx instance.

When a document matches, it matches for a defined reason.

<br>

### Origin Story: Why “POCO”?

The name stands for Post Consumption.

The project originated as a small script triggered by the Paperless-ngx post-consumption hook, a mechanism that runs immediately after a document is imported. It began as a simple tool designed to support bulk imports and gradually evolved into a structured YAML-based rule engine.

PocoClass v2.0 emerged from what initially started as an experiment to build a web-based frontend using Replit. What was meant to be a lightweight interface quickly turned into a complete redesign. The result was a fully reimagined application with a visual rule builder, background processing, and a transparent scoring system.

<br>

| <div align="center"><b>Rule Wizard</b></div> | <div align="center"><b>Defining OCR Patterns</b></div> |
|---|---|
| <a href="documentation/images/rule_wizard.png"><img src="documentation/images/rule_wizard.png" width="400"></a> | <a href="documentation/images/ocr_identification.png"><img src="documentation/images/ocr_identification.png" width="400"></a> |
| <div align="center"><b>Rule Evaluation</b></div> | <div align="center"><b>&nbsp;</b></div> |
| <a href="documentation/images/rule_evaluation.png"><img src="documentation/images/rule_evaluation.png" width="400"></a> | &nbsp; |



<br>

## Architecture

```
┌─────────────────────────────────┐
│         React Frontend          │
│  Rule Wizard · Dashboard · Logs │
└──────────────┬──────────────────┘
               │ REST API
┌──────────────▼──────────────────┐
│         Flask Backend           │
│  POCO Engine · Pattern Matcher  │
│  Metadata Extractor · Scheduler │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│     Paperless-ngx Instance      │
│          (REST API)             │
└─────────────────────────────────┘
```

**Frontend:** React, Vite, Tailwind CSS
**Docker base:** `11notes/python:3.13` (rootless Alpine)

<br>

### Backend

- **Flask REST API** — rule management, document processing, authentication, settings
- **POCO Scoring v2 engine** — dual-score calculation with configurable weights and thresholds
- **Pattern matcher** — OCR content and filename regex matching with logic groups
- **Metadata extractor** — anchor-based extraction of dates, amounts, and custom fields
- **Background processor** — debounced, tag-based document discovery and automatic rule application
- **Rule loader** — YAML-based rule storage with validation
- **SQLite** — users, sessions, Paperless-ngx data cache, logs, processing history

<br>

## Installation

### Docker (recommended)

```bash
mkdir ~/pococlass && cd ~/pococlass
git clone https://github.com/eRJe79/PocoClass.git source
bash source/docker/install.sh
```

The install script builds the image, generates a secret key, and sets up everything in your chosen directory:

```
~/pococlass/
├── source/                  ← source code (git repo)
├── docker-compose.yml
├── .env
├── rules/                   ← your YAML rule files
├── data/                    ← runtime data (database, settings)
└── pococlass_trigger.sh
```

After it finishes:

```bash
# 1. Set your Paperless-ngx container URL
nano .env

# 2. Set the Docker network to match your Paperless setup
nano docker-compose.yml

# 3. Start PocoClass
docker compose up -d
```

Open `http://your-server:5000` in your browser.

### Updating

```bash
cd ~/pococlass/source
git pull
bash docker/install.sh
```

The install script detects that this is an update and rebuilds the Docker image with the latest code. Your `.env`, `docker-compose.yml`, `rules/`, and `data/` are kept as-is.

After the rebuild, restart the container:

```bash
cd ~/pococlass
docker compose up -d
```

### Native install

Requires Python 3.13+ (3.11+ may work) and Node.js 20+.

```bash
git clone https://github.com/eRJe79/PocoClass.git
cd PocoClass

# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install && npm run build && cd ..

# Generate a secret key
python3 scripts/generate_secret_key.py

# Set required environment variable
export POCOCLASS_SECRET_KEY="your_generated_key_here"

# Start
./start.sh
```

<br>

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `POCOCLASS_SECRET_KEY` | Encryption key for sessions (required) | — |
| `PAPERLESS_URL` | Paperless-ngx URL (required for Docker, or configure in web UI) | — |
| `GUNICORN_WORKERS` | Number of worker processes | `3` |
| `GUNICORN_THREADS` | Threads per worker | `2` |
| `GUNICORN_TIMEOUT` | Request timeout (seconds) | `120` |

<br>

## First-time setup

1. Open PocoClass in your browser
2. Log in with your Paperless-ngx admin credentials
3. Complete the setup wizard — it connects to Paperless-ngx and creates the required custom fields and tags
4. Start building rules with the 6-step wizard or follow the built-in guided tutorial

<br>

## Features

- **Easy-to-use rule builder** — step-by-step wizard to create classification rules, no coding required
- **Set it and forget it** — create a rule once and let it run automatically in the background
- **Flexible scoring** — combines OCR content, filename patterns, and Paperless-ngx metadata for accurate classification
- **Bulk import friendly** — ideal for importing large batches of unknown documents into Paperless-ngx
- **Train Paperless faster** — helps automate the way Paperless learns to classify your documents
- **Multi-language UI** — English, German, Spanish, French, Italian, Dutch

<br>

## Roadmap

- [ ] Improve GUI standardisation
- [ ] Tutorial for rule evaluation
- [ ] Tutorial for background processing
- [ ] Improve regex helper

<br>

## License

See [LICENSE](LICENSE) file for details.
