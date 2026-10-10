# Casos de prueba — Almacén Inteligente

Guía para probar a mano las 4 pantallas de la app (**Piso, Almacén, Órdenes, Kardex**) en http://localhost:5173.

> **Antes de empezar**
> - Backend encendido en `http://localhost:8000` (`cd backend; node src/index.js`) y frontend con `npm run dev`.
> - Los datos viven en la base compartida (Tiger Data). Las pruebas **modifican el stock**: anota los valores antes y, al final, usa la prueba **P-12** para dejar la pieza como estaba.
> - Los datos de ejemplo de abajo existían al momento de escribir este documento. Si cambiaron, busca otra pieza en **Almacén → Existencias** y adapta los números.

## Datos de referencia

| Qué | Valor | Notas |
|---|---|---|
| Pieza sencilla | **ID 38** · `RESORTES DMS080` | 6 en mano, 0 reservado, en `U-100` |
| Pieza con reserva | **ID 50** · `MN70-2-16` | 5 en mano, 4 reservado, 1 disponible, en `U-100` |
| Pieza con mucho stock | **ID 62** · `MN70-1.5-20` | 13 en mano, 3 reservado |
| Pieza con 1 unidad | **ID 1** · `FLECHA-007` | 1 en mano |
| Ubicación recepción | `U-100` (ID 100) | Aquí entra todo el material |
| Ubicaciones de estante | `U-101` … `U-112` | Almacén refacciones, estantes A, B, C |
| Orden con faltante | `R709769032` | Pieza "PIEZA DE PRUEBA CICLO": requiere 8, reservado 5, falta 3 |
| Recepción sin relacionar | Código `PROV-…` | Aparece en **Almacén → Sin relacionar** |

**Códigos que puedes escribir en la barra de escaneo del Piso:** `U-101`, `U-100`, `FLECHA-007`, `38`, `resortes`.

---

## 1. PISO (terminal de escaneo)

### Escaneo y selección

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| P-01 | Escanear ubicación válida | Escribe `U-101` en la barra y Enter | El paso 1 se pone verde con `U-101 · Almacén refacciones estante A nivel 1`. Aviso verde |
| P-02 | Escanear pieza por SKU | Escribe `FLECHA-007` y Enter | Paso 2 verde con "Flecha KESSLER LC-100" y etiquetas Total / Reservado / Disponible |
| P-03 | Escanear pieza por ID | Escribe `38` y Enter | Se selecciona "RESORTES DMS080" |
| P-04 | Buscar por nombre | Escribe `resortes` y Enter | Una coincidencia → se selecciona. Varias → lista para elegir |
| P-05 | Código ambiguo | Escribe un texto que coincida con varias piezas (ej. `MN70`) | Aviso amarillo y lista de piezas; ninguna queda seleccionada hasta que toques una |
| P-06 | Código inexistente | Escribe `XXXNOEXISTE` y Enter | Aviso rojo "Código no reconocido"; no cambia nada |
| P-07 | Elegir ubicación de la lista | En el paso 1 abre el desplegable y elige `U-102` | Se selecciona esa ubicación |
| P-08 | Cambiar ubicación o pieza | Toca **Cambiar** en el paso 1 o 2 | Vuelve a pedir el dato |
| P-09 | Existencia en la ubicación | Elige pieza 38 y ubicación `U-100` | Etiqueta "En U-100: 6". Con `U-101`: "En U-101: 0" en rojo |

### Retirar (salida)

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| P-10 | Retiro simple | Acción **Retirar** · ubicación `U-100` · pieza 38 · cantidad 1 · Confirmar | Aviso verde. Existencia baja de 6 a 5. Aparece "Último movimiento" |
| P-11 | Retiro con orden | Igual, pero en "Orden de trabajo" escribe un código existente (ej. `R709769032`) con pieza reservada para esa orden | Se descuenta primero lo **reservado** para esa orden. En **Órdenes** sube "Entregado" |
| P-12 | Dejar el stock como estaba | Usa **Contar** (ver abajo) para volver a 6 | Aviso verde |
| P-13 | Retiro mayor al saldo | Pieza 38 · `U-100` · cantidad **999** | Aviso rojo "Insufficient available stock" (HTTP 409). Nada cambia |
| P-14 | Retiro de lo reservado por otra orden | Pieza 50 (disponible 1) · cantidad 3 · **sin** orden | Rechazado (409): lo reservado no está disponible para otros |
| P-15 | Retiro desde ubicación sin stock | Pieza 38 · `U-105` · cantidad 1 | Rechazado (409) |
| P-16 | Cantidad cero | Cantidad 0 | El sistema debe rechazarla o no mover nada (revisa Kardex) |

