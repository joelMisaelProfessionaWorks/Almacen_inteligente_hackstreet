const fs = require('fs');

let f = fs.readFileSync('frontend/src/pages/AdvancedDashboardPage.jsx', 'utf8');
f = f.replace(/\\`/g, '`');
f = f.replace(/\\\$/g, '$');
fs.writeFileSync('frontend/src/pages/AdvancedDashboardPage.jsx', f, 'utf8');
