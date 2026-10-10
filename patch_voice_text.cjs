const fs = require('fs');

let f1 = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');
f1 = f1.replace(
  /let rawText = "Anǭlisis: " \+ parsed\.analisis \+ "\. Riesgos: " \+ \(parsed\.riesgos \|\| \[\]\)\.join\("\. "\) \+ "\. Sugerencias: " \+ \(parsed\.recomendaciones \|\| \[\]\)\.map\(r => r\.titulo \+ "\. " \+ r\.descripcion\)\.join\("\. "\);/,
  'let rawText = "Recomendaciones: " + (parsed.recomendaciones || []).map(r => r.titulo + ". " + r.descripcion).join(". ");'
);
fs.writeFileSync('frontend/src/pages/FloorPage.jsx', f1, 'utf8');

let f2 = fs.readFileSync('frontend/src/components/AiAssistant.jsx', 'utf8');
f2 = f2.replace(
  /let rawText = "Anǭlisis: " \+ parsed\.analisis \+ "\. Riesgos: " \+ \(parsed\.riesgos \|\| \[\]\)\.join\("\. "\) \+ "\. Sugerencias: " \+ \(parsed\.recomendaciones \|\| \[\]\)\.map\(r => r\.titulo \+ "\. " \+ r\.descripcion\)\.join\("\. "\);/,
  'let rawText = "Recomendaciones: " + (parsed.recomendaciones || []).map(r => r.titulo + ". " + r.descripcion).join(". ");'
);
fs.writeFileSync('frontend/src/components/AiAssistant.jsx', f2, 'utf8');

console.log('Voice text updated to only include recommendations.');