### Transferir

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| P-20 | Transferencia correcta | **Transferir** · origen `U-100` · pieza 38 · cantidad 2 · destino `U-101` · Confirmar | Aviso verde. En Kardex aparecen 2 movimientos (salida de `U-100`, entrada a `U-101`) |
| P-21 | Falta destino | No elijas destino | El botón Confirmar está deshabilitado; muestra "Falta: destino" |
| P-22 | Transferir más de lo que hay | Pieza 38 · origen `U-100` · cantidad 999 | Rechazado (409) "Insufficient available stock" |
| P-23 | Origen = destino | El desplegable de destino no ofrece la ubicación de origen | No se puede elegir la misma |
| P-24 | Regreso | Transfiere de vuelta de `U-101` a `U-100` | El total de la pieza no cambia; Kardex muestra ida y vuelta |

### Contar (conteo físico)

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| P-30 | Conteo igual al saldo | **Contar** · `U-100` · pieza 38 · cantidad 6 · motivo "Prueba" | Aviso verde; no hay ajuste (el saldo ya era 6) |
| P-31 | Conteo menor | Cantidad 4 · motivo "Pieza dañada" | Existencia baja a 4; Kardex muestra un movimiento de ajuste de −2 |
| P-32 | Conteo mayor | Cantidad 6 | Existencia sube a 6 (ajuste +2). **Así dejas la pieza como estaba** |
| P-33 | Sin motivo | Deja el motivo vacío | Confirmar deshabilitado ("Falta: motivo"). Por API, responde 422 "Reason is required" |
| P-34 | Conteo en ubicación nueva | Pieza 38 · `U-103` · cantidad 3 · motivo "Hallazgo" | Se crea saldo de 3 en `U-103` |

### Usabilidad del Piso

| # | Caso | Resultado esperado |
|---|---|---|
| P-40 | Botones + / − | Cambian la cantidad de 1 en 1; no baja de 0 |
| P-41 | Cantidad con decimales | Acepta `0.5` si la pieza lo permite |
| P-42 | Flujo repetido | Tras confirmar se conserva la ubicación y se limpia la pieza → escanear la siguiente |
| P-43 | "Empezar de cero" | Limpia ubicación y destino |
| P-44 | Caja "¿Cómo se usa?" | Se abre/cierra y recuerda su estado al recargar |
| P-45 | Móvil | Reduce la ventana (<768 px): aparece barra inferior con 4 pestañas y los botones siguen grandes |
| P-46 | Backend apagado | Aviso rojo "No se pudo conectar con el servidor" |

---

## 2. ALMACÉN

### Existencias

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| A-01 | Ver existencias | Pestaña/tarjeta **Existencias** | Tabla con pieza, ubicación, en mano, reservado y disponible |
| A-02 | Buscar por nombre | Escribe `resortes` | Solo filas de esa pieza |
| A-03 | Buscar por ubicación | Escribe `U-101` | Solo piezas en esa ubicación |
| A-04 | Buscar por ID | Escribe `50` | Pieza 50 (en mano 5, reservado 4, disponible 1) |
| A-05 | Sin resultados | Escribe `zzzz` | Mensaje "No hay existencias que coincidan" |
| A-06 | Colores de disponible | Revisa la columna | Verde si hay, gris si es 0, rojo si es negativo (solo tras un conteo menor al reservado) |
| A-07 | Reflejo de movimientos | Haz un retiro en Piso y pulsa **Actualizar** | La existencia cambia |
| A-08 | Botón Actualizar | Pulsa Actualizar | El ícono gira y los números se refrescan |

