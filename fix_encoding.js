const fs = require('fs');
function fix(file) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/AlmacÃ©n/g, 'Almacén');
  c = c.replace(/AlmacǸn/g, 'Almacén');
  c = c.replace(/Ã“rdenes/g, 'Órdenes');
  c = c.replace(/"rdenes/g, 'Órdenes');
  c = c.replace(/abri/g, 'abrió');
  c = c.replace(/lleg/g, 'llegó');
  c = c.replace(/Ubicacin/g, 'Ubicación');
  c = c.replace(/ubicacin/g, 'ubicación');
  c = c.replace(/bǧscala/g, 'búscala');
  c = c.replace(/Bǧscala/g, 'Búscala');
  c = c.replace(/cuǭnto/g, 'cuánto');
  c = c.replace(/Recepcin/g, 'Recepción');
  c = c.replace(/Cdigo/g, 'Código');
  c = c.replace(/descripcin/g, 'descripción');
  fs.writeFileSync(file, c, 'utf8');
}
try {
  fix('frontend/src/App.jsx');
  fix('frontend/src/pages/WarehousePage.jsx');
  console.log('Fixed encoding');
} catch (e) {
  console.error(e);
}
