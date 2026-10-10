@echo off
REM Start Redpanda, Simulator, Backend, and Mobile App
setlocal enabledelayedexpansion

set WORKSPACE_ROOT=%cd%
echo.
echo ==========================================
echo Starting Inventory Kit Services
echo ==========================================
echo.

REM 1. Start Redpanda & Simulator (Docker Compose)
echo 1. Starting Redpanda + Simulator (Docker Compose)...
echo    Redpanda Console: http://localhost:8080
echo    Shop Simulator: http://localhost:8090
echo.
cd "%WORKSPACE_ROOT%\hackathon-inventario-kit"
docker compose up -d >nul 2>&1 || echo Warning: Docker Compose may not be available
cd "%WORKSPACE_ROOT%"

REM 2. Start Backend in new window
echo 2. Starting Backend...
echo    API: http://localhost:8000
echo.
cd "%WORKSPACE_ROOT%\backend"
if not exist node_modules (
  call npm install --silent
)
start "Backend - localhost:8000" cmd /k npm dev
cd "%WORKSPACE_ROOT%"

timeout /t 2 /nobreak

REM 3. Start Mobile App in new window
echo 3. Starting Mobile App (Vite)...
echo    Dev Server: http://localhost:5173
echo.
cd "%WORKSPACE_ROOT%\movil"
if not exist node_modules (
  call npm install --silent
)
start "Mobile App - localhost:5173" cmd /k npm run dev
cd "%WORKSPACE_ROOT%"

echo.
echo ==========================================
echo All services started!
echo ==========================================
echo.
echo Service URLs:
echo   Mobile App:        http://localhost:5173
echo   Backend API:       http://localhost:8000
echo   Redpanda Console:  http://localhost:8080
echo   Shop Simulator:    http://localhost:8090
echo.
echo.
pause
