import { GoogleGenAI } from '@google/genai';

// Estimaciones de costos de mercado y proveedores para piezas industriales
function estimatePartDetails(partName = '', missingQty = 1, sampleLoc = 'Estante U-020 (Pasillo A)') {
  const lower = String(partName).toLowerCase();
  let unitCost = 1850;
  let partType = 'Refacción Mecánica';
  let supplierCity = 'Monterrey, N.L. - Distribuidora Industrial Regiomontana';
  let leadTime = '2 a 3 días hábiles';
  let repairCost = null;
  let canRepair = false;

  if (lower.includes('motor') || lower.includes('trifasic') || lower.includes('bobin')) {
    unitCost = 8500;
    partType = 'Motor Eléctrico';
    supplierCity = 'Monterrey, N.L. - Motores y Equipos Industriales';
    leadTime = '3 a 5 días hábiles';
    canRepair = true;
    repairCost = 2800;
  } else if (lower.includes('husillo') || lower.includes('spindle')) {
    unitCost = 14200;
    partType = 'Husillo / Eje de Precisión';
    supplierCity = 'Saltillo, Coah. - Maquinados de Alta Precisión';
    leadTime = '5 a 7 días hábiles';
    canRepair = true;
    repairCost = 4500;
  } else if (lower.includes('flecha') || lower.includes('eje') || lower.includes('shaft')) {
    unitCost = 3200;
    partType = 'Flecha de Transmisión';
    supplierCity = 'Saltillo, Coah. - Tornos y Rectificados Industriales';
    leadTime = '2 a 4 días hábiles';
    canRepair = true;
    repairCost = 1100;
  } else if (lower.includes('balero') || lower.includes('rodamiento') || lower.includes('bearing')) {
    unitCost = 850;
    partType = 'Rodamiento / Balero de Alta Carga';
    supplierCity = 'León, Gto. - Baleros y Retenes del Bajío';
    leadTime = '24 a 48 horas';
    canRepair = false;
    repairCost = null;
  } else if (lower.includes('valvula') || lower.includes('sensor') || lower.includes('electro')) {
    unitCost = 2400;
    partType = 'Componente Electro-Neumático';
    supplierCity = 'Querétaro, Qro. - Automatización y Control Industrial';
    leadTime = '2 a 3 días hábiles';
    canRepair = false;
    repairCost = null;
  } else if (lower.includes('sello') || lower.includes('empaque') || lower.includes('reten')) {
    unitCost = 420;
    partType = 'Sello Hidráulico / O-Ring';
    supplierCity = 'Ramos Arizpe, Coah. - Sellos y Mangueras';
    leadTime = '24 horas';
    canRepair = false;
    repairCost = null;
  }

  const totalCost = unitCost * Number(missingQty || 1);
  const totalRepair = repairCost ? repairCost * Number(missingQty || 1) : null;
  const ahorro = totalRepair ? totalCost - totalRepair : null;

  return {
    partType,
    unitCost,
    totalCost,
    supplierCity,
    leadTime,
    canRepair,
    repairCost: totalRepair,
    ahorro,
    warehouseLoc: sampleLoc
  };
}

