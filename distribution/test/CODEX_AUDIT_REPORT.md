# PocoClass Final Audit 01

**Date:** 2026-02-23  
**Branch:** `codex/final-audit-01`  
**Scope:** Full Python backend module review (security, dead/dirty code, structure), plus frontend i18n integrity checks.

---

## 1) Executive Decision

**Decision: Conditional GO**

- No open **critical** findings remain after fixes in this branch.
- One medium security-hardening item remains (raw exception text returned by many API endpoints).
- Refactor debt remains (large modules), but this is maintainability risk, not an immediate release blocker.

---

## 2) Status of Previous Audit Phases (Re-checked)

### Phase 0 (Security blockers) from prior report

Status: **Completed and re-verified**

- Sensitive API routes are protected with auth decorators, except expected public bootstrap endpoints.
- Flask debug mode is environment-driven (not hardcoded-on).
- URL query token fallback is no longer used in document preview path.

Re-check result for undecorated `/api/*` routes:
- Expected public routes only:
  - `/api/health`
  - `/api/auth/status`
  - `/api/auth/setup`
  - `/api/auth/login`
- One intentionally manual-auth route:
  - `/api/documents/<int:doc_id>/preview` (has explicit session validation in handler)

### Phase 1 (Privacy hardening)

Status: **Largely completed**

- Session cookie is HttpOnly and SameSite=Lax.
- Token-at-rest controls remain in place (encrypted Paperless token, hashed system token).

### Phase 2 (Quality stabilization)

Status: **Partially completed**

- Structural route extraction work is complete (phases 1–6 merged previously).
- This audit removes additional dirty code (unused imports) and closes one critical security bug.
- Full automated API test coverage is still limited.

---

## 3) Findings and Actions (This Audit)

## CRITICAL-FA01 — Rule file path traversal in CRUD/execute endpoints

**What was found**

Rule file paths were built from user-controlled `rule_id` without strict sanitization in multiple routes.

**Risk**

Authenticated users could potentially traverse paths and write/read/delete outside intended rule files.

**Status:** **Fixed in this branch**

**Fix implemented**

- Added strict rule ID validation in `backend/routes/rules_routes.py`.
- Added safe path resolver constrained to `rules/` and `rules/deleted/`.
- Applied validation to create/update/get/delete/permanent-delete/execute endpoints.

---

## HIGH-FA02 — Missing translation fallback produced raw key strings in UI

**What was found**

`LanguageContext` returned raw key names when a locale key was missing.

**Impact**

Users saw internal keys like `wizard.step2Title` instead of text.

**Status:** **Fixed in this branch**

**Fix implemented**

- Added English fallback resolution in `frontend/src/contexts/LanguageContext.jsx` for `t()` and `getRaw()`.
- Missing keys now render English text instead of raw key strings.

---

## MEDIUM-FA03 — Wizard title mapping mismatched step numbers

**What was found**

Rule wizard headings had legacy step-key mismatches (e.g., step 4 showing step 6 title).

**Status:** **Fixed in this branch**

**Fix implemented**

- Updated wizard headings:
  - `DataVerificationStep` now uses `wizard.step4`.
  - `SummaryStep` now uses `wizard.step6`.
  - `StaticDataStep` uses `wizard.step3`.
  - `DocumentClassificationsStep` uses `wizard.step5`.
- Only `wizard.step2Title` remains as a specific title key; missing locales now safely fall back to English.

---

## MEDIUM-FA04 — Error-detail leakage via `str(e)` in API responses

**What was found**

Many routes return raw exception messages to clients.

**Risk**

Can expose internal details (query/data/stack context) and aid reconnaissance.

**Status:** **Open recommendation**

**Recommendation**

- Standardize API error responses to generic messages.
- Keep full details in server logs only.
- Introduce an app-wide error handler for consistent safe responses.

---

## LOW-FA05 — Dirty code / unused imports

**Status:** **Fixed in this branch**

Removed confirmed unused imports in:

- `backend/scoring_calculator_v2.py`
- `backend/test_engine.py`
- `backend/config.py`
- `backend/database.py`
- `backend/metadata_processor.py`
- `backend/sync_service.py`
- `backend/background_processor.py`

---

## 4) Python Module Structure Review

### Largest modules (still candidates for further split)

- `backend/database.py` (~1743 lines)
- `backend/background_processor.py` (~1109 lines)
- `backend/routes/rules_routes.py` (~992 lines)
- `backend/metadata_processor.py` (~819 lines)
- `backend/routes/auth_users.py` (~723 lines)
- `backend/api_client.py` (~707 lines)

### Highest-length functions (top candidates to split)

- `Database.init_database` (~270 lines)
- `rules_routes.generate_formatted_yaml` (~253 lines)
- `SyncService.sync_all` (~217 lines)
- `PaperlessAPIClient.get_documents` (~195 lines)
- `BackgroundProcessor._process_document` (~179 lines)

### Recommended split plan (post-release hardening cycle)

1. `backend/database.py`
   - Move table schema + migrations to `backend/db/schema.py`.
   - Move logs/history APIs to `backend/db/log_repo.py` and `backend/db/history_repo.py`.
2. `backend/background_processor.py`
   - Split discovery, scoring-note generation, metadata-apply, and run orchestration into dedicated service modules.
3. `backend/routes/rules_routes.py`
   - Extract YAML rendering/validation and frontend<->backend conversions into `backend/rules/` service files.

---

## 5) Frontend i18n Audit Notes

- Static key scan originally showed missing keys in non-English locale files.
- With the new English fallback, missing locale entries no longer break UX.
- Remaining translation debt (non-blocking): add native translations for these keys in each locale:
  - `common.saving`
  - `common.selectedFile`
  - `settings.system.currentUser`
  - `validation.completeRequiredFields`
  - `wizard.helpToggle`
  - `wizard.step2Title`

---

## 6) Validation Executed in This Audit

- Python syntax compile:
  - `PYTHONPYCACHEPREFIX=/tmp/pycache python3 -m compileall -q api.py backend` ✅
- Locale JSON parse check ✅
- Route auth re-scan for undecorated `/api/*` routes ✅
- Docker smoke test:
  - `bash distribution/test/smoke_local_docker.sh` ✅

Smoke checks passed for:
- `/api/health` (200)
- `/api/auth/status` (200)
- Protected endpoints returning expected 401 when unauthenticated.

---

## 7) Final Publish Guidance

Safe to publish after merging this branch, with one caution:

- Treat API error-message hardening as next priority after release (medium risk).
- Continue with the planned module split cycle to reduce future regression risk.

