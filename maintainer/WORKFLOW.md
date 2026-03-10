# WORKFLOW

Project-specific maintainer workflow for PocoClass.

This file is the tracked operational version of the workflow. It is intentionally
short and execution-oriented. Broader personal standards, rationale, and reusable
principles belong in the local-only `.local/` area and must not be committed.

## 1. Scope

This workflow covers:

- local development rebuilds
- local container validation
- release tagging
- GitHub image publishing
- GitHub release creation
- public version reference updates

It does not cover:

- end-user deployment instructions
- architecture design history
- personal notes or reusable template authoring

## 2. Lifecycle

1. Work on a branch.
2. Rebuild locally with `maintainer/development/dev-build.sh`.
3. Validate locally.
4. Merge to `main`.
5. Create one of:
   - `vX.Y.Z-dev.N`
   - `vX.Y.Z-rc.N`
   - `vX.Y.Z`
6. Let GitHub Actions publish the amd64 image and, when applicable, create GitHub releases.

## 3. Local Development

Entry point:

- `bash maintainer/development/dev-build.sh`

The script:

- syncs the repo to the remote branch
- rebuilds the image without cache
- assigns:
  - release version: `vX.Y.Z-dev.N`
  - build number: Git commit count
- updates only `POCOCLASS_IMAGE=` in the runtime `.env`
- recreates the dev container using fixed project name `pococlass-dev`

## 4. Release Model

- Dev:
  - `vX.Y.Z-dev.N`
  - image publish only
- RC:
  - `vX.Y.Z-rc.N`
  - amd64 image publish + GitHub prerelease
- Stable:
  - `vX.Y.Z`
  - amd64 image publish + GitHub release

The runtime base image for released containers is:

- `11notes/python:3.13`

## 5. Public Version References

The main release workflow updates:

- `README.md` `Available Versions`
- `README.md` install `.env` example
- `docker/compose/.env.example`

## 6. Safety Rules

- `.local/` is fully local-only and must never be committed.
- Personal runbooks, template drafts, and scratch files belong in `.local/`.
- The tracked maintainer docs must stay project-specific and concise.
- End-user documentation stays in the root `README.md`.
