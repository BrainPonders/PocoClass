#!/bin/bash

# POCOclass v2.0 - Startup Script
# Ensures both backend and frontend start reliably

set -e

echo "Starting POCOclass v2.0..."

# Start backend API in background
echo "Starting backend API on port 8000..."
python3 api.py &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to start..."
for i in {1..30}; do
  if curl -s http://localhost:8000/api/auth/status > /dev/null 2>&1; then
    echo "Backend is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Backend failed to start within 30 seconds"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Start frontend
echo "Starting frontend on port 5000..."
cd frontend && npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null || true" EXIT
