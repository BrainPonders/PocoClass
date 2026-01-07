#!/bin/bash
set -e

echo "========================================"
echo "  PocoClass v2.0 - Starting..."
echo "========================================"

DATA_DIR="${POCOCLASS_DATA_DIR:-/app/data}"
DB_PATH="${DATA_DIR}/pococlass.db"

if [ ! -d "$DATA_DIR" ]; then
    echo "Creating data directory: $DATA_DIR"
    mkdir -p "$DATA_DIR"
fi

export POCOCLASS_DB_PATH="$DB_PATH"

if [ -z "$POCOCLASS_SECRET_KEY" ]; then
    echo "WARNING: POCOCLASS_SECRET_KEY not set. Generating random key..."
    export POCOCLASS_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    echo "NOTE: Set POCOCLASS_SECRET_KEY env var for persistent sessions across restarts."
fi

GUNICORN_PID=""

cleanup() {
    echo ""
    echo "Shutting down PocoClass..."
    
    if [ ! -z "$GUNICORN_PID" ] && kill -0 $GUNICORN_PID 2>/dev/null; then
        echo "Stopping Gunicorn (PID $GUNICORN_PID)..."
        kill -TERM $GUNICORN_PID 2>/dev/null || true
        
        for i in {1..10}; do
            if ! kill -0 $GUNICORN_PID 2>/dev/null; then
                break
            fi
            sleep 1
        done
        
        if kill -0 $GUNICORN_PID 2>/dev/null; then
            echo "Force stopping Gunicorn..."
            kill -9 $GUNICORN_PID 2>/dev/null || true
        fi
    fi
    
    echo "Shutdown complete."
    exit 0
}

trap cleanup SIGTERM SIGINT SIGQUIT

WORKERS="${GUNICORN_WORKERS:-3}"
THREADS="${GUNICORN_THREADS:-2}"
TIMEOUT="${GUNICORN_TIMEOUT:-120}"

echo "Configuration:"
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
