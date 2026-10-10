
# Kit de arranque: almacén inteligente para taller

Todo lo que necesitan para construir el servicio de inventario del reto.

```bash
docker compose up -d
```

Con eso levantan:

| Qué | Dónde |
|---|---|
| Broker Redpanda (API de Kafka) | `localhost:19092` desde su máquina · `redpanda:9092` desde un contenedor |
| Redpanda Console, para ver los tópicos | http://localhost:8080 |
| Simulador del taller | http://localhost:8090 |

El simulador crea los tópicos y reproduce seis semanas de operación del taller, una hora
simulada por segundo (unos 17 minutos). Para otro ritmo usen `SPEED=0 docker compose up -d`
(sin pausas) o `SPEED=600`. Para empezar de cero, `RESET=1` borra y recrea los tópicos.

## Qué hay

| Carpeta | Qué es |
|---|---|
| `contract/` | El contrato: JSON Schema de cada evento, la API en OpenAPI y las reglas que revisan las pruebas. **Empiecen aquí.** |
| `data/events.jsonl` | Las mismas seis semanas en un archivo, para desarrollar sin broker |
| `simulator/` | El simulador y su panel |
| `contract-tests/` | Las pruebas de contrato (50 de los 100 puntos) |
| `labels/etiquetas-demo.pdf` | Etiquetas Code 128 de la demo (estándar en `contract/README.md` §5) |
| `tools/validate_events.py` | Valida cualquier archivo de eventos contra el contrato, incluidos los suyos |

## El panel del simulador

En http://localhost:8090 el jurado (y ustedes, para probar) pueden:

1. Recibir un equipo: abre una orden de trabajo de cualquiera de los 5 modelos.
2. Capturar su inspección pieza por pieza y aprobarla, rechazarla, descartarla o anularla.
3. Cambiar la etapa de la orden o darla de baja.
4. Registrar la llegada de una compra, con o sin código de orden.

Es el flujo de la demo final: el jurado aprueba una inspección aquí y ustedes muestran la
reserva, el faltante, la llegada de la compra y la salida escaneada.

## Pruebas de contrato

```bash
docker compose run --rm contract-tests --api http://host.docker.internal:8000
```

Detalle en [`contract-tests/README.md`](contract-tests/README.md).
=======
# Almacén Inteligente Hackstreet 🏭📦

Sistema de gestión inteligente de inventario para un taller especializado en la reparación de equipo industrial (husillos y motores eléctricos). Construido con una arquitectura orientada a eventos para integrarse al ecosistema operativo del taller en tiempo real.

Este proyecto da solución al desafío del Hackathon implementando un control estricto de existencias, reservas, faltantes, ubicaciones y movimientos inmutables, cumpliendo estrictamente con el contrato de eventos y la API OpenAPI (`openapi.yaml`) solicitada.

## 🚀 Funcionalidad Estrella (Hackathon Killer Feature): Smart Procurement AI
Para evitar el **sobreinventario** (uno de los mayores dolores de cabeza en almacenes industriales), el sistema incluye un motor de toma de decisiones. Cuando se detecta un faltante o se sugiere una compra, la IA evalúa:
1. **Proveedores y Precios:** Busca las mejores opciones externas (proveedor, precio, tiempo de entrega / *lead time*).
2. **Fabricación/Reparación Interna:** Evalúa si el taller tiene la capacidad (y sub-componentes) para reparar la pieza internamente.
3. **Reasignación de Reservas:** Verifica si la pieza está en inventario pero reservada para una orden de menor prioridad.
4. **Recomendación Óptima:** Sugiere la mejor ruta (Ej. "Reparar internamente para ahorrar $500 y evitar exceso de stock" o "Comprar al Proveedor A porque llega en 2 días").

## 🛠️ Stack Tecnológico y Patrocinadores

El proyecto hace uso de tecnologías modernas y aprovecha las herramientas provistas por los patrocinadores del Hackathon:

- **Tiger Data (PostgreSQL):** Motor transaccional principal para guardar el inventario, proveedores, Kardex de piezas, y el historial inmutable de movimientos.
- **Node.js + Express + KafkaJS:** Backend responsable de consumir los eventos de Kafka (Redpanda) emitidos por el simulador del taller (`shop.*`), aplicar las reglas de negocio, y exponer los endpoints REST.
- **Gemini / IA:** Motor analítico para evaluar la mejor ruta de abastecimiento (Comprar vs Reparar) ante cada sugerencia de compra.
- **ElevenLabs:** Inteligencia artificial para sintetizar voz dinámicamente y emitir alertas auditivas al personal cuando ocurren faltantes críticos.
- **Solana (Opcional/Exploración):** Registro criptográfico del *Audit Trail* para una auditoría inmutable.
- **Vultr / Backboard.io (Opcional):** Despliegue en la nube y tableros analíticos.
- **React + Vite + Tailwind:** Frontend (Dashboard) para visualización gerencial.

## 📋 Arquitectura y Reglas del Negocio

1. **Arquitectura Orientada a Eventos:** Consumimos tópicos de Kafka (`shop.catalog`, `shop.work_orders`, etc.) garantizando el manejo de desorden de eventos y deduplicación.
2. **Control Multilocalidad y Kardex:** Seguimiento del stock físico (`on_hand`) distribuido por ubicaciones, manteniendo el *Stock Disponible* real.
3. **Faltantes y Sugerencias de Compra Aumentadas:** El sistema emite sugerencias de reorden (`reorder-suggestions`) pero las "aumenta" con la recomendación de la IA (Smart Procurement).
4. **Pruebas de Contrato (Contract Tests):** El diseño pasa al 100% las pruebas automatizadas del jurado.

## 🗺️ Roadmap del Proyecto

- [x] **Fase 1:** Creación del modelo relacional base (Tiger Data).
- [ ] **Fase 1.5 (Ajuste al Contrato + Proveedores):** Refactorización del esquema SQL para ubicaciones, faltantes, y nuevas tablas de `providers` y `lead_times` para habilitar el Smart Procurement.
- [ ] **Fase 2 (Backend Kafka & API REST):** Inicialización de Node.js, conexión a Redpanda, e implementación de la especificación `openapi.yaml`.
- [ ] **Fase 3 (IA de Compras & Alertas):** Integración del motor de análisis de compras y ElevenLabs para alertas de voz.
- [ ] **Fase 4 (Frontend Gerencial):** Desarrollo del panel visual.

---
*Desarrollado para la Hackathon Hackstreet*
