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
# Pre-Publish Audit Report (Deep Scan)

**Project:** PocoClass  
**Audit Date:** 2026-02-15  
**Scope:** Backend API, auth/session model, storage/privacy controls, frontend UX consistency, maintainability, repository hygiene.

---

## 1) Executive Summary

This deep re-scan confirms that the codebase has strong foundational building blocks (token encryption at rest, documented backend modules, UI token system), but it is **not publication-ready** until several auth/privacy issues are fixed.

### Publish gate status

- **Security gate:** ❌ Fails (critical unauthenticated API surface remains).
- **Privacy gate:** ⚠️ At risk (URL token fallback + localStorage session token model).
- **Code hygiene gate:** ⚠️ Partial pass (many lint-level stale code findings and monolithic files).
- **UI consistency gate:** ⚠️ Partial pass (design system exists but mixed with ad-hoc button/style patterns).
- **Auditability gate:** ⚠️ Partial pass (Python is well-documented; frontend has mixed documentation coverage).

---

## 2) High-Risk Findings (must fix before publishing)

## CRITICAL-01 — Unauthenticated rule management endpoints

Rule CRUD and rule metadata endpoints are exposed without `@require_auth` / `@require_admin` guards:

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

Evidence: route declarations exist without security decorators in these ranges.  
Impact: anonymous users can read/write/delete classification logic and influence downstream processing.  
Risk: **Critical**.  
References: `api.py`.【F:api.py†L1432-L1499】【F:api.py†L1787-L1883】

### CRITICAL-02 — Unauthenticated deleted-rules and logs endpoints

The following endpoints are also public:

- `GET /api/deleted-rules`
- `DELETE /api/deleted-rules/<rule_id>`
- `GET /api/logs`

Impact: unauthorized users can inspect deleted rule content and operational logs, and permanently remove deleted rules.  
Risk: **Critical**.  
References: `api.py`.【F:api.py†L1887-L1936】【F:api.py†L1940-L1967】

### HIGH-01 — Rule test endpoint unauthenticated

`POST /api/rules/test` lacks auth decorators.

Impact: abuse vector for compute amplification, behavior probing, and possible data inference from rule response mechanics.  
Risk: **High**.  
References: `api.py`.【F:api.py†L2485-L2541】

### HIGH-02 — Debug mode hard-enabled in runtime entrypoint

Application startup uses `debug=True` unconditionally.

Impact: increased attack surface and dangerous misconfiguration risk in non-dev deployment contexts.  
Risk: **High**.  
References: `api.py`.【F:api.py†L3095-L3096】

---

## 3) Privacy & Sensitive Data Findings

### HIGH-PRIV-01 — Session token allowed via URL query parameter

Preview endpoint accepts bearer-equivalent token via query string (`?token=`) when header is absent.

Impact: token leakage through browser history, logs, referers, copy/paste links, and shared screenshots.  
Risk: **High**.  
References: `api.py`.【F:api.py†L2141-L2149】

### MED-PRIV-02 — Frontend stores session token in `localStorage`

Client auth helper reads/writes session token in localStorage.

Impact: any successful XSS gives direct access to long-lived session token material.  
Risk: **Medium** (becomes High if XSS exists).  
References: `frontend/src/api/auth.js`.【F:frontend/src/api/auth.js†L29-L31】【F:frontend/src/api/auth.js†L104-L106】

### POSITIVE NOTE — Token protection at rest exists server-side

Backend stores encrypted Paperless tokens and hashes system API tokens, with compare-digest verification.

Security value: reduces data-at-rest disclosure impact.  
References: `database.py`.【F:database.py†L14-L16】【F:database.py†L489-L513】【F:database.py†L657-L675】

---

## 4) Stale Code / Maintainability Findings

A lint scan (`ruff check .`) reports stale and hygiene issues affecting readability and long-term maintainability:

- unused imports (e.g., `json` in `api.py`, `Path` in `database.py`),
- unused local variables (`paperless_id_map`),
- broad/bare `except:` blocks,
- module import placed in middle of file (`background_processor` import in `api.py`),
- unnecessary `f` prefixes on plain strings.

References showing representative stale patterns: `api.py`, `database.py`, `api_client.py`, `background_processor.py`.【F:api.py†L33-L35】【F:api.py†L624-L625】【F:api.py†L2074-L2077】【F:api.py†L2654-L2657】【F:database.py†L27-L29】【F:api_client.py†L58-L60】【F:background_processor.py†L22-L24】

### Legacy compatibility debt remains visible

Multiple areas explicitly retain legacy behavior/format handling.

Assessment: acceptable short-term, but should be tracked and eventually retired to simplify logic paths.  
References: `api.py`.【F:api.py†L1544-L1553】【F:api.py†L1990-L1999】【F:api.py†L2453-L2459】

