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

### Docker deployment from scratch

Use this section when you want a fully manual setup with explicit Docker CLI commands and no helper scripts.

#### Overview

1. Create a deployment folder and clone the source.
2. Build the PocoClass Docker image directly from the Dockerfile.
3. Copy runtime files into the deployment folder.
4. Configure `.env` with the PocoClass secret and Paperless URL.
5. Configure Docker network settings in `.env` and `docker-compose.yml`.
6. Start PocoClass and verify it is healthy.

#### Step-by-step

##### Step 1. Create a deployment folder and clone the source

Create a dedicated folder that will hold code, config, and runtime data:

```bash
mkdir -p ~/pococlass
cd ~/pococlass
git clone https://github.com/eRJe79/PocoClass.git source
```

##### Step 2. Build the Docker image (raw Docker CLI)

Build `pococlass:latest` directly from `docker/Dockerfile`:

```bash
cd ~/pococlass/source
docker build -t pococlass:latest -f docker/Dockerfile .
```

##### Step 3. Prepare runtime files in the deploy root

Copy compose/env templates and create persistent directories:

```bash
cd ~/pococlass
cp source/docker/docker-compose.example.yml docker-compose.yml
cp source/docker/.env.example .env
cp source/scripts/pococlass_trigger.sh .
chmod +x pococlass_trigger.sh
mkdir -p rules data
```

`rules/` and `data/` are required.  
`rules/` stores your YAML rules, and `data/` stores runtime state (database/settings).

Set folder ownership/permissions to match your environment.  
For `11notes`, the default container user is `UID:GID 1000:1000`, for example:

```bash
cd ~/pococlass
chown -R 1000:1000 rules data
chmod -R u+rwX,go-rwx rules data
```

`pococlass_trigger.sh` is copied to `~/pococlass` as a staging location.  
The final destination is your own Paperless post-consume scripts folder.

##### Step 4. Configure `.env` (secret key + Paperless URL)

Open `.env`:

```bash
cd ~/pococlass
nano .env
```

Set the required values:

- `POCOCLASS_SECRET_KEY` -> generate one with:
```bash
python3 -c "import os, base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
```
- `PAPERLESS_URL` -> container where the Paperless webserver is running.

Check container names:

```bash
docker ps
```

Examples:

- Official `paperless-ngx` compose: `http://paperless-webserver:8000`
- `11notes` paperless-ngx: `http://paperless-ngx:8000`

##### Step 5. Configure Docker network settings (`.env` + `docker-compose.yml`)

PocoClass must join the same Docker network as Paperless.  
Without a shared network, `PAPERLESS_URL` will not be reachable from the PocoClass container.

Find the network used by Paperless:

```bash
docker inspect paperless-webserver --format '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}'
```

For 11notes, use:

```bash
docker inspect paperless-ngx --format '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}'
```

Set this network in `.env`:

```bash
cd ~/pococlass
nano .env
```

Set:
- `PAPERLESS_NETWORK_NAME=<network_name_from_inspect>`
- `PAPERLESS_NETWORK_EXTERNAL=true` (if Paperless network already exists)

Then review `docker-compose.yml`:

```bash
cd ~/pococlass
nano docker-compose.yml
```

The template should reference those `.env` values:

```yaml
networks:
  paperless:
    name: ${PAPERLESS_NETWORK_NAME:-paperless_default}
    external: ${PAPERLESS_NETWORK_EXTERNAL:-true}
```

##### Step 6. Start PocoClass and verify

Start PocoClass:

```bash
cd ~/pococlass
docker compose up -d
```

Verify container status:

```bash
docker compose ps
```

Check health/logs:

```bash
docker compose logs -f pococlass
```

Then open `http://your-server:5000` in your browser.

### Guided installer (optional)

If your environment matches installer defaults, you can use:

```bash
mkdir -p ~/pococlass && cd ~/pococlass
git clone https://github.com/eRJe79/PocoClass.git source
bash source/docker/install.sh
```

### Optional: Trigger PocoClass after Paperless consumption

PocoClass ships with `pococlass_trigger.sh` for post-consume automation.
You can keep a working copy in `~/pococlass`, but Paperless must execute the script from your chosen post-consume scripts directory.

1. Generate a **System API Token** in PocoClass: `Settings -> Background Processing`.
2. Copy and edit the trigger script:
```bash
cd ~/pococlass
cp pococlass_trigger.sh /path/to/paperless/scripts/
nano /path/to/paperless/scripts/pococlass_trigger.sh
chmod +x /path/to/paperless/scripts/pococlass_trigger.sh
```
3. Set `POCOCLASS_URL` and `POCOCLASS_TOKEN` in that script.
4. Configure Paperless with:
   - Docker: `PAPERLESS_POST_CONSUME_SCRIPT=/path/to/pococlass_trigger.sh`
   - Bare metal: same variable in `paperless.conf`

### Updating

```bash
cd ~/pococlass/source
git pull
docker build -t pococlass:latest -f docker/Dockerfile .
```

This rebuilds the image with latest source. Your `.env`, `docker-compose.yml`, `rules/`, and `data/` stay unchanged.

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
| `PAPERLESS_NETWORK_NAME` | Docker network shared with Paperless | `paperless_default` |
| `PAPERLESS_NETWORK_EXTERNAL` | Whether Paperless network already exists | `true` |
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
