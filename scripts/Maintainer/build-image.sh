#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$SOURCE_DIR"

if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    BUILD_NUMBER=$(git rev-list --count HEAD)
    echo "Build number (commit count): #${BUILD_NUMBER}"
else
    BUILD_NUMBER="dev"
    echo "WARNING: Not a git repository, using BUILD_NUMBER=dev"
fi

IMAGE_NAME="${POCOCLASS_IMAGE_NAME:-pococlass}"
IMAGE_TAG="${POCOCLASS_IMAGE_TAG:-latest}"

echo "Building ${IMAGE_NAME}:${IMAGE_TAG} with build #${BUILD_NUMBER}..."

docker build \
    -f docker/Dockerfile \
    --build-arg BUILD_NUMBER="${BUILD_NUMBER}" \
    -t "${IMAGE_NAME}:${IMAGE_TAG}" \
    .

echo ""
echo "========================================"
echo "  Build complete!"
echo "  Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "  Build: #${BUILD_NUMBER}"
echo "========================================"
