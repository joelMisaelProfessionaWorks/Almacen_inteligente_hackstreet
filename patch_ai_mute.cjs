const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/AiAssistant.jsx', 'utf8');

if (!c.includes('isMuted')) {
  // 1. Add isMuted state
  c = c.replace(
    "const [playing, setPlaying] = useState(false);",
    "const [playing, setPlaying] = useState(false);\n  const [isMuted, setIsMuted] = useState(false);"
  );

  // 2. Change toggleAudio
  c = c.replace(
    /const toggleAudio = \(\) => \{[\s\S]*?setPlaying\(!playing\);\n  \};/,
    `const toggleAudio = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    const audio = document.getElementById('ai-audio');
    if (audio) {
      if (nextMuted) {
        audio.pause();
      } else {
        audio.play();
      }
    }
  };`
  );

  // 3. Change audio element
  c = c.replace(
    /<audio\s*id="ai-audio"\s*src=\{audioUrl\}\s*autoPlay\s*onPlay=\{\(\) => setPlaying\(true\)\}\s*onPause=\{\(\) => setPlaying\(false\)\}\s*onEnded=\{\(\) => setPlaying\(false\)\}\s*\/>/,
    `<audio 
                id="ai-audio" 
                src={audioUrl} 
                autoPlay={!isMuted}
                muted={isMuted}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />`
  );

  // 4. Change button rendering
  c = c.replace(
    /<button disabled=\{!audioUrl\} onClick=\{toggleAudio\}[\s\S]*?<\/button>/,
    `<button onClick={toggleAudio}
              className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isMuted ? 'Desmutear Voz' : 'Mutear Voz'}
            </button>`
  );

  fs.writeFileSync('frontend/src/components/AiAssistant.jsx', c, 'utf8');
  console.log('AiAssistant patched with isMuted logic.');
}
