const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/AiAssistant.jsx', 'utf8');
c = c.replace(
  "typeof res.recommendation === 'string' ? JSON.parse(res.recommendation) : res.recommendation;",
  "typeof res.recommendation === 'string' ? JSON.parse(res.recommendation.replace(/^```json\\n?/g, '').replace(/\\n?```$/g, '').trim()) : res.recommendation;"
);
fs.writeFileSync('frontend/src/components/AiAssistant.jsx', c, 'utf8');
