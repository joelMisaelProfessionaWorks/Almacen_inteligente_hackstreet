#!/bin/bash
# Start Redpanda, Simulator, Backend, and Mobile App in separate terminals

set -e

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📦 Workspace: $WORKSPACE_ROOT"

echo ""
echo "=========================================="
echo "Starting Inventory Kit Services"
echo "=========================================="
echo ""

# 1. Start Redpanda & Simulator (if Docker available)
echo "1️⃣  Starting Redpanda + Simulator (Docker Compose)..."
echo "   📍 Redpanda Console: http://localhost:8080"
echo "   📍 Shop Simulator: http://localhost:8090"
echo ""
cd "$WORKSPACE_ROOT/hackathon-inventario-kit"
docker compose up -d 2>/dev/null || echo "⚠️  Docker Compose not available or already running"
cd "$WORKSPACE_ROOT"

# 2. Start Backend
echo "2️⃣  Starting Backend..."
echo "   📍 API: http://localhost:8000"
echo ""
cd "$WORKSPACE_ROOT/backend"
npm install --silent 2>/dev/null || true
npm dev &
BACKEND_PID=$!
cd "$WORKSPACE_ROOT"

sleep 2

# 3. Start Mobile App
echo "3️⃣  Starting Mobile App (Vite)..."
echo "   📍 Dev Server: http://localhost:5173"
echo "   📍 Local IP: Look for the one shown below"
echo ""
cd "$WORKSPACE_ROOT/movil"
npm install --silent 2>/dev/null || true
npm run dev &
MOBILE_PID=$!
cd "$WORKSPACE_ROOT"

echo ""
echo "=========================================="
echo "✅ All services started!"
echo "=========================================="
echo ""
echo "Service URLs:"
echo "  📱 Mobile App:        http://localhost:5173"
echo "  🔌 Backend API:       http://localhost:8000"
echo "  📊 Redpanda Console:  http://localhost:8080"
echo "  🎛️  Shop Simulator:    http://localhost:8090"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for signal
trap "kill $BACKEND_PID $MOBILE_PID 2>/dev/null; echo ''; echo 'Services stopped.'; exit" SIGINT

wait
