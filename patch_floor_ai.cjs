const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');

// 1. Add AI state
c = c.replace(
  "const [availability, setAvailability] = useState(null);",
  "const [availability, setAvailability] = useState(null);\n  const [aiRecommendation, setAiRecommendation] = useState(null);\n  const [aiLoading, setAiLoading] = useState(false);"
);

// 2. Fetch AI recommendation when part is selected and stock is 0
c = c.replace(
  /fetchApi\(\`\/parts\/\$\{part\.part_id\}\/availability\`\)\.then\(setAvailability\)\.catch\(\(\) => setAvailability\(null\)\);/g,
  `fetchApi(\`/parts/\${part.part_id}/availability\`).then(avail => {
      setAvailability(avail);
      
      const localStock = avail?.locations?.find((l) => l.location_id === location?.location_id)?.on_hand || 0;
      
      // AI Logic requested by user: Evaluate if we don't have it (or stock is 0 here)
      if (localStock === 0) {
        setAiLoading(true);
        setAiRecommendation(null);
        fetchApi(\`/recommendations?q=\${encodeURIComponent("Qué hacemos si no hay stock de la pieza " + part.name + " (" + part.sku + ")?")}\`)
          .then(res => {
            let parsed = typeof res.recommendation === 'string' 
              ? JSON.parse(res.recommendation.replace(/^\\\`\\\`(?:json)?\\n?/gi, '').replace(/\\n?\\\`\\\`$/g, '').trim()) 
              : res.recommendation;
            setAiRecommendation(parsed);
          })
          .catch(e => console.error(e))
          .finally(() => setAiLoading(false));
      } else {
        setAiRecommendation(null);
        setAiLoading(false);
      }
    }).catch(() => {
      setAvailability(null);
      setAiRecommendation(null);
    });`
);

// 3. Render AI Recommendation box in Step 2
const renderAi = `
            {aiLoading && (
              <div className="mt-4 p-4 bg-violet-50 rounded-lg border border-violet-100 flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600"></div>
                <p className="text-sm text-violet-700">Analizando opciones (Reparación / Tiempos de entrega)...</p>
              </div>
            )}
            {aiRecommendation && !aiLoading && (
              <div className="mt-4 p-4 bg-violet-50 rounded-lg border border-violet-200">
                <h4 className="text-sm font-semibold text-violet-800 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                  Recomendación de la IA (Sin Stock Físico)
                </h4>
                <p className="text-sm text-slate-700 mb-3">{aiRecommendation.analisis}</p>
                {aiRecommendation.riesgos && aiRecommendation.riesgos.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Riesgos:</span>
                    <ul className="list-disc list-inside text-sm text-slate-600 mt-1">
                      {aiRecommendation.riesgos.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {aiRecommendation.recomendaciones && aiRecommendation.recomendaciones.map((r, i) => (
                  <div key={i} className="mb-2 last:mb-0 bg-white p-3 rounded border border-violet-100">
                    <p className="text-sm font-medium text-slate-800">{r.titulo}</p>
                    <p className="text-xs text-slate-600 mt-1">{r.descripcion}</p>
                  </div>
                ))}
              </div>
            )}
`;

// Insert the AI block right after the `<select>` in Step 2.
// The regex finds `</select>` and the closing tag or `</div>` after it.
c = c.replace(/<\/select>/, `</select>${renderAi}`);

// Reset state in reset()
c = c.replace(
  "setAvailability(null);",
  "setAvailability(null);\n      setAiRecommendation(null);\n      setAiLoading(false);"
);

fs.writeFileSync('frontend/src/pages/FloorPage.jsx', c, 'utf8');