### Faltantes

| # | Caso | Resultado esperado |
|---|---|---|
| A-10 | Ver faltantes | Lista de orden + pieza + cantidad que falta (ej. `R709769032` falta 3) |
| A-11 | Faltante sin pieza identificada | Se muestra la etiqueta "Pieza sin identificar" |
| A-12 | Sin faltantes | Mensaje "¡Todo surtido!" |
| A-13 | Cantidad de la tarjeta | El número de la tarjeta roja coincide con las filas de la tabla |

### Sugerencias de compra

| # | Caso | Resultado esperado |
|---|---|---|
| A-20 | Ver sugerencias | Tarjetas con "N por comprar" y cuántas órdenes cubre |
| A-21 | Cálculo | Sugerido = faltante total − disponible (nunca negativo) |
| A-22 | Desaparece al surtir | Si llega material suficiente (o se cancela la orden), la sugerencia desaparece tras Actualizar |

### Recepciones sin relacionar

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| A-30 | Ver pendientes | Tarjeta **Sin relacionar** | Lista con "Código recibido", descripción y cantidad |
| A-31 | Relacionar correctamente | **Relacionar** → el buscador viene prellenado con el código → busca → toca la pieza correcta | Aviso verde; la recepción desaparece de la lista; el stock de esa pieza sube en `U-100` |
| A-32 | Búsqueda sin resultados | Busca `zzzz` | Aviso "Sin resultados" |
| A-33 | Relacionar dos veces | Intenta relacionar una recepción ya resuelta (otra pestaña) | Error 409 "Already resolved" |
| A-34 | Verificar en Kardex | Después de A-31 abre Kardex de esa pieza | Hay una nueva **Entrada** por la cantidad recibida |
| A-35 | Cerrar panel | Pulsa **Cerrar** | Se oculta el buscador |

---

## 3. ÓRDENES DE TRABAJO

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| O-01 | Buscar orden existente | Escribe `R709769032` → Buscar | Tarjetas de totales y una línea "PIEZA DE PRUEBA CICLO" |
| O-02 | Cifras de la línea | Revisa la línea | Requerido 8, Reservado 5, Entregado 0, **Falta 3**, barra amarilla al ~63 % |
| O-03 | Resaltado de faltante | Revisa colores | Línea con fondo rojo claro y etiqueta "Con faltantes" |
| O-04 | Orden inexistente | Escribe `NOEXISTE` | Aviso rojo "No existe la orden" |
| O-05 | Atajo de órdenes | Toca una etiqueta roja de "Órdenes con faltantes" | Carga esa orden directamente |
| O-06 | Orden sin materiales | Busca una orden sin necesidades | Mensaje "aún no tiene materiales requeridos" |
| O-07 | Pieza sin identificar | Orden cuya línea no tiene pieza | Línea "Pieza sin identificar" y requerido posiblemente "?" |
| O-08 | Entrega en Piso refleja | Haz un retiro con esa orden (P-11) y vuelve a buscarla | "Entregado" sube y "Reservado" baja |
| O-09 | Orden surtida | Una orden con todo reservado/entregado | Etiqueta verde "Surtida" y barra completa |
| O-10 | Espacios en el código | Escribe ` R709769032 ` con espacios | Debe encontrarla (se recorta el texto) |

---

## 4. KARDEX

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| K-01 | Buscar por nombre | Escribe `resortes` → Buscar | Una coincidencia → abre directo; varias → lista |
| K-02 | Buscar por ID | Escribe `38` | Abre el kardex de la pieza 38 |
| K-03 | Orden de los movimientos | Revisa la tabla | Del **más reciente al más antiguo** |
| K-04 | Saldo corrido | Revisa la columna Saldo | La última entrada (más antigua) empieza en su cantidad; cada fila es el saldo **después** del movimiento |
| K-05 | Tarjetas resumen | Revisa arriba | Saldo actual = saldo del movimiento más reciente; entradas y salidas suman correctamente |
| K-06 | Tipos de movimiento | Tras P-10, P-20, P-31 | Etiquetas: Entrada (verde), Salida (roja), Transfer. entrada/salida, Ajuste |
| K-07 | Transferencia | Tras P-20 | Dos filas con ubicaciones distintas y cantidades +2 / −2 |
| K-08 | Pieza sin movimientos | Pieza creada sin recepciones | Mensaje "aún no tiene movimientos" |
| K-09 | Pieza inexistente | Escribe `zzzz` | Aviso "No se encontró ninguna pieza" |
| K-10 | Coherencia con Almacén | Compara el saldo actual con la suma de "En mano" por ubicaciones en Almacén | Deben coincidir |

