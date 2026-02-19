# Implementation Tracker

This file is a compact status tracker.  
Runbooks and execution steps live in `distribution/`.

## Current Status

1. Dev workflow is centralized in:
   - `distribution/dev-build.sh`
   - `distribution/dev-rebuild.md`
2. Release workflow is centralized in:
   - `distribution/release.sh` (local fallback/preflight)
   - `distribution/releasing.md` (maintainer runbook)
   - `.github/workflows/release-image.yml` (publish path)
3. Build assets are centralized in:
   - `distribution/docker-build/`
4. Test notes/artifacts are centralized in:
   - `distribution/test/`

## Active Roadmap / TODO

1. Validate release workflow reliability after distribution path migration.
2. Decide if `distribution/release.sh` remains supported long-term or CI-only release is enforced.
3. Keep root `README.md` and `distribution` docs synchronized after future workflow changes.
4. Keep architecture and admin docs synchronized with any API/auth model updates.

## Design Deviations

1. Dev runtime file uses `docker-compose.yml` (not `docker-compose.dev.yml`) in the runtime folder for easier day-2 operations.
2. Release tags intentionally avoid `latest` and use `develop`, `rc`, and immutable final version tags.

## Notes

1. Keep secrets out of repository-tracked files.
2. This file should remain concise and status-only.
