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


# 11. High-Level Architecture Diagram

The development workflow is built around three layers: repository source, a persistent runtime folder outside the repo, and the running Docker container(s).

Diagram (conceptual):

  [GitHub / origin/<branch>]
            |
            v
  [Repo clone: pococlass-repo]
    - templates: docker-compose.dev.yml, env.dev
    - scripts: dev-rebuild.sh
            |
            |  (dev-rebuild.sh copies templates if missing;
            |   writes *.new files if templates changed)
            v
  [Runtime dir: <repo-parent>/pococlass-dev]
    - docker-compose.yml
    - .env
    - data/      (SQLite DB, settings)
    - rules/     (YAML rules)
            |
            |  (docker compose up -d --force-recreate)
            v
  [Running container: pococlass-dev]
    - /app (backend + built frontend dist)
    - /app/data  (bind mount to runtime data/)
    - /app/rules (bind mount to runtime rules/)
    - connects to Paperless via shared Docker network

Notes:
- The repo can be safely hard-reset/cleaned because runtime state lives outside the clone.
- The container is rebuilt from source each time, but runtime configuration and data persist.

---

# 12. Why Development Uses Docker (Not Native Python)

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
# DEVELOPMENT

Maintainer / Developer Docker Workflow

This document defines the official maintainer workflow for building and testing PocoClass locally using Docker.

End-user deployment instructions live exclusively in `/README.md`.

This document also serves as a reusable blueprint for other Docker-based development workflows.

---

# 1. Scope

This workflow is designed for:

- Building development images from any Git branch.
- Running an isolated local development container.
- Testing fixes before merging into `main`.
- Ensuring runtime configuration persists across rebuilds.
- Guaranteeing deterministic, reproducible builds.

It is NOT intended for:

- End-user deployment.
- Production publishing.
- CI/CD pipelines (covered separately in release documentation).

---

# 2. Design Principles

The development workflow follows these principles:

1. Source-controlled templates, runtime-controlled configuration.
2. No secrets inside the repository.
3. Rebuilds must be deterministic and branch-aware.
4. Runtime directory must survive repository resets.
5. One command must rebuild and restart the development container.
6. Development uses the same Docker runtime model as release.

The workflow is image-centric. Docker is the authoritative validation environment.

---

# 3. Repository Structure (Development-Relevant)

Templates stored inside the repository:

- `/docker/compose/docker-compose.dev.yml`
- `/docker/compose/env.dev`
- `/scripts/Maintainer/dev-rebuild.sh`
- `/docker/Dockerfile`

These files are templates only.  
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

# 6. What dev-rebuild.sh Actually Does (Step-by-Step)

The script performs the following operations in strict order.

## 6.1 Repository Synchronization

1. Determines current branch:
   - `git rev-parse --abbrev-ref HEAD`
   - Falls back to `main` if detached.

2. Determines target branch:
   - Uses `POCOCLASS_DEV_BRANCH` if set.
   - Otherwise uses current branch.

3. Executes:
   - `git fetch origin --prune`
   - Switches to target branch.
   - Hard resets to `origin/<branch>`.
   - If remote branch does not exist, falls back to `origin/main`.
   - Executes `git clean -fdx`.

This guarantees a clean, deterministic source tree.

---

## 6.2 Build Number and Image Tagging

The script calculates:

- BUILD_NUMBER  
  `git rev-list --count HEAD`  
  (Total commit count in the current branch)

- SHORT_SHA  
  `git rev-parse --short=12 HEAD`

Image tags created:

- `pococlass:dev-<shortsha>`
- `pococlass:dev-latest`

Example:

- `pococlass:dev-b6260507725d`

Build arguments:

- `--build-arg BUILD_NUMBER=<commit_count>`

The Docker build is executed with:

- `--no-cache`
- Explicit Dockerfile path
- Explicit repository context

This guarantees no stale layers are reused.

---

## 6.3 Runtime Folder Preparation

Default runtime root:

`<repo-parent>/pococlass-dev`

Overridable via:

`POCOCLASS_DEV_ROOT=/custom/path`

The script ensures existence of:

- runtime root
- data directory
- rules directory

Legacy migration:
If `docker-compose.dev.yml` exists in runtime, it is renamed to `docker-compose.yml`.

---

## 6.4 Template Initialization (Non-Destructive)

If runtime files do not exist:

- Copy `docker-compose.dev.yml` → `docker-compose.yml`
- Copy `env.dev` → `.env`

If runtime files already exist and template differs:

- Create `.new` file:
  - `docker-compose.yml.new`
  - `.env.new`

Existing runtime files are never overwritten.

---

## 6.5 Automatic Runtime Variable Alignment

On first run only:

