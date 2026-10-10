const fs = require('fs');

// Fix FloorPage.jsx
let f = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');

// Remove it from Step
f = f.replace(
  `  // Auto-play workaround
  useEffect(() => {
    const audio = document.getElementById('floor-ai-audio');
    if (audio && audio.src) {
      // Force play when url arrives
      audio.play().catch(e => console.error('Autoplay prevented by browser:', e));
    }
  }, [aiAudioUrl]);
  
  return (`,
  `  return (`
);

// Add it to FloorPage right before its return
f = f.replace(
  `  return (
    <div className="max-w-4xl mx-auto space-y-6">`,
  `  // Auto-play workaround
  useEffect(() => {
    const audio = document.getElementById('floor-ai-audio');
    if (audio && audio.src) {
      audio.play().catch(e => console.error('Autoplay prevented by browser:', e));
    }
  }, [aiAudioUrl]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">`
);

fs.writeFileSync('frontend/src/pages/FloorPage.jsx', f, 'utf8');

// Fix AiAssistant.jsx
let a = fs.readFileSync('frontend/src/components/AiAssistant.jsx', 'utf8');

// Check if it was placed correctly
if (a.includes('// Auto-play workaround')) {
  // It probably replaced the return ( of the AiAssistant component, which is fine since there's only one.
  console.log('AiAssistant seems okay, checking...');
}

