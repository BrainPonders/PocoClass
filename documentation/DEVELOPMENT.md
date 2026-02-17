# DEVELOPMENT

This document defines the maintainer/developer Docker workflow.

End-user deployment instructions live only in `/README.md`.

## Goals

- One command to sync source, build, and run local dev container.
- Keep local runtime configuration persistent across updates.
- Keep templates versioned in the repository.

## Repository Templates

- `/docker/compose/docker-compose.dev.yml`
- `/docker/compose/env.dev`

These files are templates, not your live runtime files.

## Runtime Folder (outside repo clone)

Default runtime directory:

- `<repo-parent>/pococlass-dev/`

Example:

- Repo: `/home/paperless/pococlass-repo`
- Runtime: `/home/paperless/pococlass-dev`

Expected runtime files/folders:

- `<repo-parent>/pococlass-dev/docker-compose.yml`
- `<repo-parent>/pococlass-dev/.env`
- `<repo-parent>/pococlass-dev/data/`
- `<repo-parent>/pococlass-dev/rules/`

## Single Command

Run from repository root:

- `bash scripts/Maintainer/dev-rebuild.sh`

## What `dev-rebuild.sh` does

1. Fetches and hard-resets the repo to `origin/<current-branch>` by default.
   You can override this with `POCOCLASS_DEV_BRANCH=<branch>`.
2. Cleans untracked files from the repository checkout.
3. Builds a no-cache image tagged as:
   - `pococlass:dev-<shortsha>`
   - `pococlass:dev-latest`
4. Ensures `<repo-parent>/pococlass-dev/` exists (or `POCOCLASS_DEV_ROOT` if set).
5. Copies templates to runtime folder only if missing.
6. If templates changed, writes non-destructive update files:
   - `.env.new`
   - `docker-compose.yml.new`
7. Updates only `POCOCLASS_IMAGE=` in runtime `.env`.
8. Starts/recreates `pococlass` from runtime folder with fixed compose project name `pococlass-dev`.

## Safety Rules

The script must not:

- Overwrite runtime `.env`.
- Overwrite runtime `docker-compose.yml`.
- Touch end-user deployment files.
- Write secrets into the repository.

## First Run Checklist

1. Run `bash scripts/Maintainer/dev-rebuild.sh`.
2. Edit `<repo-parent>/pococlass-dev/.env`.
3. Set `POCOCLASS_SECRET_KEY` (Fernet-compatible key), for example:
   - `python3 -c "import os, base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"`
   - or `python3 scripts/Maintainer/generate_secret_key.py`
4. Run `bash scripts/Maintainer/dev-rebuild.sh` again.

## Optional Runtime Override

Set a custom runtime directory:

- `POCOCLASS_DEV_ROOT=/custom/path bash scripts/Maintainer/dev-rebuild.sh`

Set a custom compose project name:

- `POCOCLASS_DEV_PROJECT=my-dev-stack bash scripts/Maintainer/dev-rebuild.sh`

Set a custom source branch:

- `POCOCLASS_DEV_BRANCH=Docker-deploy bash scripts/Maintainer/dev-rebuild.sh`
