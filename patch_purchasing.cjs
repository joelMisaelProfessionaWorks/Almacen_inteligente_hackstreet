const fs = require('fs');

let f = fs.readFileSync('backend/src/handlers/purchasing.js', 'utf8');

f = f.replace(
    "type: 'stock.unmatched_receipt',",
    "type: 'stock.unmatched_receipt',\n              purchase_line_id: parseInt(line_id, 10),"
);

fs.writeFileSync('backend/src/handlers/purchasing.js', f, 'utf8');
console.log('Patched unmatched_receipt payload');
