const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');

if (!c.includes('allParts')) {
  // Add state
  c = c.replace(
    "const [inventory, setInventory] = useState([]);",
    "const [inventory, setInventory] = useState([]);\n  const [allParts, setAllParts] = useState([]);"
  );

  // Fetch /parts
  c = c.replace(
    "fetchApi('/inventory').then((d) => setInventory(d.items || [])).catch(() => toast('error', 'No se pudo conectar con el servidor (¿está encendido el backend?)'));",
    "fetchApi('/inventory').then((d) => setInventory(d.items || [])).catch(() => toast('error', 'No se pudo conectar con el servidor (¿está encendido el backend?)'));\n    fetchApi('/parts').then((d) => setAllParts(d.items || []));"
  );

  // Replace <p> in Step 2 with <select>
  const selectHtml = `            <div className="space-y-3">
              <p className="text-sm text-slate-500">Escanea arriba, o elige una de la lista (se muestran todas):</p>
              <select 
                className={inputCls} 
                value={part ? String(part.part_id) : ""} 
                onChange={(e) => {
                  if (e.target.value) {
                    const selectedPart = allParts.find(i => String(i.part_id) === e.target.value);
                    if (selectedPart) {
                      setPart({ part_id: selectedPart.part_id, name: selectedPart.name, sku: selectedPart.sku });
                    }
                  } else {
                    setPart(null);
                  }
                }}
              >
                {allParts.length === 0 ? (
                  <option value="">Cargando catálogo...</option>
                ) : (
                  <>
                    <option value="">-- Elige una pieza de la lista --</option>
                    {allParts.map(p => {
                      const inv = inventory.find(i => i.part_id === p.part_id && (!location || i.location_id === location.location_id));
                      const stock = inv ? inv.on_hand : 0;
                      return (
                        <option key={p.part_id} value={p.part_id}>
                          {p.name} (ID: {p.part_id}) {location ? \` - Stock: \${stock}\` : ''}
                        </option>
                      );
                    })}
                  </>
                )}
              </select>
            </div>`;

  c = c.replace(
    /<p className="text-sm text-slate-500">Escanea la pieza arriba o escribe su c[^<]+<\/p>/,
    selectHtml
  );

  fs.writeFileSync('frontend/src/pages/FloorPage.jsx', c, 'utf8');
  console.log("Added allParts dropdown successfully.");
} else {
  console.log("Already added allParts.");
}
