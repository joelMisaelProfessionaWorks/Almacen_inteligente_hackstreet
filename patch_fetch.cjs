const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');

c = c.replace(
  "fetchApi('/parts').then(d => setAllParts(d.items || []));",
  "fetchApi('/parts').then(d => setAllParts(d.items || [])).catch(e => { console.error('Error fetching parts:', e); setAllParts([{part_id: 'error', name: 'Error de conexión'}]); });"
);

fs.writeFileSync('frontend/src/pages/FloorPage.jsx', c, 'utf8');
