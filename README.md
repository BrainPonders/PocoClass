# PocoClass

PocoClass is a companion application for [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) that automates document classification.

### The problem

Paperless-ngx is great at storing and searching your documents, but classifying them — assigning the right tags, correspondents, document types, and custom fields — is still largely a manual process. This is manageable when you add a few documents at a time, but it quickly becomes tedious when you're importing hundreds or thousands of unsorted documents from a scanner, email, or archive.

Paperless has built-in matching, but it works best once you've already manually classified enough documents for it to learn from. Getting to that point takes time and repetitive effort.

### How PocoClass helps

PocoClass sits alongside Paperless-ngx and connects to it through its API. You create classification rules using a step-by-step wizard — no coding required. Each rule tells PocoClass what to look for in a document's OCR text, filename, or existing Paperless metadata, and what to do when it finds a match (assign tags, set a correspondent, fill in custom fields, and so on).

Once your rules are in place, PocoClass runs in the background. It picks up new or unclassified documents automatically, evaluates them against your rules, and applies the matching classifications directly in Paperless-ngx. This helps you train Paperless faster and makes bulk imports practical — you define the rules once, and PocoClass handles the rest.

### Where does the name POCO come from?

POCO stands for **Post Consumption**.

The project began several years ago as a small script triggered by Paperless-ngx's post-consumption hook — the mechanism that runs after a document is imported. Its initial goal was to assist with large bulk imports by automatically classifying a limited set of document types.

Over time, that script evolved into a structured rule engine powered by YAML-based definitions. While powerful, it required technical knowledge and remained limited to advanced users.

PocoClass v2.0 was a complete rewrite. The original backend logic was reimagined and expanded with the help of Replit, transforming the script into a full web-based application with a visual rule builder, background processing engine, and transparent scoring system.

The name remained as a reference to its origins — but the project has grown far beyond its initial script.

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
git clone https://github.com/BrainPonders/PocoClass.git
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
git clone https://github.com/BrainPonders/PocoClass.git
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

- **Easy-to-use rule builder** — step-by-step wizard to create classification rules, no coding required
- **Set it and forget it** — create a rule once and let it run automatically in the background
- **Flexible scoring** — combines OCR content, filename patterns, and Paperless-ngx metadata for accurate classification
- **Bulk import friendly** — ideal for importing large batches of unknown documents into Paperless-ngx
- **Train Paperless faster** — helps automate the way Paperless learns to classify your documents
- **Multi-language UI** — English, German, Spanish, French, Italian, Dutch

## Roadmap

- [ ] Improve GUI standardisation
- [ ] Tutorial for rule evaluation
- [ ] Tutorial for background processing
- [ ] Improve regex helper

## License

See [LICENSE](LICENSE) file for details.