---

## 5. Pruebas de extremo a extremo (guion de demo, ~5 min)

1. **Almacén → Faltantes:** muestra una orden con faltante (ej. `R709769032`, falta 3).
2. **Órdenes:** busca esa orden y enseña requerido 8 / reservado 5 / falta 3.
3. **Almacén → Por comprar:** muestra la sugerencia generada.
4. **Almacén → Sin relacionar:** relaciona una recepción con su pieza correcta.
5. **Piso:** escanea `U-100`, luego la pieza, **Retirar** 1 con el código de la orden → aviso verde.
6. **Órdenes:** vuelve a buscar y muestra que "Entregado" subió.
7. **Kardex:** abre la pieza y muestra la salida con su saldo corrido.
8. **Piso → Contar:** corrige una existencia con motivo; muestra el ajuste en Kardex.
9. **Voz:** con "Voz activada" en el encabezado, cuando se abra un faltante nuevo se escucha el aviso.

## 6. Alertas de voz

| # | Caso | Resultado esperado |
|---|---|---|
| V-01 | Activar voz | Botón **Voz** en el encabezado → dice "Alertas de voz activadas" |
| V-02 | Faltante nuevo | Al aparecer un faltante (la app consulta cada 8 s) se escucha "Alerta: se abrió un nuevo faltante en el almacén" y sale un aviso rojo |
| V-03 | Silenciar | Apaga la voz: el aviso rojo sigue saliendo pero sin sonido |
| V-04 | Preferencia | Recarga la página: la preferencia se conserva |

## 7. Pruebas directas de API (opcional, PowerShell)

```powershell
$u = 'http://localhost:8000'
# Disponibilidad y kardex
Invoke-RestMethod "$u/parts/38/availability"
Invoke-RestMethod "$u/parts/38/ledger"
# Retiro correcto / retiro excesivo (409)
Invoke-RestMethod -Method Post "$u/issues" -ContentType 'application/json' -Body '{"part_id":38,"location_id":100,"quantity":1}'
Invoke-RestMethod -Method Post "$u/issues" -ContentType 'application/json' -Body '{"part_id":38,"location_id":100,"quantity":999}'
# Conteo sin motivo (422) y con motivo
Invoke-RestMethod -Method Post "$u/counts" -ContentType 'application/json' -Body '{"location_id":100,"lines":[{"part_id":38,"counted_quantity":6}]}'
Invoke-RestMethod -Method Post "$u/counts" -ContentType 'application/json' -Body '{"location_id":100,"reason":"prueba","lines":[{"part_id":38,"counted_quantity":6}]}'
```

| Llamada | Código esperado |
|---|---|
| `POST /issues` con saldo suficiente | 200 |
| `POST /issues` o `/transfers` con saldo insuficiente | 409 `Insufficient available stock` |
| `POST /counts` sin `reason` | 422 `Reason is required` |
| `GET /work-orders/NOEXISTE/materials` | 404 |
| `GET /scan/CODIGOINEXISTENTE` | 404 |

## 8. Lista rápida de verificación final

- [ ] Las 4 pantallas cargan sin errores rojos en consola.
- [ ] Retirar / Transferir / Contar funcionan y aparecen en el Kardex.
- [ ] Los saldos de Almacén y Kardex coinciden.
- [ ] Un retiro con orden actualiza "Entregado" en Órdenes.
- [ ] Una recepción sin relacionar se puede resolver y sube el stock.
- [ ] La voz avisa de un faltante nuevo.
- [ ] La app se ve bien en pantalla de celular.
- [ ] El stock de pruebas quedó restaurado.
