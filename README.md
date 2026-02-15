# PocoClass

Document classification for [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx). Build rules that automatically classify, tag, and enrich your documents using OCR content, filename patterns, and metadata extraction.

POCO stands for **Post Consumption** — it started as a simple script triggered by Paperless's post-consumption hook.

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
└─────────────────────────────────┘
```

**Frontend:** React, Vite, Tailwind CSS
**Docker base:** `11notes/python:3.13` (rootless Alpine)

### Backend

- **Flask REST API** — rule management, document processing, authentication, settings
- **POCO Scoring v2 engine** — dual-score calculation with configurable weights and thresholds
- **Pattern matcher** — OCR content and filename regex matching with logic groups
- **Metadata extractor** — anchor-based extraction of dates, amounts, and custom fields
- **Background processor** — debounced, tag-based document discovery and automatic rule application
- **Rule loader** — YAML-based rule storage with validation
- **SQLite** — users, sessions, Paperless-ngx data cache, logs, processing history

## Installation

### Docker (recommended)

```bash
git clone https://github.com/eRJe79/PocoClass.git
cd PocoClass
bash docker/install.sh
```

The install script builds the image, generates a secret key, and sets up a deployment directory at `./pococlass/`. After it finishes:

```bash
cd pococlass

# 1. Set your Paperless-ngx container URL
nano .env

# 2. Set the Docker network to match your Paperless setup
nano docker-compose.yml

# 3. Start PocoClass
docker compose up -d
```

Open `http://your-server:5000` in your browser.

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

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `POCOCLASS_SECRET_KEY` | Encryption key for sessions (required) | — |
| `PAPERLESS_URL` | Paperless-ngx URL (required for Docker, or configure in web UI) | — |
| `GUNICORN_WORKERS` | Number of worker processes | `3` |
| `GUNICORN_THREADS` | Threads per worker | `2` |
| `GUNICORN_TIMEOUT` | Request timeout (seconds) | `120` |

## First-time setup

1. Open PocoClass in your browser
2. Log in with your Paperless-ngx admin credentials
3. Complete the setup wizard — it connects to Paperless-ngx and creates the required custom fields and tags
4. Start building rules with the 6-step wizard or follow the built-in guided tutorial

## Features

- **Dual-score evaluation** — OCR transparency score + weighted POCO score, both must pass for classification
- **6-step rule wizard** — guided rule builder with real-time score preview and YAML output
- **Dynamic metadata extraction** — extract dates, amounts, and custom fields from OCR text using anchor patterns
- **Background processing** — tag-based document discovery with automatic rule application
- **Filename pattern matching** — secondary verification using filename regex patterns
- **Paperless verification** — cross-reference extracted data against existing Paperless-ngx metadata
- **Multi-language UI** — English, German, Spanish, French, Italian, Dutch
- **Theme support** — light, dark, and auto modes with color blind accessibility
- **Interactive tutorial** — 32-step guided walkthrough using a real bank statement example
- **Post-consumption trigger** — optional script for Paperless-ngx to trigger PocoClass after document import
- **User management** — admin and regular user roles, authenticated via Paperless-ngx credentials
- **Security** — HttpOnly session cookies, encrypted API tokens, security headers, rootless Docker image

## Roadmap

- [ ] Data validation integration for extracted metadata (monetary, integer, float formats)
- [ ] Batch testing rules against multiple documents
- [ ] Dynamic extraction for correspondent, document type, and tags (with fuzzy matching)
- [ ] Rule templates library for common document types (invoices, receipts, contracts)
- [ ] Export/import rules between PocoClass instances
- [ ] Regex pattern builder tutorial

## License

See [LICENSE](LICENSE) file for details.
