const fs = require('fs');

let f = fs.readFileSync('backend/src/kafka/publisher.js', 'utf8');

f = f.replace(
    '}, 1000);',
    '}, 100);'
);

fs.writeFileSync('backend/src/kafka/publisher.js', f, 'utf8');
console.log('Publisher polling reduced to 100ms');
