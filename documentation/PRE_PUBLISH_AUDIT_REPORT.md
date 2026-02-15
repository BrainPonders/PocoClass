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

