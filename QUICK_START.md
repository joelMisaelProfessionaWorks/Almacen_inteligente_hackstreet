# 🚀 Guía de Inicio Rápido

## Opción 1: Inicio automático (Recomendado)

### Windows
```bash
start-dev.bat
```

### macOS / Linux
```bash
chmod +x start-dev.sh
./start-dev.sh
```

Esto iniciará automáticamente:
1. **Redpanda + Simulator** (Docker Compose) - si está disponible
2. **Backend API** - http://localhost:8000
3. **Móvil** (Vite Dev Server) - http://localhost:5173

---

## Opción 2: Inicio manual

### Terminal 1 - Redpanda + Simulator (opcional pero recomendado)
```bash
cd hackathon-inventario-kit
docker compose up
```
- 📊 Consola: http://localhost:8080
- 🎛️ Simulador: http://localhost:8090

### Terminal 2 - Backend API
```bash
cd backend
npm install
npm dev
```
- 🔌 API: http://localhost:8000

### Terminal 3 - Mobile App
```bash
cd movil
npm install
npm run dev
```
- 📱 Aplicación: http://localhost:5173

---

## 🧪 Test de Conectividad

### Verificar que el Backend responde
```bash
curl http://localhost:8000/locations
```

### Verificar que el Móvil se conecta
Abre http://localhost:5173 en el navegador.
- Si ves la app cargada ✅
- Si los botones responden (scan, transferir, etc.) ✅

### Teste un escaneo manual
En el móvil, ve a **Salida** → escribe `U-100` en el campo de ubicación → debería autocomplete con ubicaciones.

---

## 📍 Acceso desde otra PC/Móvil

### Encontrar tu IP
```bash
# Windows
ipconfig

# macOS / Linux
ifconfig
```

### Conectar Mobile desde otra PC
1. Busca tu IP local (ej. `192.168.1.100`)
2. Abre en navegador: `http://192.168.1.100:5173`
3. Configura en el `.env` de `movil/`:
   ```
   VITE_API_URL=http://192.168.1.100:8000
   ```
4. Recarga la página

---

## ✅ Checklist de Configuración

- [ ] Node.js 16+ instalado (`node --version`)
- [ ] Docker + Docker Compose (opcional pero recomendado)
- [ ] PostgreSQL corriendo con schema cargado
  ```bash
  psql -U inventory -d inventory -f database/schema.sql
  ```
- [ ] `.env.local` en `movil/` con `VITE_API_URL=http://localhost:8000`

---

## 🔗 Flujo de Integración

```
┌─────────────┐
│  Móvil App  │  (React + Vite)
│ :5173       │
└──────┬──────┘
       │ HTTP REST
       ▼
┌─────────────┐
│  Backend    │  (Node.js + Express)
│  :8000      │
└──────┬──────┘
       │ PostgreSQL + Kafka
       ▼
┌─────────────────────┐
│  Base de Datos      │  PostgreSQL
│  + Event Stream     │  + Redpanda/Kafka
└─────────────────────┘
```

---

## 📝 Notas

- La aplicación móvil usa la **Barcode Detection API** (navegador nativo)
- El backend genereaza eventos en Kafka via el patrón **Outbox**
- Todos los endpoints esperan respuestas JSON normalizadas
- Ver logs en las respectivas terminales para debugging

---

¡Listo! 🎉 La app ya está conectada. Ahora a hacer pruebas.
