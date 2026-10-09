# Almacén Inteligente Hackstreet 🏭📦

Sistema de gestión inteligente de inventario para un taller especializado en la reparación de equipo industrial (husillos y motores eléctricos). Construido con una arquitectura orientada a eventos para integrarse al ecosistema operativo del taller en tiempo real.

Este proyecto da solución al desafío del Hackathon implementando un control estricto de existencias, reservas, faltantes, ubicaciones y movimientos inmutables, cumpliendo estrictamente con el contrato de eventos y la API OpenAPI (`openapi.yaml`) solicitada.

## 🛠️ Stack Tecnológico y Patrocinadores

El proyecto hace uso de tecnologías modernas y aprovecha las herramientas provistas por los patrocinadores del Hackathon:

- **Tiger Data (PostgreSQL):** Motor transaccional principal para guardar el inventario, el Kardex de piezas, las reservas, ubicaciones físicas y el historial inmutable de movimientos.
- **Node.js + Express + KafkaJS:** Backend responsable de consumir los eventos de Kafka (Redpanda) emitidos por el simulador del taller (`shop.*`), aplicar las reglas de negocio, y exponer los endpoints REST exigidos por el contrato.
- **ElevenLabs:** Inteligencia artificial para sintetizar voz dinámicamente y emitir alertas auditivas al personal cuando se detectan faltantes críticos (`shortages`) que bloquean órdenes de trabajo.
- **Solana (Opcional/Exploración):** Exploraremos la posibilidad de anclar los hashes de nuestro *Audit Trail* (historial de movimientos) en la blockchain de Solana para garantizar una auditoría 100% inmutable y transparente.
- **Vultr / Backboard.io (Opcional):** Posibles soluciones para el despliegue en la nube (VPS) y tableros analíticos del estado del inventario.
- **React + Vite + Tailwind:** Frontend (Dashboard) para que los administradores visualicen los faltantes, el Kardex y escuchen las alertas de voz.

## 📋 Arquitectura y Reglas del Negocio

1. **Arquitectura Orientada a Eventos:** Consumimos tópicos de Kafka (`shop.catalog`, `shop.work_orders`, `shop.inspections`, `shop.purchasing`) garantizando el manejo de desorden de eventos, reintentos y deduplicación mediante el `event_id`.
2. **Control Multilocalidad y Kardex:** Seguimiento del stock físico (`on_hand`) distribuido por ubicaciones (`location_id` como la recepción `U-100` o estantes), manteniendo el *Stock Disponible* que resta las reservas de órdenes en curso.
3. **Faltantes y Sugerencias de Compra:** El sistema detecta cuando una línea de inspección genera una necesidad no cubierta y levanta un registro de faltante. Si el faltante persiste, el sistema lanza la alarma de ElevenLabs y genera sugerencias de reorden (`reorder-suggestions`).
4. **Pruebas de Contrato (Contract Tests):** El diseño está condicionado a pasar al 100% las pruebas automatizadas del jurado, emitiendo respuestas idénticas a los JSON Schemas esperados.

## 🗺️ Roadmap del Proyecto (Fases Ajustadas)

- [x] **Fase 1 (Base de Datos Inicial):** Creación del modelo relacional base (Tiger Data).
- [ ] **Fase 1.5 (Ajuste al Contrato):** Refactorización del esquema SQL para incluir `locations`, rastreo de `event_id` para idempotencia, manejo de faltantes (`shortages`) y asociar reservas al `bom_line_id`.
- [ ] **Fase 2 (Backend Kafka & API REST):** Inicialización de Node.js, conexión al broker local de Redpanda, creación de consumidores de eventos e implementación de la especificación `openapi.yaml`.
- [ ] **Fase 3 (Alertas IA & Blockchain):** Conexión con ElevenLabs para las alertas de faltantes. Exploración de registro de auditoría en Solana.
- [ ] **Fase 4 (Frontend Gerencial):** Desarrollo del panel visual para consultar los endpoints del Backend (estado de piezas, Kardex, faltantes) e integrar los audios.

---
*Desarrollado para la Hackathon Hackstreet*
