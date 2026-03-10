# Distribution Overview

This folder contains maintainer-facing build and release assets.

## Quick Flow

1. Develop and test locally:
   - Script: `distribution/dev-build.sh`
   - Guide: `distribution/dev-rebuild.md`
2. Prepare and publish release tags:
   - Guide: `distribution/releasing.md`
   - Local fallback script: `distribution/release.sh`
   - CI workflow: `.github/workflows/release-image.yml`
3. Build image definition:
   - `distribution/docker-build/Dockerfile`
   - `distribution/docker-build/docker-entrypoint.sh`
   - `distribution/docker-build/.dockerignore`
4. Test notes and audit artifacts:
   - `distribution/test/`

## Boundaries

1. End-user deployment instructions remain in root `README.md`.
2. Architecture and integration behavior remain in `documentation/Architecture reference.md`.
3. This folder is for maintainer workflow, not runtime user data.

## Version Model

- Dev: `vX.Y.Z-dev.N`
- RC: `vX.Y.Z-rc.N`
- Stable: `vX.Y.Z`
- Build number is separate and displayed in the UI as `(build N)`.
