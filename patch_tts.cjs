const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/AiAssistant.jsx', 'utf8');

const regex = /let textToSpeak = parsed\.analisis \+ " " \+ \(parsed\.recomendaciones \|\| \[\]\)\.map\(r => r\.titulo\)\.join\('\. '\);/;
const replacement = `let textToSpeak = "Análisis: " + parsed.analisis + ". Riesgos: " + (parsed.riesgos || []).join(". ") + ". Sugerencias: " + (parsed.recomendaciones || []).map(r => r.titulo + ". " + r.descripcion).join(". ");`;

c = c.replace(regex, replacement);
fs.writeFileSync('frontend/src/components/AiAssistant.jsx', c, 'utf8');
