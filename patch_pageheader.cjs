const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');
c = c.replace(
  '<PageHeader title="Piso de Almacén" description="Registra movimientos desde la línea o estantes." />',
  '<PageHeader icon={Package} title="Piso de Almacén" subtitle="Registra movimientos desde la línea o estantes." />'
);
fs.writeFileSync('frontend/src/pages/FloorPage.jsx', c, 'utf8');
