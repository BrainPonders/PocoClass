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
   Build arg `BUILD_NUMBER` is set from git commit count.
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

# DEVELOPMENT

Maintainer / Developer Docker Workflow

This document defines the official maintainer workflow for building and testing PocoClass locally using Docker.

It is intentionally separate from end-user deployment instructions, which live exclusively in `/README.md` to avoid duplication and drift.

This document also serves as a reusable workflow blueprint for other projects following the same Docker-based development model.

---

# 1. Scope

This workflow is designed for:

- Building development images from any Git branch.
- Running an isolated local development container.
- Testing fixes before merging into `main`.
- Ensuring runtime configuration persists across rebuilds.

It is NOT intended for:

- End-user deployment.
- Production image publishing.
- CI/CD pipelines (covered separately in release documentation).

---

# 2. Design Principles

The development workflow follows these principles:

1. Source-controlled templates, runtime-controlled configuration.
2. No secrets inside the repository.
3. Rebuilds must be deterministic and branch-aware.
4. Runtime directory must survive repository resets.
5. One command must rebuild and restart the development container.

The workflow is intentionally image-centric. Development is validated using the same Docker environment that will be used for release.

---

# 3. Repository Structure (Relevant to Development)

Templates stored in the repository:

- `/docker/compose/docker-compose.dev.yml`
- `/docker/compose/env.dev`
- `/scripts/Maintainer/dev-rebuild.sh`

These are templates only.
They are never used directly as runtime files.

---

# 4. Runtime Directory (Outside the Repository)

The development container runs from a runtime directory located outside the repository clone.

Default location:

`<repo-parent>/pococlass-dev/`

Example:

- Repository: `/home/paperless/pococlass-repo`
- Runtime: `/home/paperless/pococlass-dev`

Expected runtime structure:

- `<repo-parent>/pococlass-dev/docker-compose.yml`
- `<repo-parent>/pococlass-dev/.env`
- `<repo-parent>/pococlass-dev/data/`
- `<repo-parent>/pococlass-dev/rules/`

Why outside the repo?

- `git reset --hard` must never delete runtime data.
- Local test data must persist across rebuilds.
- Runtime config must not be committed accidentally.

---

# 5. The Single Command

From repository root:

`bash scripts/Maintainer/dev-rebuild.sh`

This command performs the full development lifecycle.

---

# 6. What dev-rebuild.sh Does

The script performs the following steps in order:

1. Synchronizes source
   - Fetches origin
   - Hard-resets to `origin/<current-branch>`
   - Optional override via `POCOCLASS_DEV_BRANCH=<branch>`

2. Cleans repository
   - Removes untracked files
   - Ensures a deterministic build state

3. Builds development image (no cache)
   - Tags:
     - `pococlass:dev-<shortsha>`
     - `pococlass:dev-latest`
   - Injects build number via `BUILD_NUMBER`
   - Uses current Git commit count

4. Prepares runtime directory
   - Creates `<repo-parent>/pococlass-dev/` if missing
   - Honors `POCOCLASS_DEV_ROOT` override

5. Initializes runtime files safely
   - Copies templates only if missing
   - Never overwrites:
     - `.env`
     - `docker-compose.yml`
   - If template changed, writes:
     - `.env.new`
     - `docker-compose.yml.new`

6. Updates runtime image reference
   - Only updates `POCOCLASS_IMAGE=` in runtime `.env`
   - Does not modify any other configuration

7. Recreates development container
   - Uses fixed compose project name: `pococlass-dev`
   - Runs from runtime directory
   - Ensures clean container recreation

---

# 7. Safety Guarantees

The development script must never:

- Overwrite runtime `.env`.
- Overwrite runtime `docker-compose.yml`.
- Write secrets into the repository.
- Modify end-user deployment files.
- Touch production containers.

All destructive Git operations are restricted to the repository clone only.

---

# 8. First-Time Setup

1. Run:
   `bash scripts/Maintainer/dev-rebuild.sh`

2. Edit runtime `.env`:
   `<repo-parent>/pococlass-dev/.env`

3. Set a valid Fernet-compatible secret key:

   `python3 -c "import os, base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"`

   or

   `python3 scripts/Maintainer/generate_secret_key.py`

4. Run the rebuild command again.

5. Ensure directory permissions match the container user (11notes default UID/GID 1000).

---

# 9. Runtime Overrides

Override runtime directory:

`POCOCLASS_DEV_ROOT=/custom/path bash scripts/Maintainer/dev-rebuild.sh`

Override compose project name:

`POCOCLASS_DEV_PROJECT=my-dev-stack bash scripts/Maintainer/dev-rebuild.sh`

Override source branch:

`POCOCLASS_DEV_BRANCH=feature-branch bash scripts/Maintainer/dev-rebuild.sh`

---

# 10. Branch-Based Development Strategy

Typical workflow:

1. Create feature branch.
2. Commit fixes.
3. Run `dev-rebuild.sh` to test branch image.
4. Validate functionality in Docker.
5. Merge into `main` only after verification.

Development images are branch-specific and traceable via short SHA tag.

---

# 11. Why Development Uses Docker (Not Native Python)

PocoClass is validated in the same environment that will be released.

Benefits:

- Eliminates “works on my machine” issues.
- Matches rootless 11notes base image behavior.
- Exposes UID/GID and filesystem permission issues early.
- Validates production-like Gunicorn configuration.

Native Python testing is optional, but Docker is authoritative.

---

# 12. Standardized Workflow Pattern (Reusable for Other Projects)

This document intentionally follows a generic structure that can be reused:

- Section 1: Scope
- Section 2: Design Principles
- Section 3: Repository Templates
- Section 4: Runtime Layout
- Section 5–6: Rebuild Mechanism
- Section 7: Safety Rules
- Section 8–9: Setup and Overrides
- Section 10: Branch Strategy
- Section 11: Environment Philosophy

Future projects should replicate this structure with project-specific naming.

---

# END OF DOCUMENT