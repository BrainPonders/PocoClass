# PocoClass

PocoClass helps you teach [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) how to handle your documents. When you scan or import documents into Paperless, PocoClass reads the text content, checks the filename, and uses what Paperless already knows to automatically assign the right tags, correspondents, document types, and custom fields — so you don't have to do it by hand, one document at a time.

You build classification rules through a simple step-by-step wizard, and PocoClass takes care of the rest in the background. It's especially useful when importing large batches of unsorted documents.

POCO stands for **Post Consumption** — it started as a simple script triggered by Paperless's post-consumption hook and grew from there.

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
