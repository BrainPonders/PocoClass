# DEVELOPMENT

Maintainer workflow for building and running PocoClass locally with Docker.

End-user deployment instructions live only in `/README.md`.

## 1. Principles

- The repository keeps templates only.
- The live dev runtime lives outside the repo in `<repo-parent>/pococlass-dev/` by default.
- `maintainer/development/dev-build.sh` is the single entry point for local rebuilds.
- Local runtime files are preserved:
  - `docker-compose.yml`
  - `.env`
  - `data/`
  - `rules/`
- The script updates only `POCOCLASS_IMAGE=` in the runtime `.env`.
- Dev image versioning is automatic:
  - base version comes from `/VERSION`
  - dev release version becomes `vX.Y.Z-dev.N`
  - build number comes from Git commit count and is shown separately in the UI

## 2. Runtime Layout

Default runtime folder:

- `<repo-parent>/pococlass-dev/`

Expected files:

- `<repo-parent>/pococlass-dev/docker-compose.yml`
- `<repo-parent>/pococlass-dev/.env`
- `<repo-parent>/pococlass-dev/data/`
- `<repo-parent>/pococlass-dev/rules/`

Repository templates:

- `/docker/compose/docker-compose-dev.yml.example`
- `/docker/compose/.env.dev.example`

## 3. What `dev-build.sh` Does

1. Syncs the repo to `origin/<current-branch>` by default.
2. Cleans the checkout to a deterministic state.
3. Builds a local image:
   - `pococlass:dev-<shortsha>`
   - `pococlass:dev-latest`
4. Sets:
   - `BUILD_NUMBER` from Git commit count
   - `VERSION` as `v<base>-dev.<next>`
5. Creates runtime files only if missing.
6. Writes `.new` files when templates changed:
   - `docker-compose.yml.new`
   - `.env.new`
7. Recreates the dev container with fixed project name `pococlass-dev`.

## 4. Local Execution

First run:

1. Run:
   - `bash maintainer/development/dev-build.sh`
2. Edit:
   - `<repo-parent>/pococlass-dev/.env`
3. Set at minimum:
   - `POCOCLASS_SECRET_KEY`
   - `PAPERLESS_URL`
   - `PAPERLESS_NETWORK_NAME`
4. Run again:
   - `bash maintainer/development/dev-build.sh`

Regular rebuild:

- `bash maintainer/development/dev-build.sh`

## 5. Useful Overrides

Custom runtime folder:

- `POCOCLASS_DEV_ROOT=/custom/path bash maintainer/development/dev-build.sh`

Custom compose project name:

- `POCOCLASS_DEV_PROJECT=my-dev-stack bash maintainer/development/dev-build.sh`

Custom source branch:

- `POCOCLASS_DEV_BRANCH=my-branch bash maintainer/development/dev-build.sh`

Force a specific dev sequence:

- `POCOCLASS_DEV_SEQUENCE=3 bash maintainer/development/dev-build.sh`

## 6. Secret Key

Generate a Fernet-compatible key with:

- `python3 -c "import os, base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"`

## 7. Safety Rules

The script must not:

- overwrite runtime `.env`
- overwrite runtime `docker-compose.yml`
- write secrets into the repository
- modify end-user deployment files
