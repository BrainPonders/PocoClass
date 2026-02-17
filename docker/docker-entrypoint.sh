#!/bin/bash
set -e

echo "========================================"
echo "  PocoClass v2.0 (Build #${POCOCLASS_BUILD_NUMBER:-dev}) - Starting..."
echo "  Base: 11notes/python (rootless Alpine)"
echo "========================================"

DATA_DIR="${POCOCLASS_DATA_DIR:-/app/data}"
DB_PATH="${DATA_DIR}/pococlass.db"

if [ ! -d "$DATA_DIR" ]; then
    echo "Creating data directory: $DATA_DIR"
    mkdir -p "$DATA_DIR"
fi

export POCOCLASS_DB_PATH="$DB_PATH"

if [ -z "$POCOCLASS_SECRET_KEY" ]; then
    if [ "${POCOCLASS_DEV_MODE:-false}" = "true" ]; then
        echo "WARNING: POCOCLASS_SECRET_KEY not set. POCOCLASS_DEV_MODE=true, generating temporary Fernet key..."
        export POCOCLASS_SECRET_KEY=$(python3 -c "import os, base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())")
        echo "NOTE: Temporary key will invalidate sessions/tokens on restart."
    else
        echo "ERROR: POCOCLASS_SECRET_KEY is required at runtime and is not used during image build."
        echo "Set it via .env or environment variable before starting the container."
        echo "Generate one with:"
        echo "  python3 -c \"import os, base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())\""
        exit 1
    fi
fi

WORKERS="${GUNICORN_WORKERS:-3}"
THREADS="${GUNICORN_THREADS:-2}"
TIMEOUT="${GUNICORN_TIMEOUT:-120}"

echo "Configuration:"
echo "  - Build: #${POCOCLASS_BUILD_NUMBER:-dev}"
echo "  - Data directory: $DATA_DIR"
echo "  - Database path: $DB_PATH"
echo "  - Workers: $WORKERS"
echo "  - Threads: $THREADS"
echo "  - Timeout: ${TIMEOUT}s"
echo ""

echo "Starting Gunicorn server on port 5000..."
exec gunicorn \
    --bind 0.0.0.0:5000 \
    --workers $WORKERS \
    --threads $THREADS \
    --timeout $TIMEOUT \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    --enable-stdio-inheritance \
    "api:app"