---

## 5) Commenting / Auditability Review

### Backend Python modules: generally good

Core backend modules are heavily documented with top-level context and function/class docstrings, which helps external auditors.

References: module headers and route-group docs in `api.py`, architecture docs in `database.py`.【F:api.py†L1-L28】【F:database.py†L1-L21】

### Frontend: mixed documentation depth

Some key helper modules have rich header comments, but many UI files (including component library wrappers) have no top-of-file context comments.

- documented example: auth helper header.
- undocumented pattern example: UI button component starts directly with imports.

References: `frontend/src/api/auth.js`, `frontend/src/components/ui/button.jsx`.【F:frontend/src/api/auth.js†L1-L7】【F:frontend/src/components/ui/button.jsx†L1-L8】

**Recommendation:** for publish/audit readiness, require short header comments for non-generated frontend files that explain purpose, ownership, and side effects.

---

## 6) CSS / UI Consistency Review

The project has a clear design foundation (Tailwind tokens + CSS variables + reusable button variants), but implementation is inconsistent across screens.

### Strengths

- centralized theme tokens and color variables defined in `index.css`.
- reusable variant-driven button component exists (`buttonVariants`).

References: `frontend/src/index.css`, `frontend/src/components/ui/button.jsx`.【F:frontend/src/index.css†L57-L101】【F:frontend/src/index.css†L128-L167】【F:frontend/src/components/ui/button.jsx†L7-L34】

### Inconsistency hotspots

- many direct `<button>` usages with ad-hoc classes and inline style objects.
- manual style blocks with hardcoded fallbacks are common in tutorial and rule editor flows.

References: `frontend/src/pages/RuleEditor.jsx`, `frontend/src/components/tutorial/TutorialTooltip.jsx`.【F:frontend/src/pages/RuleEditor.jsx†L655-L681】【F:frontend/src/pages/RuleEditor.jsx†L703-L712】【F:frontend/src/components/tutorial/TutorialTooltip.jsx†L103-L117】【F:frontend/src/components/tutorial/TutorialTooltip.jsx†L131-L173】

**Recommendation:** standardize on a single button API (`ui/button`) and move repeated inline style fragments into shared utility classes/components.

---

## 7) Module Structure & Repository Hygiene

### Structural observations

- `api.py` is a large multi-domain module containing routing, auth decorators, conversion helpers, YAML generation, and startup logic in one file.
- `database.py` also centralizes many concerns (sessions, config, cache sync, logs, settings, history).

References: breadth of route groups in `api.py` header and spread through file; broad multi-concern DB layer in `database.py`.【F:api.py†L5-L22】【F:api.py†L3037-L3096】【F:database.py†L3-L12】【F:database.py†L657-L767】【F:database.py†L1666-L1743】

### Hygiene recommendation

A pre-publish cleanup is advisable:

1. Split `api.py` into Flask blueprints (`auth`, `rules`, `documents`, `background`, `settings`).
2. Separate DB concerns into domain repositories/services.
3. Introduce CI quality gates: `ruff`, `pytest`, `eslint`.
4. Track and sunset legacy pathways with explicit deprecation milestones.

---

## 8) Prioritized Remediation Plan

## Phase 0 (Blocker — before publish)

1. Enforce auth/admin decorators on rules, deleted-rules, logs, and rule-test endpoints.
2. Disable unconditional debug mode.
3. Remove query-token auth fallback from preview endpoint.

## Phase 1 (Privacy hardening)

1. Replace localStorage session token model with secure HttpOnly session cookie strategy.
2. Add stricter CSP and security headers at Flask edge.

## Phase 2 (Hygiene + auditability)

1. Resolve lint findings (`ruff check .` clean).
2. Standardize button and inline-style usage.
3. Add frontend file-level purpose headers for key app modules.

## Phase 3 (Architecture cleanup)

1. Modularize backend routes/services.
2. Add automated dependency security scanning in CI for both pip/npm ecosystems.

---

## 9) Commands Used During This Audit

- `ruff check .`
- `pytest -q`
- `npm audit --prefix frontend --omit=dev --audit-level=high`
- `rg -n "@app.route\(" api.py`
- `nl -ba api.py | sed -n '1430,1905p'`
- `nl -ba api.py | sed -n '1885,2228p'`
- `nl -ba api.py | sed -n '2468,2575p'`
- `nl -ba api.py | sed -n '2880,3098p'`
- `nl -ba frontend/src/api/auth.js | sed -n '20,120p'`
- `nl -ba frontend/src/components/ui/button.jsx | sed -n '1,140p'`
- `nl -ba frontend/src/pages/RuleEditor.jsx | sed -n '640,715p'`
- `nl -ba frontend/src/components/tutorial/TutorialTooltip.jsx | sed -n '90,180p'`

