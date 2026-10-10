import React, { useState, useEffect } from 'react';
import { Bot, RefreshCw, Volume2, VolumeX, AlertCircle, ChevronRight, PackageSearch, Send } from 'lucide-react';
import { fetchApi } from '../api';
import { Card, Spinner } from './ui';

export function AiAssistant({ onSearch }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedRec, setSelectedRec] = useState(null);
  const [question, setQuestion] = useState('');

  const getAdvice = async (customQuery = '') => {
    setLoading(true);
    setError(null);
    setData(null);
    setAudioUrl(null);
    setSelectedRec(null);
    
    try {
      const endpoint = customQuery ? `/recommendations?q=${encodeURIComponent(customQuery)}` : '/recommendations';
      const res = await fetchApi(endpoint);
      let parsed;
      try {
        parsed = typeof res.recommendation === 'string' 
          ? JSON.parse(res.recommendation.replace(/^```(?:json)?\\n?/gi, '').replace(/\\n?```$/g, '').trim()) 
          : res.recommendation;
      } catch (e) {
        throw new Error('El formato de respuesta de la IA no es válido.');
      }

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      setData(parsed);
      
      // Generar audio con el texto plano del análisis
      let rawText = "Recomendaciones: " + (parsed.recomendaciones || []).map(r => r.titulo + ". " + r.descripcion).join(". ");
      let textToSpeak = rawText.replace(/[\*#_`]/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').replace(/\.+/g, '.');
      generateAudio(textToSpeak);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAudio = async (text) => {
    try {
      const response = await fetch('http://localhost:8000/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!response.ok) throw new Error('TTS Failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err) {
      console.error('Audio generation error:', err);
    }
  };

  const toggleAudio = () => {
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
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (question.trim()) {
      getAdvice(question.trim());
    }
  };

  useEffect(() => {
    getAdvice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-play workaround
  useEffect(() => {
    const audio = document.getElementById('ai-audio');
    if (audio && audio.src && !isMuted) {
      audio.load(); // Force reload the new audio source
      audio.play().catch(e => console.error('Autoplay prevented:', e));
    }
  }, [audioUrl, isMuted]);
  
  return (
    <Card accent="violet" title="Asistente de Almacén (Gemini + ElevenLabs)" icon={Bot}>
      
      {/* Barra de busqueda de IA */}
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <input 
          type="text" 
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ej: ¿Qué piezas urgen comprar? o ¿Dónde está la FLECHA-007?" 
          className="flex-1 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 rounded-xl px-4 py-2 text-sm outline-none transition-all"
        />
        <button 
          type="submit" 
          disabled={loading || !question.trim()}
          className="bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Preguntar
        </button>
      </form>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="flex-1 w-full">
          {loading && (
            <div className="flex items-center gap-2 text-violet-600 mb-2">
              <Spinner /> <span>Analizando información del almacén...</span>
            </div>
          )}
          
          {error && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-lg flex items-start gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && data && (
            <div className="space-y-4">
              <div className="bg-indigo-50/50 p-4 rounded-xl text-slate-700 text-sm">
                <p><strong>Análisis:</strong> {data.analisis}</p>
                {data.riesgos && data.riesgos.length > 0 && (
                  <p className="mt-2 text-rose-600"><strong>Riesgos:</strong> {data.riesgos.join(' / ')}</p>
                )}
              </div>

              {data.recomendaciones && data.recomendaciones.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2">Sugerencias:</h4>
                  <div className="space-y-2">
                    {data.recomendaciones.map((rec, idx) => (
                      <div key={idx} className="border rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:border-violet-300">
                        <button 
                          onClick={() => setSelectedRec(selectedRec === idx ? null : idx)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 focus:outline-none"
                        >
                          <div className="font-medium text-slate-800 flex items-center gap-2">
                            <span className="bg-violet-100 text-violet-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                            {rec.titulo}
                          </div>
                          <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${selectedRec === idx ? 'rotate-90' : ''}`} />
                        </button>
                        
                        {selectedRec === idx && (
                          <div className="p-4 bg-slate-50 border-t text-sm">
                            <p className="text-slate-600 mb-3">{rec.descripcion}</p>
                            
                            {rec.piezas_relacionadas && rec.piezas_relacionadas.length > 0 ? (
                              <div>
                                <p className="font-semibold text-slate-700 mb-2 text-xs uppercase tracking-wider">Piezas relacionadas (clic para buscar):</p>
                                <div className="flex flex-wrap gap-2">
                                  {rec.piezas_relacionadas.map((pieza, pidx) => (
                                    <button 
                                      key={pidx}
                                      onClick={() => onSearch && onSearch(pieza.name || String(pieza.part_id))}
                                      className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-violet-500 hover:text-violet-700 px-3 py-1.5 rounded-lg transition-colors text-slate-600 font-medium"
                                    >
                                      <PackageSearch className="w-4 h-4" />
                                      {pieza.name || `ID: ${pieza.part_id}`}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No hay piezas específicas relacionadas.</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0 md:border-l md:pl-4 w-full md:w-auto">
          <button 
            onClick={() => getAdvice()} 
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Reporte General
          </button>
          
          {audioUrl && (
              <audio 
                id="ai-audio" 
                src={audioUrl} 
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
            )}
            <button onClick={toggleAudio}
              className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isMuted ? 'Desmutear Voz' : 'Mutear Voz'}
            </button>
        </div>
      </div>
    </Card>
  );
}
