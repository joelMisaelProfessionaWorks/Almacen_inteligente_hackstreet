const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/AiAssistant.jsx', 'utf8');

const regex = /let textToSpeak = "Análisis: " \+ parsed\.analisis \+ "\. Riesgos: " \+ \(parsed\.riesgos \|\| \[\]\)\.join\("\. "\) \+ "\. Sugerencias: " \+ \(parsed\.recomendaciones \|\| \[\]\)\.map\(r => r\.titulo \+ "\. " \+ r\.descripcion\)\.join\("\. "\);/;

const replacement = `let rawText = "Análisis: " + parsed.analisis + ". Riesgos: " + (parsed.riesgos || []).join(". ") + ". Sugerencias: " + (parsed.recomendaciones || []).map(r => r.titulo + ". " + r.descripcion).join(". ");
      let textToSpeak = rawText.replace(/[\\*#_\`]/g, '').replace(/\\n/g, ' ').replace(/\\s+/g, ' ').replace(/\\.+/g, '.');`;

if (c.includes('let textToSpeak = "Análisis: "')) {
  c = c.replace(regex, replacement);
  fs.writeFileSync('frontend/src/components/AiAssistant.jsx', c, 'utf8');
  console.log("Patched successfully.");
} else {
  console.log("Could not find regex match.");
}
