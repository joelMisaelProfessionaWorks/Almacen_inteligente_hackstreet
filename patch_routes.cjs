const fs = require('fs');
let c = fs.readFileSync('backend/src/api/routes.js', 'utf8');
c = c.replace(/const recommendation = await getRecommendations\(pool, process\.env\.GEMINI_API_KEY\);/, 'const recommendation = await getRecommendations(pool, process.env.GEMINI_API_KEY, req.query.q);');
fs.writeFileSync('backend/src/api/routes.js', c, 'utf8');
