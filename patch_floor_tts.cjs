const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');

// 1. Add Audio State
c = c.replace(
  "const [aiLoading, setAiLoading] = useState(false);",
  "const [aiLoading, setAiLoading] = useState(false);\n  const [aiAudioUrl, setAiAudioUrl] = useState(null);\n  const [aiPlaying, setAiPlaying] = useState(false);"
);

// 2. Add generateAiAudio helper (insert right before handleScan)
c = c.replace(
  "  const handleScan = async (e) => {",
  `  const generateAiAudio = async (parsed) => {
    try {
      let rawText = "Análisis: " + parsed.analisis + ". Riesgos: " + (parsed.riesgos || []).join(". ") + ". Sugerencias: " + (parsed.recomendaciones || []).map(r => r.titulo + ". " + r.descripcion).join(". ");
      let textToSpeak = rawText.replace(/[*#_\`]/g, '').replace(/\\n/g, ' ').replace(/\\s+/g, ' ').replace(/\\.+/g, '.');
      
      const response = await fetch('http://localhost:8000/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak })
      });
      if (!response.ok) throw new Error('TTS Failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAiAudioUrl(url);
    } catch (err) {
      console.error('Audio generation error:', err);
    }
  };

  const handleScan = async (e) => {`
);

// 3. Call generateAiAudio
c = c.replace(
  "setAiRecommendation(parsed);",
  "setAiRecommendation(parsed);\n              generateAiAudio(parsed);"
);

// 4. Reset audio state on unmount or hide
c = c.replace(
  /setAiRecommendation\(null\);/g,
  "setAiRecommendation(null); setAiAudioUrl(null); setAiPlaying(false);"
);

// 5. Render audio player and button
const headerOld = `<h4 className="text-sm font-semibold text-violet-800 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                      Recomendacin de la IA (Sin Stock)
                    </h4>`;
// Fallback match since encoding could be wonky
const headerRegex = /<h4 className="text-sm font-semibold text-violet-800 mb-2 flex items-center gap-2">[\s\S]*?Recomendaci.n de la IA \(Sin Stock\)[\s\S]*?<\/h4>/;

const headerNew = `<h4 className="text-sm font-semibold text-violet-800 mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                        Recomendación de la IA (Sin Stock)
                      </div>
                      {aiAudioUrl && (
                        <div className="flex items-center gap-2">
                          <audio 
                            id="floor-ai-audio" 
                            src={aiAudioUrl} 
                            autoPlay
                            onPlay={() => setAiPlaying(true)}
                            onPause={() => setAiPlaying(false)}
                            onEnded={() => setAiPlaying(false)}
                          />
                          <button
                            onClick={() => {
                              const audio = document.getElementById('floor-ai-audio');
                              if (audio) {
                                if (aiPlaying) audio.pause();
                                else audio.play();
                              }
                            }}
                            className="px-3 py-1 bg-violet-600 text-white text-xs rounded-full hover:bg-violet-700 transition-colors shadow-sm font-bold"
                          >
                            {aiPlaying ? 'Mutear Voz' : 'Desmutear Voz'}
                          </button>
                        </div>
                      )}
                    </h4>`;

c = c.replace(headerRegex, headerNew);

fs.writeFileSync('frontend/src/pages/FloorPage.jsx', c, 'utf8');
console.log('FloorPage AI Audio injected successfully.');
