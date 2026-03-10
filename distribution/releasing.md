# RELEASING

This is the maintainer runbook for publishing PocoClass Docker images for end users.

- Why: reproducible, multi-arch (`amd64` + `arm64`) releases.
- How: push a release tag, GitHub Actions builds and publishes to GHCR.
- What users deploy: immutable image tags in their `.env` (`POCOCLASS_IMAGE=...`).

## Overview: Steps to Release

1. Complete local development and testing with `bash distribution/dev-build.sh` (see `distribution/dev-rebuild.md`).
2. Choose release tag type:
   - Dev: `v2.0.0-dev.b34`
   - RC: `v2.0.0-rc.1`
   - Final: `v2.0.0`
3. Create and push the tag to GitHub.
4. Wait for GitHub Action `Release Docker Image` to complete.
5. Verify image manifest in GHCR (`docker buildx imagetools inspect ...`).
6. Share the immutable image tag for deployment (`POCOCLASS_IMAGE=ghcr.io/<owner>/pococlass:<tag>`).

## Tag Model

Use only these source tags:

- Dev channel (testing): `v<major>.<minor>.<patch>-dev.b<build>` (example: `v2.0.0-dev.b34`)
- Public RC channel: `v<major>.<minor>.<patch>-rc.<n>` (example: `v2.0.0-rc.1`)
- Final release: `v<major>.<minor>.<patch>` (example: `v2.0.0`)

Do not use `latest`.

## Which Workflow To Use

- Multi-arch (default): `.github/workflows/release-image.yml`
  - Builds `linux/amd64` + `linux/arm64`
  - Use normal tags: `v2.0.0-dev.b34`, `v2.0.0-rc.1`, `v2.0.0`
- amd64-only: `.github/workflows/release-image-amd64.yml`
  - Builds only `linux/amd64`
  - Use amd64 tags: `v2.0.0-dev.b34-amd64`, `v2.0.0-rc.1-amd64`, `v2.0.0-amd64`
  - Or run manually in GitHub Actions (`workflow_dispatch`) with input:
    - `v2.0.0-dev.b34`, `v2.0.0-rc.1`, `v2.0.0`

## One-Time Setup

1. Ensure GitHub Actions is enabled for the repository.
2. Ensure package publishing to GHCR is allowed.
3. Use workflow file: `.github/workflows/release-image.yml`.

The workflow uses `GITHUB_TOKEN` with:

- `contents: read`
- `packages: write`

## Execution (A-Z)

### 1) Develop and test locally

```bash
bash distribution/dev-build.sh
```

### 2) Choose release channel and tag

- Dev: `v2.1.0-dev.b34`
- RC: `v2.1.0-rc.1`
- Final: `v2.1.0`

### 3) Create and push tag

Final:

```bash
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin v2.1.0
```

RC:

```bash
git tag -a v2.1.0-rc.1 -m "Release candidate v2.1.0-rc.1"
git push origin v2.1.0-rc.1
```

Dev:

```bash
git tag -a v2.1.0-dev.b34 -m "Development release v2.1.0-dev.b34"
git push origin v2.1.0-dev.b34
```

### 4) Wait for workflow publish

GitHub Action `Release Docker Image` will publish:

- `ghcr.io/<owner>/pococlass:<source_tag>`
- `ghcr.io/<owner>/pococlass:build-<build_number>`
- `ghcr.io/<owner>/pococlass:sha-<short_sha>`
- Develop only: `ghcr.io/<owner>/pococlass:<source_tag>-build-<build_number>`

`build_number` is passed as `BUILD_NUMBER` and appears in the PocoClass UI build field.

### 5) Verify published image

```bash
docker buildx imagetools inspect ghcr.io/<owner>/pococlass:2.1.0
```

Check that both platforms exist:

- `linux/amd64`
- `linux/arm64`

### 6) Tell users what to deploy

Users pin immutable tags:

```env
POCOCLASS_IMAGE=ghcr.io/<owner>/pococlass:2.1.0
```

Then they deploy as usual:

```bash
docker compose pull pococlass
docker compose up -d --force-recreate pococlass
```

## Local Fallback Build (No Publish)

Use this only for local release simulation:

```bash
POCOCLASS_IMAGE_NAME=pococlass \
POCOCLASS_IMAGE_TAG=2.1.0-rc.1 \
bash distribution/release.sh
```

`release.sh` now enforces the same tag policy as GitHub workflow and adds trace tags:

- `<image>:<source_tag>`
- `<image>:build-<build_number>`
- `<image>:sha-<short_sha>`

## End-User Deployment Boundary

End users should only use:

- `docker/compose/docker-compose.yml.example`
- `docker/compose/.env.example`
- README deployment instructions
