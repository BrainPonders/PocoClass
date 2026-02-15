# Pre-publish Audit Report (PocoClass)

## Scope
This audit was executed to validate release readiness after major updates, with emphasis on:
- Static quality checks (Python and frontend tooling)
- Code consistency and stale code detection
- CSS inefficiency/staleness review
- Test discoverability and runtime sanity checks

## Checks run

| Area | Command | Result | Notes |
|---|---|---|---|
| Python syntax/runtime sanity | `python -m compileall -q .` | ✅ Pass | No syntax compilation errors. |
| Python linting | `ruff check . --fix` then `ruff check .` | ⚠️ Partial | 21 issues auto-fixed; 8 remain in `api.py` (bare `except`, unused local, import position). |
| Python tests | `pytest -q` | ⚠️ Warning | No tests collected (exit code 5); warnings indicate discoverability/structure issues. |
| Frontend lint | `npm --prefix frontend run lint` | ⚠️ Blocked | Missing installed dependency resolution (`@eslint/js`) in environment setup. |
| Frontend build | `npm --prefix frontend run build` | ⚠️ Blocked | `vite` binary unavailable because frontend dependencies are not fully installed. |
| CSS stale selector scan | custom script scanning `frontend/src/App.css` against JSX usage | ⚠️ Finding | Multiple selectors appear unused. |

## Automated cleanups applied

### Python cleanup (safe autofixes)
`ruff --fix` removed low-risk issues such as:
- Unused imports
- Redundant f-strings without interpolation

These changes were applied in:
- `api.py`
- `api_client.py`
- `background_processor.py`
- `config.py`
- `database.py`
- `metadata_processor.py`
- `scoring_calculator_v2.py`
- `sync_service.py`
- `test_engine.py`

### Frontend stale CSS cleanup
- Removed the large, commented-out Vite starter CSS block from `frontend/src/index.css` to reduce stale/dead stylesheet noise.

## Code inspection findings

### 1) Remaining Python lint defects in `api.py` (should fix before release)
1. Bare `except` blocks at multiple locations reduce debuggability and can hide non-recoverable exceptions.
2. One unused local (`paperless_id_map`) indicates possible stale/refactored logic path.
3. Mid-file import (`BackgroundProcessor`) violates module structure consistency and can complicate import-time behavior.

**Recommendation:** prioritize these 8 remaining findings before publish; they are concentrated and high signal.

### 2) Test suite discoverability issues
`pytest` reports:
- No collected tests
- `TestEngine` class cannot be collected due to custom `__init__`

**Risk:** release confidence is low because automated regression coverage is effectively absent.

**Recommendation:**
- Convert `test_engine.py` into discoverable pytest tests (fixtures + `test_*` functions/methods).
- Add at least smoke tests for key API endpoints and rule/scoring behavior.

### 3) CSS stale selectors / potential inefficiency
Selectors currently defined in `frontend/src/App.css` but not referenced in `frontend/src` (based on static grep):
- `.form-input`
- `.form-select`
- `.form-textarea`
- `.login-form-input`
- `.setup-form-input`
- `.tutorial-highlight`

**Recommendation:** verify whether these classes are generated dynamically. If not, remove them to keep CSS lean and reduce maintenance overhead.

### 4) Frontend toolchain reproducibility gap
Frontend checks failed because dependencies are not reliably present in this environment, preventing lint/build validation.

**Recommendation:**
- Enforce reproducible install via lockfile + CI (`npm ci`, then lint/build).
- Add a release gate requiring successful frontend lint + build.

## Pre-publish go/no-go criteria
Before publishing, require all of the following:
1. `ruff check .` returns clean (0 issues).
2. At least one meaningful pytest suite runs (non-zero tests collected).
3. Frontend `npm ci && npm run lint && npm run build` passes in CI.
4. Confirm stale CSS selectors are either removed or intentionally documented.

## Suggested next actions (order)
1. Fix remaining `api.py` lint items (small, high-impact).
2. Make tests discoverable and add smoke coverage.
3. Stabilize frontend dependency install path and enforce CI checks.
4. Prune confirmed unused CSS selectors in `App.css`.
