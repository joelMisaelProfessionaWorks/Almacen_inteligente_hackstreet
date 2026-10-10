const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/AiAssistant.jsx', 'utf8');

const regex = /\{audioUrl && \(\s*<>\s*<audio[\s\S]*?\/>\s*<button disabled=\{\!audioUrl\} onClick=\{toggleAudio\}[\s\S]*?<\/button>\s*<\/>\s*\)\}/;

const replacement = `{audioUrl && (
              <audio 
                id="ai-audio" 
                src={audioUrl} 
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
            )}
            <button disabled={!audioUrl} onClick={toggleAudio}
              className={\`flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors \${!audioUrl ? "opacity-50 cursor-not-allowed" : ""}\`}
            >
              {!audioUrl ? <Spinner className="w-4 h-4 text-white" /> : playing ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {!audioUrl ? 'Generando voz...' : playing ? 'Pausar' : 'Escuchar'}
            </button>`;

c = c.replace(regex, replacement);
fs.writeFileSync('frontend/src/components/AiAssistant.jsx', c, 'utf8');