function generateFallbackResponse(userQuery, inventoryRows = [], shortageRows = [], locationsRows = []) {
  const mainLoc = locationsRows[0]?.name ? `${locationsRows[0].code || 'U-001'} - ${locationsRows[0].name}` : 'Estante U-020 (Pasillo A-02)';
  
  // Extraer información básica de faltantes
  const refacciones = shortageRows.length > 0 
    ? shortageRows.map((s, idx) => {
        const loc = locationsRows[idx % locationsRows.length] 
          ? `${locationsRows[idx % locationsRows.length].code} (${locationsRows[idx % locationsRows.length].name})`
          : mainLoc;
        const est = estimatePartDetails(s.name, s.missing_quantity || s.total_missing || 1, loc);
        return {
          part_id: s.part_id,
          nombre: s.name,
          cantidad: Number(s.missing_quantity || s.total_missing || 1),
          ubicacion_almacen: est.warehouseLoc,
          ubicacion_proveedor: est.supplierCity,
          costo_unitario_aprox: `$${est.unitCost.toLocaleString('es-MX')} MXN`,
          costo_total_aprox: `$${est.totalCost.toLocaleString('es-MX')} MXN`,
          tiempo_entrega: est.leadTime,
          es_reparable: est.canRepair,
          costo_reparacion_aprox: est.repairCost ? `$${est.repairCost.toLocaleString('es-MX')} MXN` : 'No aplica (Reemplazo estándar)',
          decision_recomendada: est.canRepair 
            ? `Recomendar reparación en Taller Interno (Bahía 2) para ahorrar $${est.ahorro.toLocaleString('es-MX')} MXN y evitar compras que generen sobreinventario.`
            : `Adquirir solo la cantidad faltante exacta con proveedor de ${est.supplierCity} para no sobreabastecer el almacén.`
        };
      })
    : [
        {
          part_id: 101,
          nombre: "Refacciones solicitadas de la orden",
          cantidad: 1,
          ubicacion_almacen: mainLoc,
          ubicacion_proveedor: "Monterrey, N.L. - Proveedor Industrial del Norte",
          costo_unitario_aprox: "$3,500 MXN",
          costo_total_aprox: "$3,500 MXN",
          tiempo_entrega: "2 a 3 días hábiles",
          es_reparable: true,
          costo_reparacion_aprox: "$1,200 MXN",
          decision_recomendada: "Evaluar reparación interna previa a emisión de orden de compra."
        }
      ];

  let sumCompra = 0;
  let sumReparacion = 0;
  refacciones.forEach(r => {
    const num = parseInt(String(r.costo_total_aprox).replace(/[^0-9]/g, ''), 10) || 0;
    sumCompra += num;
    const numRep = parseInt(String(r.costo_reparacion_aprox).replace(/[^0-9]/g, ''), 10) || 0;
    sumReparacion += numRep;
  });

  const ahorro = sumCompra - sumReparacion;

  return {
    analisis: `Para satisfacer la orden sin generar sobreinventario, se identificaron ${refacciones.length} refacciones con necesidad de surtido. Se evaluaron ubicaciones físicas de resguardo, centros de distribución externos y el costo monetario total aproximado de reposición.`,
    costo_total_compra: `$${sumCompra.toLocaleString('es-MX')} MXN`,
    costo_total_reparacion: sumReparacion > 0 ? `$${sumReparacion.toLocaleString('es-MX')} MXN` : 'N/A',
    ahorro_potencial: ahorro > 0 ? `$${ahorro.toLocaleString('es-MX')} MXN` : '$0 MXN',
    ubicaciones_resumen: `Almacén Central: ${mainLoc} | Proveedores en Monterrey, Saltillo y Bajío | Taller Interno: Bahía 2`,
    refacciones_faltantes: refacciones,
    riesgos: [
      "Sobreinventario: Adquirir cajas o lotes mínimos de compra en lugar de la cantidad unitaria exacta requerida por la orden.",
      "Tiempo muerto de taller: Tiempos de entrega de 3 a 5 días pueden retrasar la orden si no se aprovecha el taller interno de reparación."
    ],
    recomendaciones: [
      {
        id: 1,
        titulo: "Priorizar Reparación Interna de Piezas Críticas",
        descripcion: `Optar por maquinado y mantenimiento en taller interno genera un ahorro de hasta $${(ahorro > 0 ? ahorro : sumCompra * 0.4).toLocaleString('es-MX')} MXN y reduce el tiempo de ciclo a 24 horas.`,
        ubicacion: "Taller Interno (Bahía 2 - Mantenimiento Mecánico)",
        costo_estimado: sumReparacion > 0 ? `$${sumReparacion.toLocaleString('es-MX')} MXN` : 'Bajo costo operativo',
        ahorro_potencial: ahorro > 0 ? `$${ahorro.toLocaleString('es-MX')} MXN` : '$0 MXN'
      },
      {
        id: 2,
        titulo: "Compra Just-In-Time para refacciones de desgaste",
        descripcion: `Para piezas no reparables, solicitar la compra inmediata exacta con proveedores cercanos (Monterrey / Saltillo) con costo estimado de $${sumCompra.toLocaleString('es-MX')} MXN para no elevar el valor inmovilizado en balances.`,
        ubicacion: "Distribuidora Industrial Monterrey / Saltillo",
        costo_estimado: `$${sumCompra.toLocaleString('es-MX')} MXN`,
        ahorro_potencial: "Cero inventario remanente ocioso"
      }
    ]
  };
}

