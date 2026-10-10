const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/AiAssistant.jsx', 'utf8');

// Add autoPlay
c = c.replace(
  '<audio \n                  id="ai-audio" \n                  src={audioUrl}',
  '<audio \n                  id="ai-audio" \n                  src={audioUrl} \n                  autoPlay'
);
// In case it's on one line
c = c.replace(
  '<audio id="ai-audio" src={audioUrl}',
  '<audio id="ai-audio" src={audioUrl} autoPlay'
);

// Change button label
c = c.replace(
  '{playing ? \'Pausar\' : \'Escuchar\'}',
  '{playing ? \'Mutear\' : \'Desmutear\'}'
);
c = c.replace(
  '{playing ? "Pausar" : "Escuchar"}',
  '{playing ? "Mutear" : "Desmutear"}'
);

fs.writeFileSync('frontend/src/components/AiAssistant.jsx', c, 'utf8');
console.log('AiAssistant patched.');
