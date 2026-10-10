const fs = require('fs');

let f = fs.readFileSync('frontend/src/components/AiAssistant.jsx', 'utf8');

f = f.replace(
  `useEffect(() => {
    const audio = document.getElementById('ai-audio');
    if (audio && audio.src && !isMuted) {
      audio.play().catch(e => console.error('Autoplay prevented:', e));
    }
  }, [audioUrl, isMuted]);`,
  `useEffect(() => {
    const audio = document.getElementById('ai-audio');
    if (audio && audio.src && !isMuted) {
      audio.load(); // Force reload the new audio source
      audio.play().catch(e => console.error('Autoplay prevented:', e));
    }
  }, [audioUrl, isMuted]);`
);

fs.writeFileSync('frontend/src/components/AiAssistant.jsx', f, 'utf8');

let p = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');

p = p.replace(
  `useEffect(() => {
    const audio = document.getElementById('floor-ai-audio');
    if (audio && audio.src) {
      audio.play().catch(e => console.error('Autoplay prevented by browser:', e));
    }
  }, [aiAudioUrl]);`,
  `useEffect(() => {
    const audio = document.getElementById('floor-ai-audio');
    if (audio && audio.src) {
      audio.load(); // Force reload the new audio source
      audio.play().catch(e => console.error('Autoplay prevented by browser:', e));
    }
  }, [aiAudioUrl]);`
);

fs.writeFileSync('frontend/src/pages/FloorPage.jsx', p, 'utf8');
console.log('audio.load() injected.');
