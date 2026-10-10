const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/WorkOrderPage.jsx', 'utf8');

code = code.replace(
  '\\`(\\${p.sku})\\`',
  '`(${p.sku})`'
);

fs.writeFileSync('frontend/src/pages/WorkOrderPage.jsx', code, 'utf8');
