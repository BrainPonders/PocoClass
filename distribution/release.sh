#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

IMAGE_NAME="${POCOCLASS_IMAGE_NAME:-pococlass}"
IMAGE_TAG="${POCOCLASS_IMAGE_TAG:-}"

validate_release_tag() {
    local tag="$1"
    if [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+-dev\.[0-9]+$ ]]; then
        return 0
    fi
    if [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+-rc\.[0-9]+$ ]]; then
        return 0
    fi
    if [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
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

if [ ! -f "$REPO_DIR/distribution/docker-build/Dockerfile" ]; then
    echo "ERROR: Dockerfile not found at $REPO_DIR/distribution/docker-build/Dockerfile"
    exit 1
fi

if [ -z "$IMAGE_TAG" ]; then
    echo "ERROR: POCOCLASS_IMAGE_TAG is required."
    echo "Allowed values:"
    echo "  - v<major>.<minor>.<patch>-dev.<n> (example: v2.0.0-dev.1)"
    echo "  - v<major>.<minor>.<patch>-rc.<n> (example: v2.0.0-rc.1)"
    echo "  - v<major>.<minor>.<patch> (example: v2.0.0)"
    exit 1
fi

if ! validate_release_tag "$IMAGE_TAG"; then
    echo "ERROR: Invalid POCOCLASS_IMAGE_TAG='$IMAGE_TAG'"
    echo "Allowed values:"
    echo "  - v<major>.<minor>.<patch>-dev.<n>"
    echo "  - v<major>.<minor>.<patch>-rc.<n>"
    echo "  - v<major>.<minor>.<patch>"
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
VERSION="${POCOCLASS_VERSION:-${IMAGE_TAG}}"
SAFE_BUILD_NUMBER="$(printf '%s' "$BUILD_NUMBER" | tr -c '[:alnum:]._-' '-')"
SHORT_SHA="${POCOCLASS_GIT_SHA:-$(short_sha_default)}"
SAFE_SHORT_SHA="$(printf '%s' "$SHORT_SHA" | tr -c '[:alnum:]._-' '-')"

PRIMARY_IMAGE_TAG="${IMAGE_NAME}:${IMAGE_TAG}"
BUILD_IMAGE_TAG="${IMAGE_NAME}:build-${SAFE_BUILD_NUMBER}"
SHA_IMAGE_TAG="${IMAGE_NAME}:sha-${SAFE_SHORT_SHA}"

echo "Building release image:"
echo "  ${PRIMARY_IMAGE_TAG}"
echo "  ${BUILD_IMAGE_TAG}"
echo "  ${SHA_IMAGE_TAG}"
echo "  version: ${VERSION}"
echo "  build number: ${BUILD_NUMBER}"
echo "  git sha: ${SHORT_SHA}"

docker build \
    --no-cache \
    --build-arg BUILD_NUMBER="${BUILD_NUMBER}" \
    --build-arg VERSION="${VERSION}" \
    -t "${PRIMARY_IMAGE_TAG}" \
    -t "${BUILD_IMAGE_TAG}" \
    -t "${SHA_IMAGE_TAG}" \
    -f "$REPO_DIR/distribution/docker-build/Dockerfile" \
    "$REPO_DIR"

echo "Release build complete."
echo "Local tags ready. Push with your registry workflow or manual docker push."