- `DEV_DATA_DIR` is aligned to runtime `/data`
- `DEV_RULES_DIR` is aligned to runtime `/rules`

These values are injected only when missing or during first creation.

---

## 6.6 Image Reference Update

The script updates only:

`POCOCLASS_IMAGE=<new image ref>`

in runtime `.env`.

No other runtime configuration is modified.

---

## 6.7 Container Recreation

From runtime directory, the script runs:

`docker compose -p <project> --env-file .env up -d --pull never --force-recreate pococlass`

Project name defaults to:

`pococlass-dev`

Override:

`POCOCLASS_DEV_PROJECT=my-project`

---

# 7. Safety Guarantees

The development script will NEVER:

- Overwrite runtime `.env`.
- Overwrite runtime `docker-compose.yml`.
- Modify end-user deployment files.
- Inject secrets into the repository.
- Modify production containers.
- Reuse cached Docker layers.

All destructive Git operations are restricted to the repository clone only.

---

# 8. First-Time Setup

1. Run:

   `bash scripts/Maintainer/dev-rebuild.sh`

2. Edit runtime:

   `<repo-parent>/pococlass-dev/.env`

3. Set a valid Fernet-compatible key:

   `python3 -c "import os, base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"`

4. Ensure data/rules directories are writable by container UID (11notes base image uses UID 1000).

5. Run the rebuild command again.

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
3. Run `dev-rebuild.sh`.
4. Validate in Docker.
5. Merge into `main` only after verification.
6. Delete branch after merge.

Development images are traceable via short SHA tag.

---

# 11. Why Development Uses Docker (Not Native Python)

PocoClass is validated in the same runtime model used for release.

Benefits:

- Eliminates “works on my machine” issues.
- Matches 11notes rootless behavior.
- Surfaces UID/GID permission issues early.
- Validates Gunicorn runtime config.
- Validates volume mount behavior.

Native Python execution is optional; Docker is authoritative.

---

# 13. Build Numbering Model

Build numbering is derived from Git commit count:

`BUILD_NUMBER = git rev-list --count HEAD`

This value:

- Is injected into the Docker image at build time.
- Is passed via `--build-arg BUILD_NUMBER`.
- Is displayed at container startup.
- Provides monotonic, branch-specific build tracking.

Example:

- Commit count: 626
- Short SHA: b6260507725d
- Image tag: pococlass:dev-b6260507725d
- Runtime banner: Build #626

This guarantees traceability between:

- Running container
- Image tag
- Git commit
- Source branch

No manual version bumping is required for development images.

---

# 14. Standardized Workflow Pattern (Reusable)

This document follows a reusable structure:

1. Scope
2. Principles
3. Repository Templates
4. Runtime Layout
5. Rebuild Entry Point
6. Internal Mechanics
7. Safety Model
8. First Run
9. Overrides
10. Branch Strategy
11. Runtime Philosophy
12. Build Numbering

Future Docker-based projects should follow this structure with project-specific naming.

---

# END OF DOCUMENT
# DEVELOPMENT

Maintainer / Developer Docker Workflow

This document defines the official maintainer workflow for building and testing PocoClass locally using Docker.

End-user deployment instructions live exclusively in `/README.md`.

This document also serves as a reusable blueprint for other Docker-based development workflows.

---

# 1. Scope

This workflow is designed for:

- Building development images from any Git branch.
- Running an isolated local development container.
- Testing fixes before merging into `main`.
- Ensuring runtime configuration persists across rebuilds.
- Guaranteeing deterministic, reproducible builds.

It is NOT intended for:

- End-user deployment.
- Production publishing.
- CI/CD pipelines (covered separately in release documentation).

---

# 2. Design Principles

The development workflow follows these principles:

1. Source-controlled templates, runtime-controlled configuration.
2. No secrets inside the repository.
3. Rebuilds must be deterministic and branch-aware.
4. Runtime directory must survive repository resets.
5. One command must rebuild and restart the development container.
6. Development uses the same Docker runtime model as release.

The workflow is image-centric. Docker is the authoritative validation environment.

---

# 3. Repository Structure (Development-Relevant)

Templates stored inside the repository:

- `/docker/compose/docker-compose.dev.yml`
- `/docker/compose/env.dev`
- `/scripts/Maintainer/dev-rebuild.sh`
- `/docker/Dockerfile`

These files are templates only.  
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

# 6. What dev-rebuild.sh Actually Does (Step-by-Step)

The script performs the following operations in strict order.

## 6.1 Repository Synchronization

1. Determines current branch:
   - `git rev-parse --abbrev-ref HEAD`
   - Falls back to `main` if detached.

2. Determines target branch:
   - Uses `POCOCLASS_DEV_BRANCH` if set.
   - Otherwise uses current branch.

