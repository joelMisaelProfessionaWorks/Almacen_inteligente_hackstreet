const fs = require('fs');
let f = fs.readFileSync('backend/src/handlers/purchasing.js', 'utf8');

f = f.replace(
    'await new Promise(resolve => setTimeout(resolve, 500));',
    'await new Promise(resolve => setTimeout(resolve, 50));'
);

fs.writeFileSync('backend/src/handlers/purchasing.js', f, 'utf8');
console.log('Reduced timeout to 50ms');