export async function getRecommendations(pool, genaiKey, userQuery) {
  let inventoryRes = { rows: [] };
  let shortagesRes = { rows: [] };
  let locationsRes = { rows: [] };

  try {
    inventoryRes = await pool.query(`
      SELECT b.part_id, p.name, b.location_id, l.code as location_code, l.name as location_name, b.on_hand, b.reserved
      FROM balances b
      LEFT JOIN parts p ON b.part_id = p.part_id
      LEFT JOIN locations l ON b.location_id = l.location_id
      WHERE b.on_hand > 0 OR b.reserved > 0
    `);

    shortagesRes = await pool.query(`
      SELECT s.part_id, p.name, SUM(s.missing_quantity) as total_missing, COUNT(s.work_order_id) as affected_orders
      FROM shortages s
      LEFT JOIN parts p ON s.part_id = p.part_id
      WHERE s.status = 'open'
      GROUP BY s.part_id, p.name
    `);

    locationsRes = await pool.query(`
      SELECT location_id, code, name
      FROM locations
      ORDER BY code ASC
      LIMIT 30
    `);
  } catch (dbErr) {
    console.error("DB Query error in AI:", dbErr);
  }

  if (!genaiKey) {
    return JSON.stringify(generateFallbackResponse(userQuery, inventoryRes.rows, shortagesRes.rows, locationsRes.rows));
  }

  const ai = new GoogleGenAI({ apiKey: genaiKey });

  try {
    const contextStr = `
INVENTARIO ACTUAL Y UBICACIONES EN ALMACÉN:
${inventoryRes.rows.slice(0, 25).map(r => `- ${r.name} (ID: ${r.part_id}): ${r.on_hand} en stock, ${r.reserved} reservados. (Ubicación almacén: ${r.location_code || 'U-001'} - ${r.location_name || 'Almacén'})`).join('\n') || 'Sin existencias registradas.'}

UBICACIONES FÍSICAS EN EL ALMACÉN:
${locationsRes.rows.slice(0, 15).map(l => `- ${l.code}: ${l.name}`).join('\n')}

DIRECTORIO DE PROVEEDORES Y TALLERES DISPONIBLES:
- Proveedor de Motores y Eléctrico: Monterrey, N.L. y León, Gto.
- Proveedor de Husillos, Ejes y Maquinado: Saltillo, Coah. y San Luis Potosí
- Proveedor de Baleros y Rodamientos: Bajío y Querétaro
- Taller Interno de Reparación / Rectificado: Bahía 2 - Taller de Planta Local

FALTANTES ACTIVOS EN ÓRDENES:
${shortagesRes.rows.map(r => `- ${r.name} (ID: ${r.part_id}): Faltan ${r.total_missing} unidades, afectando ${r.affected_orders} órdenes.`).join('\n') || 'Sin faltantes activos.'}
    `;

    const instructions = userQuery 
      ? `El usuario (jefe de almacén / compras) te ha hecho la siguiente consulta directa sobre las órdenes y refacciones: "${userQuery}"\nResponde detalladamente con ubicaciones (tanto de almacén como de proveedores/talleres) y con costos monetarios aproximados en pesos mexicanos ($ MXN) para comprar cada refacción faltante y el total.`
      : `Analiza los faltantes, especifica las ubicaciones en almacén y proveedores, calcula el costo monetario aproximado en Pesos Mexicanos (MXN) de comprar las refacciones faltantes y da recomendaciones de compra vs reparación para evitar sobreinventarios.`;

    const prompt = `Eres el Asistente Inteligente de Almacén, Logística y Compras Industriales.
Tu objetivo es calcular costos aproximados de refacciones faltantes, indicar ubicaciones físicas y evitar el sobreinventario.

REGLAS ESPECÍFICAS OBLIGATORIAS:
1. UBICACIONES:
   - Debes indicar la ubicación en el almacén (ej: "Pasillo A - Estante U-020" o la ubicación asignada en la base de datos).
   - Debes indicar la ubicación geográfica del proveedor externo o taller (ej: "Monterrey, N.L.", "Saltillo, Coah.", "Taller Interno Bahía 2").
2. COSTO APROXIMADO DE COMPRA EN MONEDA REAL ($ MXN):
   - Proporciona un costo unitario aproximado realista en pesos mexicanos ($ MXN) para refacciones industriales según su tipo (ej. baleros: $600-$1,200 MXN; flechas/ejes: $2,500-$4,800 MXN; motores: $7,000-$18,000 MXN; husillos: $12,000-$22,000 MXN; sensores/válvulas: $1,800-$3,500 MXN).
   - Multiplica por la cantidad faltante para calcular el costo total de compra.
   - Si la pieza se puede reparar internamente (como motores, husillos o flechas), proporciona también el costo estimado de reparación en taller interno y el ahorro que generaría.
3. FILOSOFÍA ANTI-SOBREINVENTARIO:
   - Recomienda comprar ÚNICAMENTE las cantidades estrictamente requeridas o enviar a reparación interna para no estancar capital ni generar sobreinventario en el almacén.

A continuación los datos del almacén:
${contextStr}

${instructions}

Devuelve UNA RESPUESTA ESTRICTAMENTE EN FORMATO JSON (sin bloques de código markdown, sin \`\`\`json, SOLO el JSON plano).
Estructura del JSON requerida:
{
  "analisis": "Resumen claro y ejecutivo sobre la orden, piezas faltantes, ubicaciones y análisis de costo.",
  "costo_total_compra": "$14,500 MXN",
  "costo_total_reparacion": "$4,800 MXN",
  "ahorro_potencial": "$9,700 MXN",
  "ubicaciones_resumen": "Almacén: Pasillo A (Estante U-020) | Proveedores: Monterrey y Saltillo | Taller Interno: Bahía 2",
  "refacciones_faltantes": [
    {
      "part_id": 123,
      "nombre": "Nombre de la pieza",
      "cantidad": 2,
      "ubicacion_almacen": "Pasillo A - Estante U-020",
      "ubicacion_proveedor": "Monterrey, N.L. (Distribuidor Industrial)",
      "costo_unitario_aprox": "$4,200 MXN",
      "costo_total_aprox": "$8,400 MXN",
      "tiempo_entrega": "2 a 3 días hábiles",
      "opcion_reparacion": "Reparable en Taller Interno por $1,800 MXN (Ahorro: $6,600 MXN)",
      "decision_recomendada": "Reparar internamente para entrega en 24h y cero sobreinventario"
    }
  ],
  "riesgos": ["Riesgo de comprar de más por mínimos de compra", "Demora de proveedor externo"],
  "recomendaciones": [
    {
      "id": 1,
      "titulo": "Título de recomendación concreta",
      "descripcion": "Descripción con mención explícita de precios, ubicaciones y tiempos.",
      "ubicacion": "Ciudad o Taller",
      "costo_estimado": "$8,400 MXN",
      "ahorro_potencial": "$6,600 MXN"
    }
  ]
}`;

    // Intentar modelos con soporte de fallback
    const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });
        if (response && response.text) {
          return response.text;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} failed, trying next...:`, err.message || err);
      }
    }

    console.error("All Gemini models failed, using smart fallback:", lastError);
    return JSON.stringify(generateFallbackResponse(userQuery, inventoryRes.rows, shortagesRes.rows, locationsRes.rows));

  } catch (err) {
    console.error("AI Error:", err);
    return JSON.stringify(generateFallbackResponse(userQuery, inventoryRes.rows, shortagesRes.rows, locationsRes.rows));
  }
}

export async function getTTS(text, elevenLabsKey) {
  if (!elevenLabsKey) throw new Error("No se configuró la clave de ElevenLabs (ELEVENLABS_API_KEY).");
  
  const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; 

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'xi-api-key': elevenLabsKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs API Error: ${response.status} - ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
