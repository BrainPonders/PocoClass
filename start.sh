#!/bin/bash

# PocoClass v2.0 - Startup Script
# Ensures both backend and frontend start reliably

set -e

echo "Starting PocoClass v2.0..."

# Setup cleanup trap early (before starting any processes)
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo "Shutting down PocoClass..."
  
  # Kill frontend if running
  if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "Stopping frontend (PID $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  
  # Kill backend if running
  if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Stopping backend (PID $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
  fi
  
  # Wait briefly for processes to terminate
  sleep 1
  
  # Force kill if still running
  if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "Force stopping frontend..."
    kill -9 $FRONTEND_PID 2>/dev/null || true
  fi
  
  if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Force stopping backend..."
    kill -9 $BACKEND_PID 2>/dev/null || true
  fi
  
  echo "Shutdown complete."
}

trap cleanup EXIT INT TERM

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
    exit 1
  fi
  sleep 1
done

# Start frontend
echo "Starting frontend on port 5000..."
cd frontend && npm run dev &
FRONTEND_PID=$!

# Wait for frontend process (keeps script running)
wait $FRONTEND_PID
