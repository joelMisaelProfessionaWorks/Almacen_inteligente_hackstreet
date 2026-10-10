const fs = require('fs');
let c = fs.readFileSync('backend/src/index.js', 'utf8');

if (!c.includes('uncaughtException')) {
    c = "process.on('uncaughtException', (err) => { console.error('Uncaught Exception:', err); });\n" +
        "process.on('unhandledRejection', (reason) => { console.error('Unhandled Rejection:', reason); });\n" + c;
    fs.writeFileSync('backend/src/index.js', c, 'utf8');
}
