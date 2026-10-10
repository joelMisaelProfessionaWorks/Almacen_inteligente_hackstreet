@echo off
REM ============================================================
REM  Inicia TODO: Redpanda+Simulador (Docker), Backend, App movil
REM  y el tunel de Cloudflare (URL https publica para el celular).
REM  Ejecutalo con doble clic desde la raiz del repo.
REM ============================================================
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
cd /d "%ROOT%"

echo.
echo ==========================================
echo  Iniciando Almacen Inteligente
echo ==========================================
echo.

REM ---------- 1. Redpanda + simulador (Docker) ----------
echo [1/4] Redpanda + Simulador (Docker Compose)...
set "KIT=%ROOT%\hackathon-inventario-kit"
if not exist "%KIT%\docker-compose.yml" set "KIT=%ROOT%"
if not exist "%KIT%\docker-compose.yml" goto no_compose
pushd "%KIT%"
docker compose up -d
if errorlevel 1 echo    ADVERTENCIA: Docker no respondio. Abre Docker Desktop y vuelve a correr este script.
popd
echo    Consola Redpanda: http://localhost:8080
echo    Simulador:        http://localhost:8090
goto backend
:no_compose
echo    ADVERTENCIA: no encontre docker-compose.yml, me salto Docker.

REM ---------- 2. Backend ----------
:backend
echo.
echo [2/4] Backend (puerto 8000)...
if not exist "%ROOT%\backend\.env" (
  if exist "%ROOT%\backend\.env.example" (
    copy "%ROOT%\backend\.env.example" "%ROOT%\backend\.env" >nul
    echo    Cree backend\.env desde .env.example. REVISA DATABASE_URL antes de seguir.
  ) else (
    echo    ADVERTENCIA: falta backend\.env con DATABASE_URL y KAFKA_BROKERS.
  )
)
if not exist "%ROOT%\backend\node_modules" (
  echo    Instalando dependencias del backend...
  pushd "%ROOT%\backend"
  call npm install --silent
  popd
)
start "Backend - localhost:8000" /d "%ROOT%\backend" cmd /k npm run dev

REM ---------- 3. App movil ----------
echo.
echo [3/4] App movil (Vite, https puerto 5173)...
if not exist "%ROOT%\movil\node_modules\@vitejs\plugin-basic-ssl" (
  echo    Instalando dependencias de movil...
  pushd "%ROOT%\movil"
  call npm install --silent
  popd
)
start "Movil - localhost:5173" /d "%ROOT%\movil" cmd /k npm run dev

REM ---------- 4. Tunel Cloudflare ----------
echo.
echo [4/4] Tunel Cloudflare...
echo    Esperando a que la app movil responda en el puerto 5173...
powershell -NoProfile -Command "$ok=$false; for($i=0;$i -lt 90 -and -not $ok;$i++){ try { $c=New-Object Net.Sockets.TcpClient('127.0.0.1',5173); $c.Close(); $ok=$true } catch { Start-Sleep 1 } }; if($ok){exit 0}else{exit 1}"
if errorlevel 1 echo    ADVERTENCIA: la app movil no abrio el puerto 5173 a tiempo; intento el tunel igual.

where cloudflared >nul 2>&1
if errorlevel 1 (set "CF=npx --yes cloudflared") else (set "CF=cloudflared")
echo    Usando: %CF%

if exist cf-tunnel.log del /q cf-tunnel.log
if exist cf-url.txt del /q cf-url.txt
start "Cloudflare Tunnel" /min cmd /c %CF% tunnel --url https://localhost:5173 --no-tls-verify ^> cf-tunnel.log 2^>^&1

echo    Esperando la URL publica (puede tardar unos segundos)...
powershell -NoProfile -Command "$u=$null; for($i=0;$i -lt 90 -and -not $u;$i++){ Start-Sleep 1; if(Test-Path 'cf-tunnel.log'){ $m=Select-String -Path 'cf-tunnel.log' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1; if($m){ $u=$m.Matches[0].Value } } }; if($u){ Set-Content -Path 'cf-url.txt' -Value $u -NoNewline; Set-Clipboard $u }"

set "TUNNEL_URL="
if exist cf-url.txt set /p TUNNEL_URL=<cf-url.txt

echo.
echo ==========================================
echo  Servicios iniciados
echo ==========================================
echo.
echo   Backend API:       http://localhost:8000
echo   Redpanda Console:  http://localhost:8080
echo   Simulador:         http://localhost:8090
echo   App movil (PC):    https://localhost:5173
echo.
if defined TUNNEL_URL (
  echo   ABRE EN EL CELULAR: %TUNNEL_URL%
  echo   ^(la URL ya esta copiada al portapapeles^)
) else (
  echo   No pude obtener la URL del tunel. Revisa cf-tunnel.log
  echo   o instala cloudflared: winget install Cloudflare.cloudflared
)
echo.
echo  Para detener: cierra las ventanas Backend, Movil y Cloudflare Tunnel,
echo  y corre "docker compose down" dentro de hackathon-inventario-kit.
echo.
pause
endlocal