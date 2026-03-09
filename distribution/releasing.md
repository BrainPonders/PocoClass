# RELEASING

This is the maintainer runbook for publishing PocoClass Docker images for end users.

- Why: reproducible, multi-arch (`amd64` + `arm64`) releases.
- How: push a release tag, GitHub Actions builds and publishes to GHCR.
- What users deploy: immutable image tags in their `.env` (`POCOCLASS_IMAGE=...`).

## Overview: Steps to Release

1. Complete local development and testing with `bash distribution/dev-build.sh` (see `distribution/dev-rebuild.md`).
2. Choose release tag type:
   - Develop: `2.1-develop`
   - RC: `2.1.0-rc.1`
   - Final: `2.1.0`
3. Create and push the tag to GitHub.
4. Wait for GitHub Action `Release Docker Image` to complete.
5. Verify image manifest in GHCR (`docker buildx imagetools inspect ...`).
6. Share the immutable image tag for deployment (`POCOCLASS_IMAGE=ghcr.io/<owner>/pococlass:<tag>`).

## Tag Model

Use only these source tags:

- Develop channel (rolling): `<major>.<minor>-develop` (example: `2.1-develop`)
- Public RC channel: `<major>.<minor>.<patch>-rc.<n>` (example: `2.1.0-rc.1`)
- Final release: `<major>.<minor>.<patch>` (example: `2.1.0`)

Do not use `latest`.

## Which Workflow To Use

- Multi-arch (default): `.github/workflows/release-image.yml`
  - Builds `linux/amd64` + `linux/arm64`
  - Use normal tags: `2.1-develop`, `2.1.0-rc.1`, `2.1.0`
- amd64-only: `.github/workflows/release-image-amd64.yml`
  - Builds only `linux/amd64`
  - Use amd64 tags: `2.1-develop-amd64`, `2.1.0-rc.1-amd64`, `2.1.0-amd64`
  - Or run manually in GitHub Actions (`workflow_dispatch`) with input:
    - `2.1-develop`, `2.1.0-rc.1`, `2.1.0`

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

- Develop: `2.1-develop`
- RC: `2.1.0-rc.1`
- Final: `2.1.0`

### 3) Create and push tag

Final:

```bash
git tag -a 2.1.0 -m "Release 2.1.0"
git push origin 2.1.0
```

RC:

```bash
git tag -a 2.1.0-rc.1 -m "Release candidate 2.1.0-rc.1"
git push origin 2.1.0-rc.1
```

Develop (rolling tag):

```bash
git tag -fa 2.1-develop -m "Develop channel 2.1"
git push -f origin 2.1-develop
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
