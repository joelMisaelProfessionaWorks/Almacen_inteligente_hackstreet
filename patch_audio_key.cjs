const fs = require('fs');

let f = fs.readFileSync('frontend/src/components/AiAssistant.jsx', 'utf8');
f = f.replace(
  '<audio \n                  id="ai-audio" \n                  src={audioUrl}',
  '<audio \n                  key={audioUrl}\n                  id="ai-audio" \n                  src={audioUrl}'
);
fs.writeFileSync('frontend/src/components/AiAssistant.jsx', f, 'utf8');

let p = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');
p = p.replace(
  '<audio \n                            id="floor-ai-audio" \n                            src={aiAudioUrl}',
  '<audio \n                            key={aiAudioUrl}\n                            id="floor-ai-audio" \n                            src={aiAudioUrl}'
);
fs.writeFileSync('frontend/src/pages/FloorPage.jsx', p, 'utf8');
console.log('Audio key injected.');
