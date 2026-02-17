# IMPLEMENTATION TRACKER

This file tracks implementation status for the current Docker-first workflow, plus any deviations from the agreed design.

## Scope

- Developer workflow (`scripts/Maintainer/dev-rebuild.sh`)
- Release workflow (`scripts/Maintainer/release.sh`)
- Public deployment files (`docker/compose/*`)
- End-user install instructions (`README.md`, deployment sections only)

## Current Status

1. Dev rebuild workflow
   - Status: in progress
   - Implemented:
     - Runtime folder outside repo (`<repo-parent>/pococlass-dev`)
     - Template copy-once behavior for compose/env runtime files
     - Non-destructive template update outputs (`.new` files)
     - Fixed compose project name support (`POCOCLASS_DEV_PROJECT`, default `pococlass-dev`)
     - `POCOCLASS_IMAGE` update-only behavior in runtime `.env`
   - Pending:
     - End-to-end validation in fresh host path scenarios

2. Release workflow
   - Status: in progress
   - Implemented:
     - Local release image build and tag workflow
     - Build-number default from git commit count
   - Pending:
     - Optional GHCR push automation integration

3. Deployment compose modes
   - Status: in progress
   - Implemented:
     - `docker-compose.bridge.yml`
     - `docker-compose.host.yml`
     - Header clarifications for bridge vs host mode
   - Pending:
     - Final README deployment section sync pass

## Design Deviations

1. Runtime compose filename for dev
   - Design idea: keep runtime template as `docker-compose.dev.yml`
   - Current implementation: runtime file is `docker-compose.yml` for easier default `docker compose up -d` operations in runtime folder
   - Reason: simpler day-2 container management

2. Build tagging strategy
   - Design idea: rely on unique image tags plus optional latest
   - Current implementation:
     - Dev tag: `pococlass:dev-<shortsha>`
     - Dev rolling tag: `pococlass:dev-latest`
     - Build number injected as commit count via `BUILD_NUMBER`
   - Reason: keeps readable runtime tag while preserving monotonic build number in app metadata

## Active Roadmap / TODO

1. Validate dev rebuild script on non-default parent directories.
2. Confirm runtime `.env` update logic only touches `POCOCLASS_IMAGE`.
3. Finalize `README.md` deployment instructions (intro unchanged).
4. Add short troubleshooting section for divergent git pull states and branch overrides.
5. Confirm release script output format against desired UI version/build display.

## Notes

- Keep secrets out of repository-tracked files.
- Keep local policy files (`AGENTS.md` / `AGEND.md`) out of git.
