const fs = require('fs');
let r = fs.readFileSync('backend/src/api/routes.js', 'utf8');
r = r.replace('\\n}\\n', '\n}\n');
fs.writeFileSync('backend/src/api/routes.js', r, 'utf8');
