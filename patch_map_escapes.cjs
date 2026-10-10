const fs = require('fs');

let r = fs.readFileSync('frontend/src/pages/LocationsMap.jsx', 'utf8');
r = r.replace(/\\`/g, '`');
r = r.replace(/\\\$/g, '$');
fs.writeFileSync('frontend/src/pages/LocationsMap.jsx', r, 'utf8');
