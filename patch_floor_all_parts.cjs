const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');

// Add allParts state
c = c.replace(
  "const [inventory, setInventory] = useState([]);",
  "const [inventory, setInventory] = useState([]);\n  const [allParts, setAllParts] = useState([]);"
);

// Fetch /parts inside useEffect
c = c.replace(
  "fetchApi('/inventory').then((d) => setInventory(d.items || [])).catch(() => toast('error', 'No se pudo conectar con el servidor (¿está encendido el backend?)'));",
  "fetchApi('/inventory').then((d) => setInventory(d.items || [])).catch(() => toast('error', 'No se pudo conectar con el servidor (¿está encendido el backend?)'));\n    fetchApi('/parts').then(d => setAllParts(d.items || []));"
);

// Update dropdown logic
c = c.replace(
  /<select[\s\S]*?className=\{inputCls\}[\s\S]*?onChange=\{\(e\) => \{[\s\S]*?if \(e\.target\.value\) \{[\s\S]*?const selectedInv = inventory\.find[\s\S]*?<\/select>/,
  `<select 
              className={inputCls} 
              value={part ? String(part.part_id) : ""} 
              onChange={(e) => {
                if (e.target.value) {
                  const selectedPart = allParts.find(i => String(i.part_id) === e.target.value);
                  if (selectedPart) {
                    setPart({ part_id: selectedPart.part_id, name: selectedPart.name, sku: selectedPart.sku });
                    // No longer auto-filling location because they can pick parts not in inventory
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
                    // Solo mostramos todas si hay una ubicacion seleccionada, sino, mostramos todas igual
                    return (
                      <option key={p.part_id} value={p.part_id}>
                        {p.name} (ID: {p.part_id}) {location ? \` - Stock: \${stock}\` : ''}
                      </option>
                    );
                  })}
                </>
              )}
            </select>`
);

fs.writeFileSync('frontend/src/pages/FloorPage.jsx', c, 'utf8');
