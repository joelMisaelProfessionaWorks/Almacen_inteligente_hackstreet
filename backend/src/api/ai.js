import { GoogleGenAI } from '@google/genai';

export async function getRecommendations(pool, genaiKey, userQuery) {
  if (!genaiKey) return JSON.stringify({ error: "No se configuró la clave de Gemini (GEMINI_API_KEY)." });

  const ai = new GoogleGenAI({ apiKey: genaiKey });

  try {
    const inventoryRes = await pool.query(`
      SELECT b.part_id, p.name, b.location_id, l.name as location_name, b.on_hand, b.reserved
      FROM balances b
      LEFT JOIN parts p ON b.part_id = p.part_id
      LEFT JOIN locations l ON b.location_id = l.location_id
      WHERE b.on_hand > 0 OR b.reserved > 0
    `);

    const shortagesRes = await pool.query(`
      SELECT s.part_id, p.name, SUM(s.missing_quantity) as total_missing, COUNT(s.work_order_id) as affected_orders
      FROM shortages s
      LEFT JOIN parts p ON s.part_id = p.part_id
      WHERE s.status = 'open'
      GROUP BY s.part_id, p.name
    `);

    const contextStr = `
INVENTARIO ACTUAL:
${inventoryRes.rows.map(r => `- ${r.name} (ID: ${r.part_id}): ${r.on_hand} en stock, ${r.reserved} reservados. (Ubicación: ${r.location_name})`).join('\n')}

FALTANTES ACTIVOS (URGENTES):
${shortagesRes.rows.map(r => `- ${r.name} (ID: ${r.part_id}): Faltan ${r.total_missing} unidades, afectando ${r.affected_orders} órdenes.`).join('\n') || 'No hay faltantes activos.'}
    `;

    const instructions = userQuery 
      ? `El usuario (almacenista) te ha hecho la siguiente consulta directa sobre el almacén: "${userQuery}"\nResponde a su consulta basándote en los datos reales del inventario.`
      : `Identifica riesgos y da 3 recomendaciones claras al almacenista sobre qué debe surtir, comprar o mover.`;

        const prompt = `Eres el Asistente Inteligente del Almacén, experto en optimización de inventarios.

ENFOQUE PRINCIPAL: EVITAR EL SOBREINVENTARIO.
Cuando el usuario pregunte por una pieza, debes aplicar ESTRICTAMENTE este árbol de decisión:
1. ¿Lo tenemos en inventario? Si sí, indícalo claramente indicando que ya se puede proceder al cobro / surtido.
2. Si NO lo tenemos (o no alcanza), evalúa las siguientes alternativas:
   a) Reparación interna: ¿Es una pieza que se pueda reparar en nuestros talleres (Motores, Electrónica, Husillos)? Si es así, sugiere la reparación.
   b) Compra externa: Estima un tiempo de entrega (Lead Time) lógico para el tipo de pieza industrial y menciona proveedores típicos.
3. Concluye evaluando qué proceso se acomoda mejor a la situación actual, siempre priorizando la estrategia que evite generar sobreinventario.

A continuación te proporciono el estado actual del almacén (inventario y faltantes):

${contextStr}

${instructions}

Devuelve UNA RESPUESTA ESTRICTAMENTE EN FORMATO JSON (sin bloques de código markdown, sin \`\`\`json, SOLO el JSON plano).
Estructura del JSON obligatoria:
{
  "analisis": "Resumen rápido aplicando el árbol de decisión sobre la pieza.",
  "riesgos": ["Riesgo de sobreinventario", "Otro riesgo (Opcional)"],
  "recomendaciones": [
    {
      "id": 1,
      "titulo": "Título de la acción recomendada (Ej. Mandar a reparar vs Comprar)",
      "descripcion": "Descripción detallada de por qué esta es la mejor opción para evitar sobreinventario, estimación de tiempos de entrega o talleres a usar.",
      "piezas_relacionadas": [
        { "part_id": 123, "name": "Nombre de la pieza relevante" }
      ]
    }
  ]
}
Asegúrate de extraer los part_id reales del contexto proporcionado. Proporciona de 1 a 3 recomendaciones dependiendo de lo que se te pidió.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return response.text;
  } catch (err) {
    console.error("AI Error:", err);
    return JSON.stringify({ error: "Ocurrió un error al generar la respuesta. Verifica que la cuota de la API no esté agotada." });
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
