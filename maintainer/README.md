# Maintainer Overview

This folder contains the maintained workflow for building, testing, and releasing PocoClass.

## Quick Flow

1. Develop and test locally:
   - Script: `maintainer/development/dev-build.sh`
   - Guide: `maintainer/development/README.md`
2. Prepare and publish release tags:
   - Guide: `maintainer/release/README.md`
   - Local fallback script: `maintainer/release/release.sh`
   - CI workflow: `.github/workflows/release-image.yml`
3. Build image definition:
   - `maintainer/docker/Dockerfile`
   - `maintainer/docker/docker-entrypoint.sh`
   - `maintainer/docker/.dockerignore`
4. Test notes and audit artifacts:
   - `maintainer/test/`
5. Project workflow summary:
   - `maintainer/WORKFLOW.md`

## Boundaries

1. End-user deployment instructions remain in root `README.md`.
2. Architecture and integration behavior remain in `documentation/Architecture reference.md`.
3. `.local/` is the local-only safety bucket for personal runbooks, templates, and scratch material.
4. This folder is for tracked maintainer workflow, not runtime user data or personal notes.

## Version Model

- Dev: `vX.Y.Z-dev.N`
- RC: `vX.Y.Z-rc.N`
- Stable: `vX.Y.Z`
- Build number is separate and displayed in the UI as `(build N)`.
