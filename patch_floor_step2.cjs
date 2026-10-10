const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');

const OLD_SELECT = `<select 
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
                </select>`;

// We will sort `allParts` based on `inventory` matches so it's super easy to find!
const NEW_SELECT = `{!location ? (
                  <div className="text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                    Por favor, selecciona una ubicación en el Paso 1 para ver las piezas disponibles.
                  </div>
                ) : (
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
                        {[...allParts].sort((a, b) => {
                          const invALocal = inventory.find(i => i.part_id === a.part_id && i.location_id === location.location_id);
                          const invBLocal = inventory.find(i => i.part_id === b.part_id && i.location_id === location.location_id);
                          const stockALocal = invALocal ? invALocal.on_hand : 0;
                          const stockBLocal = invBLocal ? invBLocal.on_hand : 0;
                          if (stockALocal !== stockBLocal) return stockBLocal - stockALocal;
                          
                          // fallback to global stock
                          const invATotal = inventory.filter(i => i.part_id === a.part_id).reduce((sum, x) => sum + x.on_hand, 0);
                          const invBTotal = inventory.filter(i => i.part_id === b.part_id).reduce((sum, x) => sum + x.on_hand, 0);
                          if (invATotal !== invBTotal) return invBTotal - invATotal;
                          
                          return a.name.localeCompare(b.name);
                        }).map(p => {
                          const localInv = inventory.find(i => i.part_id === p.part_id && i.location_id === location.location_id);
                          const totalInv = inventory.filter(i => i.part_id === p.part_id).reduce((sum, x) => sum + x.on_hand, 0);
                          const localStock = localInv ? localInv.on_hand : 0;
                          
                          return (
                            <option key={p.part_id} value={p.part_id}>
                              {p.name} (ID: {p.part_id}) - En esta ubicación: {localStock} (Stock Total: {totalInv})
                            </option>
                          );
                        })}
                      </>
                    )}
                  </select>
                )}`;

if (code.includes('const stock = inv ? inv.on_hand : 0;')) {
  // Try precise replace, replacing exact text without caring about spaces too much.
  // We'll use split.
  let parts = code.split('<select');
  
  // Find the segment that contains "Cargando cat" and "const stock = inv"
  let segmentIndex = -1;
  for(let i=1; i<parts.length; i++) {
    if (parts[i].includes('Cargando cat') && parts[i].includes('const stock = inv')) {
      segmentIndex = i;
      break;
    }
  }

  if (segmentIndex !== -1) {
    let seg = parts[segmentIndex];
    let endSelect = seg.indexOf('</select>') + '</select>'.length;
    let newSeg = ' ' + NEW_SELECT + seg.substring(endSelect);
    parts[segmentIndex] = newSeg;
    code = parts.join('');
    fs.writeFileSync('frontend/src/pages/FloorPage.jsx', code, 'utf8');
    console.log('Select replaced successfully!');
  } else {
    console.log('Segment not found.');
  }

} else {
  console.log('Original code string not found.');
}