3. Executes:
   - `git fetch origin --prune`
   - Switches to target branch.
   - Hard resets to `origin/<branch>`.
   - If remote branch does not exist, falls back to `origin/main`.
   - Executes `git clean -fdx`.

This guarantees a clean, deterministic source tree.

---

## 6.2 Build Number and Image Tagging

The script calculates:

- BUILD_NUMBER  
  `git rev-list --count HEAD`  
  (Total commit count in the current branch)

- SHORT_SHA  
  `git rev-parse --short=12 HEAD`

Image tags created:

- `pococlass:dev-<shortsha>`
- `pococlass:dev-latest`

Example:

- `pococlass:dev-b6260507725d`

Build arguments:

- `--build-arg BUILD_NUMBER=<commit_count>`

The Docker build is executed with:

- `--no-cache`
- Explicit Dockerfile path
- Explicit repository context

This guarantees no stale layers are reused.

---

## 6.3 Runtime Folder Preparation

Default runtime root:

`<repo-parent>/pococlass-dev`

Overridable via:

`POCOCLASS_DEV_ROOT=/custom/path`

The script ensures existence of:

- runtime root
- data directory
- rules directory

Legacy migration:
If `docker-compose.dev.yml` exists in runtime, it is renamed to `docker-compose.yml`.

---

## 6.4 Template Initialization (Non-Destructive)

If runtime files do not exist:

- Copy `docker-compose.dev.yml` → `docker-compose.yml`
- Copy `env.dev` → `.env`

If runtime files already exist and template differs:

- Create `.new` file:
  - `docker-compose.yml.new`
  - `.env.new`

Existing runtime files are never overwritten.

---

## 6.5 Automatic Runtime Variable Alignment

On first run only:

- `DEV_DATA_DIR` is aligned to runtime `/data`
- `DEV_RULES_DIR` is aligned to runtime `/rules`

These values are injected only when missing or during first creation.

---

## 6.6 Image Reference Update

The script updates only:

`POCOCLASS_IMAGE=<new image ref>`

in runtime `.env`.

No other runtime configuration is modified.

---

## 6.7 Container Recreation

From runtime directory, the script runs:

`docker compose -p <project> --env-file .env up -d --pull never --force-recreate pococlass`

Project name defaults to:

`pococlass-dev`

Override:

`POCOCLASS_DEV_PROJECT=my-project`

---

# 7. Safety Guarantees

The development script will NEVER:

- Overwrite runtime `.env`.
- Overwrite runtime `docker-compose.yml`.
- Modify end-user deployment files.
- Inject secrets into the repository.
- Modify production containers.
- Reuse cached Docker layers.

All destructive Git operations are restricted to the repository clone only.

---

# 8. First-Time Setup

1. Run:

   `bash scripts/Maintainer/dev-rebuild.sh`

2. Edit runtime:

   `<repo-parent>/pococlass-dev/.env`

3. Set a valid Fernet-compatible key:

   `python3 -c "import os, base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"`

4. Ensure data/rules directories are writable by container UID (11notes base image uses UID 1000).

5. Run the rebuild command again.

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
3. Run `dev-rebuild.sh`.
4. Validate in Docker.
5. Merge into `main` only after verification.
6. Delete branch after merge.

Development images are traceable via short SHA tag.

---

# 11. Why Development Uses Docker (Not Native Python)

PocoClass is validated in the same runtime model used for release.

Benefits:

- Eliminates “works on my machine” issues.
- Matches 11notes rootless behavior.
- Surfaces UID/GID permission issues early.
- Validates Gunicorn runtime config.
- Validates volume mount behavior.

Native Python execution is optional; Docker is authoritative.

---

# 12. Build Numbering Model

Build numbering is derived from Git commit count:

`BUILD_NUMBER = git rev-list --count HEAD`

This value:

- Is injected into the Docker image at build time.
- Is passed via `--build-arg BUILD_NUMBER`.
- Is displayed at container startup.
- Provides monotonic, branch-specific build tracking.

Example:

- Commit count: 626
- Short SHA: b6260507725d
- Image tag: pococlass:dev-b6260507725d
- Runtime banner: Build #626

This guarantees traceability between:

- Running container
- Image tag
- Git commit
- Source branch

No manual version bumping is required for development images.

---

# 13. Standardized Workflow Pattern (Reusable)

This document follows a reusable structure:

1. Scope
2. Principles
3. Repository Templates
4. Runtime Layout
5. Rebuild Entry Point
6. Internal Mechanics
7. Safety Model
8. First Run
9. Overrides
10. Branch Strategy
11. Runtime Philosophy
12. Build Numbering

Future Docker-based projects should follow this structure with project-specific naming.

---

# END OF DOCUMENT