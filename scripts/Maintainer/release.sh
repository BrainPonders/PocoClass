#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

IMAGE_NAME="${POCOCLASS_IMAGE_NAME:-pococlass}"
IMAGE_TAG="${POCOCLASS_IMAGE_TAG:-}"

validate_release_tag() {
    local tag="$1"
    if [[ "$tag" =~ ^[0-9]+\.[0-9]+-develop$ ]]; then
        return 0
    fi
    if [[ "$tag" =~ ^[0-9]+\.[0-9]+\.[0-9]+-rc\.[0-9]+$ ]]; then
        return 0
    fi
    if [[ "$tag" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        return 0
    fi
    return 1
}

build_number_default() {
    if command -v git >/dev/null 2>&1 && git -C "$REPO_DIR" rev-parse --git-dir >/dev/null 2>&1; then
        git -C "$REPO_DIR" rev-list --count HEAD 2>/dev/null || printf '%s' "dev"
    else
        printf '%s' "dev"
    fi
}

short_sha_default() {
    if command -v git >/dev/null 2>&1 && git -C "$REPO_DIR" rev-parse --git-dir >/dev/null 2>&1; then
        git -C "$REPO_DIR" rev-parse --short=12 HEAD 2>/dev/null || printf '%s' "dev"
    else
        printf '%s' "dev"
    fi
}

if [ ! -f "$REPO_DIR/docker/Dockerfile" ]; then
    echo "ERROR: Dockerfile not found at $REPO_DIR/docker/Dockerfile"
    exit 1
fi

if [ -z "$IMAGE_TAG" ]; then
    echo "ERROR: POCOCLASS_IMAGE_TAG is required."
    echo "Allowed values:"
    echo "  - <major>.<minor>-develop (example: 2.1-develop)"
    echo "  - <major>.<minor>.<patch>-rc.<n> (example: 2.1.0-rc.1)"
    echo "  - <major>.<minor>.<patch> (example: 2.1.0)"
    exit 1
fi

if ! validate_release_tag "$IMAGE_TAG"; then
    echo "ERROR: Invalid POCOCLASS_IMAGE_TAG='$IMAGE_TAG'"
    echo "Allowed values:"
    echo "  - <major>.<minor>-develop"
    echo "  - <major>.<minor>.<patch>-rc.<n>"
    echo "  - <major>.<minor>.<patch>"
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
SHORT_SHA="${POCOCLASS_GIT_SHA:-$(short_sha_default)}"
SAFE_SHORT_SHA="$(printf '%s' "$SHORT_SHA" | tr -c '[:alnum:]._-' '-')"

PRIMARY_IMAGE_TAG="${IMAGE_NAME}:${IMAGE_TAG}"
BUILD_IMAGE_TAG="${IMAGE_NAME}:build-${SAFE_BUILD_NUMBER}"
SHA_IMAGE_TAG="${IMAGE_NAME}:sha-${SAFE_SHORT_SHA}"

EXTRA_TAG=""
if [[ "$IMAGE_TAG" =~ -develop$ ]]; then
    EXTRA_TAG="${IMAGE_NAME}:${IMAGE_TAG}-build-${SAFE_BUILD_NUMBER}"
fi

echo "Building release image:"
echo "  ${PRIMARY_IMAGE_TAG}"
echo "  ${BUILD_IMAGE_TAG}"
echo "  ${SHA_IMAGE_TAG}"
if [ -n "$EXTRA_TAG" ]; then
    echo "  ${EXTRA_TAG}"
fi
echo "  build number: ${BUILD_NUMBER}"
echo "  git sha: ${SHORT_SHA}"

extra_tag_args=()
if [ -n "$EXTRA_TAG" ]; then
    extra_tag_args=(-t "$EXTRA_TAG")
fi

docker build \
    --no-cache \
    --build-arg BUILD_NUMBER="${BUILD_NUMBER}" \
    -t "${PRIMARY_IMAGE_TAG}" \
    -t "${BUILD_IMAGE_TAG}" \
    -t "${SHA_IMAGE_TAG}" \
    "${extra_tag_args[@]}" \
    -f "$REPO_DIR/docker/Dockerfile" \
    "$REPO_DIR"

echo "Release build complete."
echo "Local tags ready. Push with your registry workflow or manual docker push."
