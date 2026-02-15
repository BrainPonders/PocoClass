# PocoClass

PocoClass is a companion application for [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) that automates document classification in a controlled and transparent way.

### Why PocoClass?

Paperless-ngx is excellent at storing and indexing documents. It can extract text through OCR and even attempt automatic classification based on learned patterns. However, its built-in classifier relies on historical data and statistical learning — and that comes with limitations.

To perform well, Paperless needs a large number of manually classified documents. Until that training base exists, results can be inconsistent. Even after learning, subtle nuances may still cause misclassification. For example:

- A document may contain multiple dates, and the classifier may select the wrong one as the creation date.
- Two documents from the same organization may look nearly identical but represent different types (e.g., an account summary vs. a contract update).
- Slight format changes from year to year can confuse pattern-based recognition.
- Similar invoices from different subsidiaries may be misassigned to the wrong correspondent.

Each of these errors seems small. But when processing hundreds or thousands of documents — especially during bulk imports — manual corrections become repetitive and time-consuming. Over time, users tend to correct fewer mistakes. Misclassified documents accumulate, metadata becomes inconsistent, and the quality of the archive slowly degrades.

PocoClass addresses this by introducing deterministic, rule-based classification. Instead of relying purely on learning behaviour, it uses explicitly defined identification logic — including flexible pattern matching and dynamic data extraction — to classify documents with a high degree of precision. You create rules through a step-by-step wizard, and PocoClass runs them in the background, picking up new or unclassified documents automatically and applying the matching classifications directly in Paperless-ngx.

When a document matches a rule, it matches for a clear reason.

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
