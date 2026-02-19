# Administration guide

## Introduction

PocoClass is a document classification system for Paperless-ngx. It evaluates documents against user-defined rules and automatically assigns correspondents, document types, tags, and custom fields based on pattern matching.

This guide is for administrators performing initial setup and ongoing maintenance of PocoClass. For deployment instructions, see `README.md`. For building rules and understanding scoring, use the in-app **Guide** and **Tutorial** accessible from the navigation menu.

---

## Initial setup

On first login, PocoClass launches a setup wizard that walks you through connecting to Paperless-ngx and verifying required items.

### Setup wizard steps

1. **Connect to Paperless-ngx** — Enter your Paperless URL and admin credentials. PocoClass authenticates via the Paperless API and stores the connection.
2. **Create/verify required items** — The wizard checks for and can create:

| Item | Type | Purpose |
|------|------|---------|
| POCO Score | Custom field (number) | Stores classification confidence score (0–100) |
| POCO OCR | Custom field (number) | Stores OCR transparency score (0–100) |
| NEW | Tag (inbox tag) | Marks documents ready for processing |
| POCO+ | Tag | Applied when a rule matches |
| POCO- | Tag | Applied when no rule matches |

3. **Complete setup** — Confirms all required items exist and finalizes configuration.

The wizard handles everything automatically. After setup, an initial sync fetches all Paperless data.

---

## Settings overview

Settings are organized into tabs:

| Tab | What it controls |
|-----|-----------------|
| **System** | Paperless-ngx connection (URL, credentials) and data synchronization |
| **Appearance** | Theme (Light / Dark / Auto) and color blind mode |
| **Date formats** | Date display format configuration |
| **Field visibility** | Controls which Paperless fields are visible in PocoClass |
| **Validation** | Check and create required Paperless items (custom fields, tags) |
| **Background processing** | Enable/configure automatic processing, debounce delay, tag behavior, System API Token |
| **Maintenance** | Database maintenance and log management |

---

## Synchronization

Syncing fetches tags, correspondents, document types, custom fields, and users from Paperless-ngx into PocoClass's local cache. This ensures PocoClass has current data for rule evaluation and field lookups.

**When syncing occurs:**

- Automatically at login (if data is older than 60 minutes)
- Manually via the **Sync Now** button in Settings > System
- Automatically before every background processing run

After syncing, field visibility settings are updated to reflect any changes in Paperless (new or deleted fields).

---

## User management

PocoClass authenticates all users against Paperless-ngx credentials — there are no separate PocoClass passwords.

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access: settings, user management, background processing, rules |
| **User** | Standard access: view and work with rules and documents |

- The first user to complete setup is assigned the **admin** role (if they are a Paperless superuser).
- Subsequent users are created automatically on first login with the **user** role.
- Admins can **activate/deactivate** user accounts. Disabled accounts cannot log in.
- Password changes are managed in Paperless-ngx, not in PocoClass.

---

## Background processing

### What it does

Background processing finds documents tagged with the configured tag (default `NEW`), evaluates all classification rules against each document, and applies the best-matching rule's classifications. Documents receive either `POCO+` (match found) or `POCO-` (no match).

> For details on how rules and scoring work, see the in-app **Guide** and **Tutorial**.

### Auto-pause behavior

**When a user is logged into the web interface, automatic background processing pauses.** This prevents conflicts between manual work and automatic processing. The system checks for active sessions within the last 5 minutes.

- UI-initiated triggers (clicking the **Trigger** button) bypass auto-pause.
- Automatic triggers from external scripts are paused until no active sessions are detected.

### Processing modes

| Mode | Trigger type | Description |
|------|-------------|-------------|
| Automatic | `automatic` | Triggered by external script or cron job |
| Manual trigger | `trigger` | UI button — processes all NEW-tagged documents |
| Manual run | `manual_run` | UI — run with custom filters (tags, correspondents, dates, etc.) |
| Dry run | `manual_dry_run` | UI — simulation only, no changes applied |

### Debouncing

Multiple rapid triggers (e.g., during bulk import) are batched into a single processing run. The default delay is **30 seconds**, configurable in Settings > Background Processing.

### Processing lock

Only one processing run can execute at a time. If a trigger arrives while processing is active, it sets a re-run flag. After the current run completes, processing automatically starts again.

### Tag behavior

- **Match found**: `POCO+` tag applied, `POCO-` tag removed (if present)
- **No match**: `POCO-` tag applied, `POCO+` tag removed (if present)
- **NEW tag removal**: Optionally removed after processing (configurable in Settings > Background Processing > Tag Configuration)

### Processing history

Available on the **Background Process** page. Each run shows:

- Timestamp and trigger type
- Documents found, processed, classified, and skipped
- Expandable per-document details (rule matched, scores, classifications applied)

---

## System API token for external scripts

### What it is

A permanent authentication token for automation scripts. Unlike user session tokens, the System API Token does not expire and is not tied to any user account.

### Where to generate

Settings > Background Processing > **System API Token**

### Security

- The token is displayed **only once** at generation — copy it immediately
- Stored as a SHA-256 hash; cannot be retrieved later
- Can be **regenerated** (creates a new token, invalidates the old one) or **revoked** at any time

### Post-consumption script setup

PocoClass includes a ready-to-use script at `scripts/post-consumption/pococlass_trigger.sh` that triggers background processing when Paperless consumes a new document.

**Setup steps:**

1. Generate a System API Token in Settings > Background Processing
2. Copy the script to your Paperless scripts directory
3. Edit the script and set `POCOCLASS_URL` and `POCOCLASS_TOKEN`
4. Make it executable:
   ```bash
   chmod +x pococlass_trigger.sh
   ```
5. Configure Paperless to use it:
   ```bash
   PAPERLESS_POST_CONSUME_SCRIPT=/path/to/pococlass_trigger.sh
   ```

The script sends a POST request to `/api/background/trigger` with the token in the `X-API-Key` header.

---

## Troubleshooting

| Problem | What to check |
|---------|--------------|
| Background processing not running | Verify it's enabled in Settings. Check that documents have the `NEW` tag. Review logs on the Logs page. |
| Auto-pause preventing processing | Log out of the web UI, or use the manual **Trigger** button (bypasses auto-pause). |
| Token authentication errors | Regenerate the System API Token in Settings and update your scripts. |
| Sync issues | Run a manual sync in Settings > System. Verify Paperless URL and credentials. |
| Documents not being classified | Ensure rules exist and are valid. Test with a **dry run** to see what would happen. See the in-app **Guide** for rule configuration help. |
