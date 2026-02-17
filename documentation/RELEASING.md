# RELEASING

This document defines the Docker image release workflow for maintainers.

## Scope

- Build release-ready images from repository source.
- Tag images predictably.
- Keep runtime secrets and local deployment overrides out of git.

## Script

Use:

- `bash scripts/Maintainer/release.sh`

## Inputs

Optional environment variables:

- `POCOCLASS_IMAGE_NAME` (default: `pococlass`)
- `POCOCLASS_IMAGE_TAG` (default: `latest`)
- `POCOCLASS_BUILD_NUMBER` (default: git short hash)

## Script Behavior

1. Validates Docker availability.
2. Builds image from `/docker/Dockerfile` with `--no-cache`.
3. Applies tags:
   - `<image_name>:<image_tag>`
   - `<image_name>:build-<build_number>`

## Suggested Tagging Policy

- Stable release: `vX.Y.Z`
- Optional rolling tag: `latest`
- Traceability tag: `build-<build_number>`

## Example

- `POCOCLASS_IMAGE_NAME=ghcr.io/<org>/pococlass POCOCLASS_IMAGE_TAG=v2.0.0 POCOCLASS_BUILD_NUMBER=v2.0.0 bash scripts/Maintainer/release.sh`

## Publishing

`release.sh` builds and tags locally. Push to your registry with your standard CI/CD or manual push command.

## End-User Deployment Boundary

End users should deploy only with:

- `/docker/compose/docker-compose.bridge.yml`
- `/docker/compose/docker-compose.host.yml`
- `/docker/compose/env.example`
- instructions in `/README.md`

Do not require end users to run release scripts.
