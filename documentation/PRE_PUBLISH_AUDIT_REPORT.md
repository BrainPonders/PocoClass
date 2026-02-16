# PocoClass — Pre-Publish Deep Audit Report

**Date:** 2026-02-16  
**Repository state:** freshly re-initialized from latest remote  
**Purpose:** pre-release go/no-go decision across security, privacy, stale code, auditability, UI consistency, and module hygiene.

---

## 1) Go/No-Go Decision

**Decision: NO-GO (do not publish yet).**

The release is currently blocked by:

1. Sensitive API surfaces that are publicly callable without authentication.
2. Token privacy issues (URL token fallback + localStorage storage model).
3. Quality baseline not green (`ruff`, `pytest`, `eslint` all failing).

---

## 2) Audit Scope and Method

This audit included:

- Backend API route protection review (`@require_auth`, `@require_admin`, `@require_system_token_or_admin`).
- Session/token handling review (backend + frontend).
- Stale code/static hygiene checks.
- CSS/component consistency scan.
- Module structure and repository hygiene review.

### Quantitative snapshot

- Routes discovered: **65 total**, **63 `/api/*` routes**.
- API routes without `@require_*` decorator: **15**.
- Of those, **4 are expected public auth/bootstrap/health endpoints** (`/api/health`, `/api/auth/status`, `/api/auth/setup`, `/api/auth/login`).
- Remaining **11 unauthenticated API endpoints are high-risk candidates** and include rules/logging/preview/testing surfaces.
- Frontend source files scanned: **131**.
- Inline style occurrences (`style={{...}}`): **919**.
- Native `<button>` occurrences: **158**.
- Files importing shared `components/ui/button`: **14**.

---

## 3) Security Findings

## SEC-1 (Critical) — Unauthenticated rule and administrative content endpoints

The following endpoints are currently callable without auth decorators and should be treated as pre-publish blockers:

- `GET /api/rules`
- `GET /api/rules/errors`
- `GET /api/rules/<rule_id>`
- `POST /api/rules`
- `PUT /api/rules/<rule_id>`
- `DELETE /api/rules/<rule_id>`
- `GET /api/deleted-rules`
- `DELETE /api/deleted-rules/<rule_id>`
- `GET /api/logs`
- `POST /api/rules/test`

**Impact:** unauthorized read/write/delete of classification rules and operational visibility exposure.  
**Likelihood:** high if service is internet-reachable.  
**Status:** release blocker.

## SEC-2 (High) — `debug=True` hard-enabled

`api.py` starts Flask with debug mode enabled at runtime entry.

**Impact:** dangerous deployment misconfiguration path and expanded attack surface.  
**Status:** release blocker.

## SEC-3 (High) — Preview endpoint auth bypass style (token in query)

`/api/documents/<int:doc_id>/preview` accepts token from query string when header is absent.

**Impact:** increases token disclosure risk via logs/history/referrers/sharing.  
**Status:** release blocker (privacy + security).

---

## 4) Privacy Findings

## PRIV-1 (High) — Session token accepted in URL query

Bearer-equivalent token usage in URL parameters is unsafe for production due to passive leakage channels.

## PRIV-2 (Medium) — Session token persisted in `localStorage`

Frontend auth logic stores/retrieves token from localStorage.

**Risk model:** any XSS event can escalate to session exfiltration.

### Positive controls observed

- Paperless tokens encrypted at rest in DB.
- System API token stored as hash and validated with constant-time comparison.

---

## 5) Stale Code / Quality Baseline

## Current baseline status

- `ruff check .` → **fail** (29 findings; broad excepts, unused imports/variables, non-top-level imports, unnecessary f-strings).
- `pytest -q` → **fail** (no collected tests + warnings).
- `npm --prefix frontend run lint` → **fail** (large backlog).
- `npm audit --prefix frontend --omit=dev --audit-level=high` → **could not complete** in this environment (`403` audit endpoint).

## Publish impact

A non-green baseline makes regression detection unreliable and increases audit/review cost.

---

## 6) Commenting & External Auditability

### Good

- Backend core files are generally documented with module docstrings and explanatory comments.

### Needs improvement

- Frontend documentation consistency is mixed; many components begin immediately with implementation and no short intent/contract note.

## Recommended standard (lightweight)

For non-generated frontend modules, add a brief top-of-file block with:

1. Purpose
2. Key props/state contracts
3. Side effects (API/storage/navigation)
4. Ownership domain

This materially improves third-party auditability.

---

## 7) UI/CSS Consistency Review

A central design foundation exists (tokens + shared primitives), but adoption is inconsistent.

### Signals of inconsistency

- Very high inline style usage (919 occurrences).
- Many native buttons compared with low shared-button adoption.
- One-off styling patterns across page-level components.

### Pre-publish normalization plan

1. Enforce shared primitives (`Button`, `Input`, `Dialog`, etc.) in all touched UI code.
2. Replace high-traffic native button instances first.
3. Move repeated inline styles to shared classes/tokens.
4. Add lint policy to disallow non-exempt inline styles.

---

## 8) Module Structure & Repo Hygiene

## Structural debt

- `api.py` and `database.py` are large, multi-concern modules.
- This increases blast radius and slows safe refactoring/review.

## Hygiene recommendations

1. Split API by Flask blueprints (`auth`, `rules`, `documents`, `background`, `settings`, `system`).
2. Split database access into domain repositories.
3. Introduce CI gates that must stay green (`ruff`, `pytest`, `eslint`, dependency audit).
4. Track legacy compatibility paths with explicit deprecation dates.

---

## 9) Priority Remediation Plan

## Phase 0 — Mandatory before release

1. Protect sensitive unauthenticated endpoints (rules/deleted-rules/logs/rules-test/preview).
2. Remove query-string token fallback.
3. Disable hardcoded debug mode (environment-controlled, default-off).
4. Add basic abuse controls (rate limiting/timeouts) for expensive endpoints.

## Phase 1 — Privacy hardening

1. Move session auth to secure HttpOnly cookies.
2. Add stricter CSP/security headers.
3. Verify logs never store tokens/secrets.

## Phase 2 — Quality stabilization

1. Reach green baseline for `ruff`, `pytest`, and `eslint`.
2. Reduce stale patterns and broad exception handling.
3. Add dependency vulnerability checks in CI (pip + npm).

## Phase 3 — Architecture hygiene

1. Modularize backend and reduce single-file complexity.
2. Establish contributor standards for comments and design-system usage.

---

## 10) Commands Executed

- `python` scan scripts for route/decorator and frontend style/component metrics.
- `ruff check .`
- `pytest -q`
- `npm --prefix frontend run lint`
- `npm audit --prefix frontend --omit=dev --audit-level=high`

---

## 11) Final Statement

**Do not publish this build yet.**  
Close Phase 0 blockers first, then restore a green quality baseline before release candidate tagging.
