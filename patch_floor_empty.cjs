const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');

const regex = /<select[\s\S]*?className=\{inputCls\}[\s\S]*?value=""[\s\S]*?onChange=\{\(e\) => \{[\s\S]*?-- Elige una pieza de la lista --<\/option>[\s\S]*?<\/select>/;

const newSelect = `<select 
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
                  {inventory.length === 0 ? (
                    <option value="">Cargando inventario...</option>
                  ) : (
                    <>
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
                      {location && inventory.filter(i => i.location_id === location.location_id).length === 0 && (
                        <option value="" disabled>-- No hay piezas en esta ubicación --</option>
                      )}
                    </>
                  )}
                </select>`;

c = c.replace(regex, newSelect);
fs.writeFileSync('frontend/src/pages/FloorPage.jsx', c, 'utf8');
