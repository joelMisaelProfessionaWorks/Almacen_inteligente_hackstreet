const fs = require('fs');
let c = fs.readFileSync('backend/src/api/ai.js', 'utf8');
c = c.replace(/model: 'gemini-[a-zA-Z0-9.-]+'/, "model: 'gemini-3.5-flash-lite'");
fs.writeFileSync('backend/src/api/ai.js', c, 'utf8');
