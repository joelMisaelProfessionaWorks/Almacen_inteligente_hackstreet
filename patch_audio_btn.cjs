const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/AiAssistant.jsx', 'utf8');

c = c.replace(/<button\s+onClick=\{toggleAudio\}/, '<button disabled={!audioUrl} onClick={toggleAudio}');
c = c.replace(/className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4\s+py-2 rounded-lg text-sm font-medium transition-colors"/, 'className={`flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!audioUrl ? "opacity-50 cursor-not-allowed" : ""}`}');

fs.writeFileSync('frontend/src/components/AiAssistant.jsx', c, 'utf8');
