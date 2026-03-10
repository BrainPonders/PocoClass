# RELEASING

Maintainer quick reference for publishing PocoClass Docker images.

## 1. Principles

- Release images are built by GitHub Actions from `maintainer/docker/Dockerfile`.
- The runtime base image is `11notes/python:3.13`.
- Release identity is the tag:
  - dev: `vX.Y.Z-dev.N`
  - rc: `vX.Y.Z-rc.N`
  - stable: `vX.Y.Z`
- Build number is separate from the release tag:
  - derived from Git commit count
  - shown in the UI as `(build N)`
- End users should deploy immutable tags, not `latest`.

## 2. Release Files

- Local helper: `maintainer/release/release.sh`
- Main workflow: `.github/workflows/release-image.yml`
- amd64-only workflow: `.github/workflows/release-image-amd64.yml`

## 3. Local Preflight

Before tagging a release:

1. Rebuild locally:
   - `bash maintainer/development/dev-build.sh`
2. Test the running container.
3. Confirm the UI shows the expected:
   - version
   - build number
   - update status label

## 4. Tag Model

Use only these tag formats:

- Dev: `v2.0.0-dev.1`
- RC: `v2.0.0-rc.1`
- Stable: `v2.0.0`

amd64-only tags add `-amd64`:

- `v2.0.0-dev.1-amd64`
- `v2.0.0-rc.1-amd64`
- `v2.0.0-amd64`

## 5. Release Execution

### Multi-arch release

Stable:

- `git tag -a v2.0.0 -m "Release v2.0.0"`
- `git push origin v2.0.0`

RC:

- `git tag -a v2.0.0-rc.1 -m "Release candidate v2.0.0-rc.1"`
- `git push origin v2.0.0-rc.1`

Dev:

- `git tag -a v2.0.0-dev.1 -m "Development release v2.0.0-dev.1"`
- `git push origin v2.0.0-dev.1`

### amd64-only release

- `git tag -a v2.0.0-rc.1-amd64 -m "amd64 release v2.0.0-rc.1"`
- `git push origin v2.0.0-rc.1-amd64`

## 6. What GitHub Publishes

For each release tag, the workflow publishes:

- `ghcr.io/<owner>/pococlass:<source_tag>`
- `ghcr.io/<owner>/pococlass:build-<build_number>`
- `ghcr.io/<owner>/pococlass:sha-<short_sha>`

For the main multi-arch workflow:

- `dev` tags publish container images only
- `rc` tags also create a GitHub prerelease
- `stable` tags also create a normal GitHub release

The multi-arch release workflow also updates the generated version references
when the release tag is created from the default branch:

- `README.md` `Available Versions`
- `README.md` installation `.env` example
- `docker/compose/.env.example`

## 7. Local Fallback Build

Use this only for local release simulation:

- `POCOCLASS_IMAGE_NAME=pococlass POCOCLASS_IMAGE_TAG=v2.0.0-rc.1 bash maintainer/release/release.sh`

## 8. What Users Should Deploy

End users should pin the immutable release tag in their `.env`:

- `POCOCLASS_IMAGE=ghcr.io/<owner>/pococlass:v2.0.0`
