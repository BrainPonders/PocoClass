#!/bin/bash

set -euo pipefail

IMAGE_NAME="${POCOCLASS_IMAGE_NAME:-pococlass}"
IMAGE_TAG="${POCOCLASS_IMAGE_TAG:-latest}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKERFILE_PATH="$SOURCE_DIR/docker/Dockerfile"

if [ ! -f "$DOCKERFILE_PATH" ]; then
    echo "ERROR: Dockerfile not found at $DOCKERFILE_PATH"
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: Docker is not installed."
    echo "Install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Docker is not running."
    echo "Start Docker and run this script again."
    exit 1
fi

echo "Building image ${IMAGE_NAME}:${IMAGE_TAG}..."
docker build \
    -t "${IMAGE_NAME}:${IMAGE_TAG}" \
    -f "$DOCKERFILE_PATH" \
    "$SOURCE_DIR"
echo "Image build complete: ${IMAGE_NAME}:${IMAGE_TAG}"
