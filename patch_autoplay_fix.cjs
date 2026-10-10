const fs = require('fs');

function patchFile(file, id) {
  let c = fs.readFileSync(file, 'utf8');

  // Find where audioUrl is set or add a useEffect
  // We can just add a useEffect right before the return statement.
  if (!c.includes(`// Auto-play workaround`)) {
    c = c.replace(
      /return \(/,
      `// Auto-play workaround
  useEffect(() => {
    const audio = document.getElementById('${id}');
    if (audio && audio.src && !isMuted) {
      audio.play().catch(e => console.error('Autoplay prevented:', e));
    }
  }, [${id === 'floor-ai-audio' ? 'aiAudioUrl, aiPlaying' : 'audioUrl, isMuted'}]);
  
  return (`
    );
  }
  
  // FloorPage uses aiAudioUrl and aiPlaying. AiAssistant uses audioUrl and isMuted.
  if (id === 'floor-ai-audio') {
    c = c.replace(/!isMuted/g, '!aiPlaying'); // but wait, floor page has aiPlaying which means "is currently playing", not "is muted". Floor page doesn't have an isMuted state!
    // Let's fix FloorPage to just play() when aiAudioUrl changes.
    c = c.replace(
      `useEffect(() => {
    const audio = document.getElementById('floor-ai-audio');
    if (audio && audio.src && !aiPlaying) {
      audio.play().catch(e => console.error('Autoplay prevented:', e));
    }
  }, [aiAudioUrl, aiPlaying]);`,
      `useEffect(() => {
    const audio = document.getElementById('floor-ai-audio');
    if (audio && audio.src) {
      // Force play when url arrives
      audio.play().catch(e => console.error('Autoplay prevented by browser:', e));
    }
  }, [aiAudioUrl]);`
    );
  }

  fs.writeFileSync(file, c, 'utf8');
}

patchFile('frontend/src/components/AiAssistant.jsx', 'ai-audio');
patchFile('frontend/src/pages/FloorPage.jsx', 'floor-ai-audio');
console.log('Autoplay workaround applied.');
