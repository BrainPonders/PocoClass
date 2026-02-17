#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

IMAGE_NAME="${POCOCLASS_IMAGE_NAME:-pococlass}"
IMAGE_TAG="${POCOCLASS_IMAGE_TAG:-latest}"

build_number_default() {
    local short_hash
    if command -v git >/dev/null 2>&1 && git -C "$REPO_DIR" rev-parse --git-dir >/dev/null 2>&1; then
        short_hash="$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo "nogit")"
        printf '%s' "$short_hash"
    else
        printf '%s' "dev"
    fi
}

if [ ! -f "$REPO_DIR/docker/Dockerfile" ]; then
    echo "ERROR: Dockerfile not found at $REPO_DIR/docker/Dockerfile"
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: docker is not installed."
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "ERROR: docker daemon is not running."
    exit 1
fi

BUILD_NUMBER="${POCOCLASS_BUILD_NUMBER:-$(build_number_default)}"
SAFE_BUILD_NUMBER="$(printf '%s' "$BUILD_NUMBER" | tr -c '[:alnum:]._-' '-')"
BUILD_TAG="build-${SAFE_BUILD_NUMBER}"

echo "Building release image:"
echo "  ${IMAGE_NAME}:${IMAGE_TAG}"
echo "  ${IMAGE_NAME}:${BUILD_TAG}"
echo "  build number: ${BUILD_NUMBER}"

docker build \
    --no-cache \
    --build-arg BUILD_NUMBER="${BUILD_NUMBER}" \
    -t "${IMAGE_NAME}:${IMAGE_TAG}" \
    -t "${IMAGE_NAME}:${BUILD_TAG}" \
    -f "$REPO_DIR/docker/Dockerfile" \
    "$REPO_DIR"

echo "Release build complete."
