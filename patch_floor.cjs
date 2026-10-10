const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');

if (!c.includes('const [inventory')) {
    c = c.replace(
        'const [locations, setLocations] = useState([]);',
        'const [locations, setLocations] = useState([]);\n  const [inventory, setInventory] = useState([]);'
    );
}

if (!c.includes("fetchApi('/inventory')")) {
    c = c.replace(
        "fetchApi('/locations')\n      .then((d) => setLocations(d.items || []))",
        "fetchApi('/locations').then((d) => setLocations(d.items || []));\n    fetchApi('/inventory').then((d) => setInventory(d.items || []))"
    );
}

// Modify the Step 2 block
const step2Regex = /<Step n=\{2\} title="Pieza" done=\{!!part\}>([\s\S]*?)<\/Step>/;
const newStep2 = `<Step n={2} title="Pieza" done={!!part}>
          {part ? (
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Package className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-bold">{part.name}</div>
                    <div className="text-xs text-slate-500">ID {part.part_id}{part.sku ? \` - SKU \${part.sku}\` : ''}</div>
                  </div>
                </div>
                <button onClick={() => reset(false)} className="text-sm text-indigo-600 hover:underline">Cambiar</button>
              </div>
              {availability && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge color="blue">Total en almacén: {availability.on_hand}</Badge>
                  <Badge color="amber">Reservado: {availability.reserved}</Badge>
                  <Badge color={availability.available > 0 ? 'green' : 'red'}>Disponible: {availability.available}</Badge>
                  {location && (
                    <Badge color={localAvailable ? 'green' : 'red'}>
                      En {location.code}: {localAvailable ? localAvailable.on_hand : 0}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ) : partOptions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                Hay varias piezas con ese código. Toca la correcta:
              </p>
              {partOptions.map((p) => (
                <button
                  key={p.part_id}
                  onClick={() => { setPart(p); setPartOptions([]); }}
                  className="w-full text-left p-3 border rounded-xl bg-white hover:bg-indigo-50 hover:border-indigo-300"
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-slate-500">ID {p.part_id}{p.sku ? \` - SKU \${p.sku}\` : ''}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Escanea la pieza arriba, escribe su código/nombre, o selecciónala de la lista:</p>
              
              <select 
                className={inputCls} 
                value="" 
                onChange={(e) => {
                  if (e.target.value) {
                    const selectedInv = inventory.find(i => String(i.part_id) === e.target.value);
                    if (selectedInv) {
                      setPart({ part_id: selectedInv.part_id, name: selectedInv.name, sku: selectedInv.sku });
                      if (!location) {
                         const locObj = locations.find(l => l.location_id === selectedInv.location_id);
                         if (locObj) setLocation(locObj);
                      }
                    }
                  }
                }}
              >
                <option value="">-- Elige una pieza de la lista --</option>
                {inventory
                  .filter(i => location ? i.location_id === location.location_id : true)
                  .reduce((unique, item) => {
                     if (!unique.find(x => x.part_id === item.part_id)) unique.push(item);
                     return unique;
                  }, [])
                  .map(i => (
                  <option key={i.part_id} value={i.part_id}>
                    {i.name} (ID: {i.part_id}) {location ? \` - Stock: \${i.on_hand}\` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </Step>`;

c = c.replace(step2Regex, newStep2);
fs.writeFileSync('frontend/src/pages/FloorPage.jsx', c, 'utf8');
