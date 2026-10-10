const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/WorkOrderPage.jsx', 'utf8');

code = code.replace(
  '\\`\\${p.name} (faltan \\${p.missing})\\`',
  '`${p.name} (faltan ${p.missing})`'
);

code = code.replace(
  '\\`/recommendations?q=\\${encodeURIComponent("Faltan estas piezas para la orden " + orderId + ": " + partsText + ". ¿Qué recomiendas sobre tiempos de entrega, proveedores o reparación interna para evitar sobreinventarios?")}\\`',
  '`/recommendations?q=${encodeURIComponent("Faltan estas piezas para la orden " + orderId + ": " + partsText + ". ¿Qué recomiendas sobre tiempos de entrega, proveedores o reparación interna para evitar sobreinventarios?")}`'
);

fs.writeFileSync('frontend/src/pages/WorkOrderPage.jsx', code, 'utf8');
