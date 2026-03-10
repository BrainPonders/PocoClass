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
5. End-user installation is being narrowed to:
   - official Paperless Docker Compose
   - bridge mode as the primary documented path
6. Version reporting and update notification now use a single backend health payload.

## Active Roadmap / TODO

1. Finalize the lean official-Paperless bridge installation flow in `README.md`.
2. Decide how 11notes installation will be documented after the official path is stable.
3. Validate release workflow reliability after distribution path migration.
4. Decide if `distribution/release.sh` remains supported long-term or CI-only release is enforced.
5. Keep root `README.md` and `distribution` docs synchronized after future workflow changes.
6. Keep architecture and admin docs synchronized with any API/auth model updates.
7. Document optional update-check environment variables if they become part of public deployment guidance.

## Design Deviations

1. Dev runtime file uses `docker-compose.yml` (not `docker-compose.dev.yml`) in the runtime folder for easier day-2 operations.
2. Release tags intentionally avoid `latest` and use `vX.Y.Z-dev.bN`, `vX.Y.Z-rc.N`, and immutable final `vX.Y.Z` tags.

## Notes

1. Keep secrets out of repository-tracked files.
2. This file should remain concise and status-only.
