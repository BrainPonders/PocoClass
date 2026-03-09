#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_PARENT_DIR="$(cd "$REPO_DIR/.." && pwd)"
DEV_COMPOSE_PROJECT="${POCOCLASS_DEV_PROJECT:-pococlass-dev}"

DEV_ROOT="${POCOCLASS_DEV_ROOT:-${REPO_PARENT_DIR}/pococlass-dev}"
RUNTIME_COMPOSE="$DEV_ROOT/docker-compose.yml"
LEGACY_RUNTIME_COMPOSE="$DEV_ROOT/docker-compose.dev.yml"
RUNTIME_ENV="$DEV_ROOT/.env"
RUNTIME_DATA_DIR="$DEV_ROOT/data"
RUNTIME_RULES_DIR="$DEV_ROOT/rules"

TEMPLATE_COMPOSE="$REPO_DIR/docker/compose/docker-compose-dev.yml.example"
TEMPLATE_ENV="$REPO_DIR/docker/compose/.env.dev.example"

compose_run() {
    if docker compose version >/dev/null 2>&1; then
        docker compose "$@"
        return
    fi

    if command -v docker-compose >/dev/null 2>&1; then
        docker-compose "$@"
        return
    fi

    echo "ERROR: Docker Compose is not available."
    exit 1
}

CURRENT_BRANCH="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
if [ "$CURRENT_BRANCH" = "HEAD" ]; then
    CURRENT_BRANCH="main"
fi
DEV_BRANCH="${POCOCLASS_DEV_BRANCH:-$CURRENT_BRANCH}"

echo "== Sync repository to origin/${DEV_BRANCH} =="
git -C "$REPO_DIR" fetch origin --prune
if git -C "$REPO_DIR" show-ref --verify --quiet "refs/remotes/origin/${DEV_BRANCH}"; then
    git -C "$REPO_DIR" switch "$DEV_BRANCH" >/dev/null 2>&1 || git -C "$REPO_DIR" checkout "$DEV_BRANCH" >/dev/null 2>&1
    git -C "$REPO_DIR" reset --hard "origin/${DEV_BRANCH}"
else
    echo "WARNING: Remote branch origin/${DEV_BRANCH} not found. Falling back to origin/main."
    git -C "$REPO_DIR" switch main >/dev/null 2>&1 || git -C "$REPO_DIR" checkout main >/dev/null 2>&1
    git -C "$REPO_DIR" reset --hard origin/main
    DEV_BRANCH="main"
fi
git -C "$REPO_DIR" clean -fdx

BUILD_NUMBER="$(git -C "$REPO_DIR" rev-list --count HEAD 2>/dev/null || echo dev)"
SHORT_SHA="$(git -C "$REPO_DIR" rev-parse --short=12 HEAD)"
IMAGE_TAG="dev-${SHORT_SHA}"
IMAGE_REF="pococlass:${IMAGE_TAG}"

echo "== Build image ${IMAGE_REF} =="
echo "== Build number #${BUILD_NUMBER} =="
docker build \
    --no-cache \
    --build-arg BUILD_NUMBER="${BUILD_NUMBER}" \
    -t "${IMAGE_REF}" \
    -t "pococlass:dev-latest" \
    -f "$REPO_DIR/distribution/docker-build/Dockerfile" \
    "$REPO_DIR"

echo "== Prepare runtime folder: ${DEV_ROOT} =="
mkdir -p "$DEV_ROOT" "$RUNTIME_DATA_DIR" "$RUNTIME_RULES_DIR"

if [ ! -f "$RUNTIME_COMPOSE" ] && [ -f "$LEGACY_RUNTIME_COMPOSE" ]; then
    mv "$LEGACY_RUNTIME_COMPOSE" "$RUNTIME_COMPOSE"
    echo "Migrated legacy runtime compose to ${RUNTIME_COMPOSE}"
fi

if [ ! -f "$RUNTIME_COMPOSE" ]; then
    cp "$TEMPLATE_COMPOSE" "$RUNTIME_COMPOSE"
    echo "Created ${RUNTIME_COMPOSE}"
else
    if ! cmp -s "$TEMPLATE_COMPOSE" "$RUNTIME_COMPOSE"; then
        cp "$TEMPLATE_COMPOSE" "${RUNTIME_COMPOSE}.new"
        echo "Template updated: ${RUNTIME_COMPOSE}.new (existing file preserved)"
    fi
fi

RUNTIME_ENV_CREATED=false
if [ ! -f "$RUNTIME_ENV" ]; then
    cp "$TEMPLATE_ENV" "$RUNTIME_ENV"
    RUNTIME_ENV_CREATED=true
    echo "Created ${RUNTIME_ENV}"
else
    if ! cmp -s "$TEMPLATE_ENV" "$RUNTIME_ENV"; then
        cp "$TEMPLATE_ENV" "${RUNTIME_ENV}.new"
        echo "Template updated: ${RUNTIME_ENV}.new (existing file preserved)"
    fi
fi

# Align volume paths on first run and auto-fill them when missing.
if grep -q '^DEV_DATA_DIR=' "$RUNTIME_ENV"; then
    if [ "$RUNTIME_ENV_CREATED" = true ]; then
        sed -i.bak "s|^DEV_DATA_DIR=.*$|DEV_DATA_DIR=${RUNTIME_DATA_DIR}|" "$RUNTIME_ENV"
    fi
else
    printf '\nDEV_DATA_DIR=%s\n' "$RUNTIME_DATA_DIR" >> "$RUNTIME_ENV"
fi

if grep -q '^DEV_RULES_DIR=' "$RUNTIME_ENV"; then
    if [ "$RUNTIME_ENV_CREATED" = true ]; then
        sed -i.bak "s|^DEV_RULES_DIR=.*$|DEV_RULES_DIR=${RUNTIME_RULES_DIR}|" "$RUNTIME_ENV"
    fi
else
    printf '\nDEV_RULES_DIR=%s\n' "$RUNTIME_RULES_DIR" >> "$RUNTIME_ENV"
fi
rm -f "${RUNTIME_ENV}.bak"

# Update only POCOCLASS_IMAGE in runtime .env and preserve all other local tweaks.
if grep -q '^POCOCLASS_IMAGE=' "$RUNTIME_ENV"; then
    sed -i.bak "s|^POCOCLASS_IMAGE=.*$|POCOCLASS_IMAGE=${IMAGE_REF}|" "$RUNTIME_ENV"
    rm -f "${RUNTIME_ENV}.bak"
else
    printf '\nPOCOCLASS_IMAGE=%s\n' "$IMAGE_REF" >> "$RUNTIME_ENV"
fi

echo "== Start PocoClass dev container =="
(
    cd "$DEV_ROOT"
    compose_run \
        -p "$DEV_COMPOSE_PROJECT" \
        --env-file "$RUNTIME_ENV" \
        -f "$RUNTIME_COMPOSE" \
        up -d --pull never --force-recreate pococlass
)

echo "== Done =="
echo "Image: ${IMAGE_REF}"
echo "Source branch: ${DEV_BRANCH}"
echo "Compose project: ${DEV_COMPOSE_PROJECT}"
echo "Runtime folder: ${DEV_ROOT}"
echo "If this is your first run, edit ${RUNTIME_ENV} and set POCOCLASS_SECRET_KEY."
