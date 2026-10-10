const fs=require('fs');
let lines=fs.readFileSync('frontend/src/App.jsx','utf8').split('\n');
lines[10] = "  { to: '/warehouse', label: 'Almacén', icon: Warehouse },";
lines[11] = "  { to: '/work-orders', label: 'Órdenes', icon: ClipboardList },";
lines[40] = "            const msg = `Alerta: se abrió ${fresh.length === 1 ? 'un nuevo faltante' : fresh.length + ' nuevos faltantes'} en el almacén`;";
fs.writeFileSync('frontend/src/App.jsx', lines.join('\n'), 'utf8');

let wh = fs.readFileSync('frontend/src/pages/WarehousePage.jsx', 'utf8').split('\n');
wh[29] = "      <PageHeader icon={Warehouse} title=\"Almacén\" subtitle=\"Existencias, faltantes, compras sugeridas y recepciones pendientes\">";
wh[43] = "        <Card title=\"Existencias por pieza y ubicación\" accent=\"indigo\">";
wh[46] = "            <input className={inputCls + ' pl-10'} placeholder=\"Buscar por nombre, SKU, ID o ubicación...\" value={filter} onChange={(e) => setFilter(e.target.value)} />";
wh[53] = "                    <th className=\"py-2 pr-3\">Pieza</th><th className=\"pr-3\">Ubicación</th>";
fs.writeFileSync('frontend/src/pages/WarehousePage.jsx', wh.join('\n'), 'utf8');
