#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE_TAG="${POCOCLASS_SMOKE_IMAGE:-pococlass:smoke-local}"
CONTAINER_NAME="${POCOCLASS_SMOKE_CONTAINER:-pococlass-smoke-local}"
HOST_PORT="${POCOCLASS_SMOKE_PORT:-5050}"
BASE_URL="http://127.0.0.1:${HOST_PORT}"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not installed."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 is not installed."
  exit 1
fi

gen_secret_key() {
  if command -v python3 >/dev/null 2>&1; then
    python3 -c "import os, base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
    return
  fi
  openssl rand -base64 32 | tr '+/' '-_' | tr -d '\n'
}

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "== Build smoke image =="
docker build \
  --build-arg BUILD_NUMBER="smoke-local" \
  -t "$IMAGE_TAG" \
  -f "$ROOT_DIR/maintainer/docker/Dockerfile" \
  "$ROOT_DIR"

echo "== Start smoke container =="
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${HOST_PORT}:5000" \
  -e POCOCLASS_SECRET_KEY="$(gen_secret_key)" \
  -e PAPERLESS_URL="http://paperless.invalid:8000" \
  "$IMAGE_TAG" >/dev/null

echo "== Wait for health endpoint =="
for _ in $(seq 1 60); do
  if python3 - "$BASE_URL/api/health" >/dev/null 2>&1 <<'PY'
import sys
import urllib.request

with urllib.request.urlopen(sys.argv[1], timeout=5) as response:
    sys.exit(0 if response.getcode() == 200 else 1)
PY
  then
    break
  fi
  sleep 1
done

if ! python3 - "$BASE_URL/api/health" >/dev/null 2>&1 <<'PY'
import sys
import urllib.request

with urllib.request.urlopen(sys.argv[1], timeout=5) as response:
    sys.exit(0 if response.getcode() == 200 else 1)
PY
then
  echo "ERROR: service did not become healthy in time."
  echo "--- container logs ---"
  docker logs "$CONTAINER_NAME" || true
  exit 1
fi

check_status() {
  local method="$1"
  local path="$2"
  local expected="$3"
  local body="${4:-}"
  local code
  code="$(python3 - "$method" "${BASE_URL}${path}" /tmp/poco-smoke.out "$body" <<'PY'
import json
import sys
import urllib.error
import urllib.request

method, url, outfile, body = sys.argv[1:5]
headers = {}
data = None
if body:
    data = body.encode("utf-8")
    headers["Content-Type"] = "application/json"

request = urllib.request.Request(url, data=data, headers=headers, method=method)
try:
    with urllib.request.urlopen(request, timeout=5) as response:
        payload = response.read()
        status = response.getcode()
except urllib.error.HTTPError as error:
    payload = error.read()
    status = error.code

with open(outfile, "wb") as handle:
    handle.write(payload)

print(status)
PY
)"

  if [ "$code" != "$expected" ]; then
    echo "FAIL: ${method} ${path} expected ${expected}, got ${code}"
    cat /tmp/poco-smoke.out || true
    return 1
  fi
  echo "PASS: ${method} ${path} -> ${code}"
}

echo "== API smoke checks =="
check_status "GET" "/api/health" "200"
check_status "GET" "/api/auth/status" "200"
check_status "GET" "/api/users" "401"
check_status "GET" "/api/settings" "401"
check_status "GET" "/api/settings/batch" "401"
check_status "GET" "/api/paperless/tags" "401"
check_status "GET" "/api/rules" "401"
check_status "GET" "/api/documents" "401"
check_status "POST" "/api/background/trigger" "401" "{}"
check_status "GET" "/api/system-token" "401"
check_status "GET" "/api/logs" "401"

echo "Smoke checks passed."
