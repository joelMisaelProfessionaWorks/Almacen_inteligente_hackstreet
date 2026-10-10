import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowDownToLine, ArrowRightLeft, ClipboardCheck, ScanLine, MapPin, Package, Minus, Plus, RotateCcw, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '../api';
import { PageHeader, HelpBox, Card, Badge, useToast, inputCls } from '../components/ui';

const ACTIONS = [
  { id: 'issue', label: 'Retirar', desc: 'Sacar material para una orden', icon: ArrowDownToLine, color: 'from-rose-500 to-orange-500' },
  { id: 'transfer', label: 'Transferir', desc: 'Mover entre ubicaciones', icon: ArrowRightLeft, color: 'from-sky-500 to-blue-600' },
  { id: 'count', label: 'Contar', desc: 'Corregir la existencia real', icon: ClipboardCheck, color: 'from-emerald-500 to-teal-600' },
];

function Step({ n, title, done, children }) {
  return (
    <div className={`rounded-2xl border p-4 transition ${done ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`h-7 w-7 rounded-full text-sm font-bold flex items-center justify-center ${
            done ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'
          }`}
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : n}
        </span>
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function FloorPage() {
  const toast = useToast();
  const scanRef = useRef(null);

  const [action, setAction] = useState('issue');
  const [locations, setLocations] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [allParts, setAllParts] = useState([]);
  const [location, setLocation] = useState(null); // {location_id, code, name}
  const [part, setPart] = useState(null); // {part_id, sku, name}
  const [partOptions, setPartOptions] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAudioUrl, setAiAudioUrl] = useState(null);
  const [aiPlaying, setAiPlaying] = useState(false);

  const [scan, setScan] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [workOrder, setWorkOrder] = useState('');
  const [destId, setDestId] = useState('');
  
  const [simulatorActive, setSimulatorActive] = useState(false);

  useEffect(() => {
    if (!simulatorActive) return;
    let active = true;
    toast('success', 'Simulador automático INICIADO');

        async function tick() {
      while (active) {
        try {
          const invRes = await fetchApi('/inventory');
          const woRes = await fetchApi('/work-orders');
          const locRes = await fetchApi('/locations');

          if (!active) break;

          const inventoryList = invRes.items || invRes || [];
          const woList = woRes.items || woRes || [];
          const locList = locRes.items || locRes || [];
          const availableStock = inventoryList.filter(i => i.available > 0);

          if (availableStock.length && woList.length && locList.length) {
            const actionRand = Math.random();
            const getRandom = arr => arr[Math.floor(Math.random() * arr.length)];
            
            const delay = (ms) => new Promise(r => setTimeout(r, ms));

            if (actionRand < 0.4) {
              const item = getRandom(availableStock);
              let toLoc = getRandom(locList);
              while ((toLoc.location_id || toLoc.id) === item.location_id) {
                toLoc = getRandom(locList);
              }
              const qty = Math.floor(Math.random() * item.available) + 1;
              const sourceLoc = locList.find(l => (l.location_id || l.id) === item.location_id) || { location_id: item.location_id, code: 'U-'+item.location_id, name: '' };
              
              setAction('transfer');
              await delay(800);
              if (!active) break;
              setLocation(sourceLoc);
              await delay(800);
              if (!active) break;
              setPart(item);
              await delay(800);
              if (!active) break;
              setQuantity(qty);
              setDestId(toLoc.location_id || toLoc.id);
              
              await delay(1500);
              if (!active) break;

              await fetchApi('/transfers', {
                method: 'POST',
                body: JSON.stringify({
                  part_id: item.part_id,
                  from_location_id: item.location_id,
                  to_location_id: toLoc.location_id || toLoc.id,
                  quantity: qty,
                  user_id: 'AUTO_SIMULATOR'
                })
              });
              toast('success', `Simulador: Transferidas ${qty} - ${item.sku}`);
              setLast({ action: 'transfer', part: item, quantity: qty, at: new Date() });
              
              await delay(1000);
              setPart(null); setLocation(null); setQuantity(1);

            } else if (actionRand < 0.8) {
              const item = getRandom(availableStock);
              const wo = getRandom(woList);
              const sourceLoc = locList.find(l => (l.location_id || l.id) === item.location_id) || { location_id: item.location_id, code: 'U-'+item.location_id, name: '' };

              setAction('issue');
              await delay(800);
              if (!active) break;
              setLocation(sourceLoc);
              await delay(800);
              if (!active) break;
              setPart(item);
              await delay(800);
              if (!active) break;
              setQuantity(1);
              setWorkOrder(wo.code);
              
              await delay(1500);
              if (!active) break;

              await fetchApi('/issues', {
                method: 'POST',
                body: JSON.stringify({
                  work_order_code: wo.code,
                  part_id: item.part_id,
                  location_id: item.location_id,
                  quantity: 1,
                  issued_by: 'AUTO_SIMULATOR'
                })
              });
              toast('success', `Simulador: Retiradas 1 - ${item.sku}`);
              setLast({ action: 'issue', part: item, quantity: 1, at: new Date() });
              
              await delay(1000);
              setPart(null); setLocation(null); setQuantity(1); setWorkOrder('');

            } else {
              const item = getRandom(inventoryList);
              const diff = Math.floor(Math.random() * 3) - 1;
              const newQty = Math.max(0, item.on_hand + diff);
              const sourceLoc = locList.find(l => (l.location_id || l.id) === item.location_id) || { location_id: item.location_id, code: 'U-'+item.location_id, name: '' };

              setAction('count');
              await delay(800);
              if (!active) break;
              setLocation(sourceLoc);
              await delay(800);
              if (!active) break;
              setPart(item);
              await delay(800);
              if (!active) break;
              setQuantity(newQty);
              setReason('CICLICO_SIMULADO');
              
              await delay(1500);
              if (!active) break;

              await fetchApi('/counts', {
                method: 'POST',
                body: JSON.stringify({
                  location_id: item.location_id,
                  reason: 'CICLICO_SIMULADO',
                  lines: [{ part_id: item.part_id, counted_quantity: newQty }],
                  user_id: 'AUTO_SIMULATOR'
                })
              });
              toast('success', `Simulador: Contadas ${newQty} - ${item.sku}`);
              setLast({ action: 'count', part: item, quantity: newQty, at: new Date() });
              
              await delay(1000);
              setPart(null); setLocation(null); setQuantity(1); setReason('');
            }
          } else {
            console.warn('Simulador en pausa: faltan datos');
          }
        } catch (e) {
          console.error('Simulador error:', e);
        }
        
        if (active) {
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
        }
      }
    }
    
    tick();
    return () => { 
      active = false; 
      toast('info', 'Simulador DETENIDO');
    };
  }, [simulatorActive]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);

  const mainLocations = useMemo(() => {
    return locations
      .filter((l) => l.location_id < 1000000)
      .sort((a, b) => {
        const stockA = inventory.filter(i => i.location_id === a.location_id).reduce((sum, i) => sum + i.on_hand, 0);
        const stockB = inventory.filter(i => i.location_id === b.location_id).reduce((sum, i) => sum + i.on_hand, 0);
        return stockB - stockA; // Descending, highest stock first
      });
  }, [locations, inventory]);

  useEffect(() => {
    fetchApi('/inventory').then(d => setInventory(d.items || []));
    fetchApi('/parts').then(d => setAllParts(d.items || [])).catch(e => { console.error('Error fetching parts:', e); setAllParts([{part_id: 'error', name: 'Error de conexión'}]); });
    fetchApi('/locations')
      .then((d) => setLocations(d.items || []))
      .catch(() => toast('error', 'No se pudo conectar con el servidor (¿está encendido el backend?)'));
    scanRef.current?.focus();
  }, [toast]);

  // Mostrar existencia al elegir pieza
  useEffect(() => {
    if (!part) {
      setAiRecommendation(null); setAiAudioUrl(null); setAiPlaying(false);
      setAiLoading(false);
      return setAvailability(null);
    }
      setAiRecommendation(null); setAiAudioUrl(null); setAiPlaying(false);
      setAiLoading(false);
    fetchApi(`/parts/${part.part_id}/availability`).then(avail => {
      setAvailability(avail);
      
      const localStock = avail?.locations?.find((l) => l.location_id === location?.location_id)?.on_hand || 0;
      
      if (localStock === 0) {
        setAiLoading(true);
        setAiRecommendation(null); setAiAudioUrl(null); setAiPlaying(false);
        fetchApi(`/recommendations?q=${encodeURIComponent("Qué hacemos si no hay stock de la pieza " + part.name + " (" + part.sku + ")?")}`)
          .then(res => {
            let parsed = typeof res.recommendation === 'string' 
              ? JSON.parse(res.recommendation.replace(/^\`\`(?:json)?\n?/gi, '').replace(/\n?\`\`$/g, '').trim()) 
              : res.recommendation;
            setAiRecommendation(parsed);
              generateAiAudio(parsed);
          })
          .catch(e => console.error(e))
          .finally(() => setAiLoading(false));
      } else {
        setAiRecommendation(null); setAiAudioUrl(null); setAiPlaying(false);
        setAiLoading(false);
      }
    }).catch(() => {
      setAvailability(null);
      setAiRecommendation(null); setAiAudioUrl(null); setAiPlaying(false);
    });
  }, [part, last]);

  const localAvailable = availability?.locations?.find((l) => l.location_id === location?.location_id);

  const generateAiAudio = async (parsed) => {
    try {
      let rawText = "Recomendaciones: " + (parsed.recomendaciones || []).map(r => r.titulo + ". " + r.descripcion).join(". ");
      let textToSpeak = rawText.replace(/[*#_`]/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').replace(/\.+/g, '.');
      
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

  const handleScan = async (e) => {
    e.preventDefault();
    const code = scan.trim();
    if (!code) return;
    try {
      const data = await fetchApi(`/scan/${encodeURIComponent(code)}`);
      if (data.type === 'location') {
        setLocation(data.items[0]);
        toast('success', `Ubicación: ${data.items[0].code} · ${data.items[0].name}`);
      } else if (data.items.length === 1) {
        setPart(data.items[0]);
        setPartOptions([]);
        toast('success', `Pieza: ${data.items[0].name}`);
      } else {
        setPart(null);
        setPartOptions(data.items);
        toast('info', 'Este código corresponde a varias piezas. Elige la correcta.');
      }
      setScan('');
    } catch (err) {
      // Si no es codigo exacto, buscar por nombre
      try {
        const r = await fetchApi(`/parts?search=${encodeURIComponent(code)}`);
        if (r.items.length === 1) {
          setPart(r.items[0]);
          setPartOptions([]);
          setScan('');
        } else if (r.items.length > 1) {
          setPart(null);
          setPartOptions(r.items);
          toast('info', `${r.items.length} piezas encontradas. Elige una.`);
        } else {
          toast('error', err.message || 'Código no reconocido');
        }
      } catch {
        toast('error', err.message);
      }
    }
  };

  const needsDest = action === 'transfer';
  const needsReason = action === 'count';
  const ready =
    location && part && quantity !== '' && Number(quantity) >= 0 &&
    (!needsDest || destId) && (!needsReason || reason.trim());

  const reset = (full = false) => {
    setPart(null);
    setPartOptions([]);
    setQuantity(1);
    setWorkOrder('');
    setReason('');
    if (full) {
      setLocation(null);
      setDestId('');
    }
    scanRef.current?.focus();
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const base = { part_id: part.part_id, quantity: Number(quantity) };
      if (action === 'issue') {
        await fetchApi('/issues', {
          method: 'POST',
          body: JSON.stringify({ ...base, location_id: location.location_id, ...(workOrder ? { work_order_code: workOrder.trim() } : {}) }),
        });
      } else if (action === 'transfer') {
        await fetchApi('/transfers', {
          method: 'POST',
          body: JSON.stringify({ ...base, from_location_id: location.location_id, to_location_id: Number(destId) }),
        });
      } else {
        await fetchApi('/counts', {
          method: 'POST',
          body: JSON.stringify({ ...base, location_id: location.location_id, reason: reason.trim() }),
        });
      }
      const verb = { issue: 'Retiradas', transfer: 'Transferidas', count: 'Contadas' }[action];
      toast('success', `${verb} ${quantity} × ${part.name}`);
      setLast({ action, part, quantity, at: new Date() });
      reset(false);
    } catch (err) {
      toast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const step = (v) => setQuantity((q) => Math.max(0, Number(q || 0) + v));

  return (
    <div className="max-w-3xl mx-auto"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <PageHeader icon={ScanLine} title="Piso" subtitle="Registra retiros, transferencias y conteos escaneando c&oacute;digos" />
        <button
          type="button"
          onClick={() => setSimulatorActive(!simulatorActive)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold shadow-sm transition-all ${
            simulatorActive 
            ? 'bg-rose-50 border-rose-500 text-rose-700 hover:bg-rose-100 animate-pulse' 
            : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-500 hover:text-indigo-600'
          }`}
        >
          <RotateCcw className={`h-5 w-5 ${simulatorActive ? 'animate-spin' : ''}`} />
          {simulatorActive ? 'Detener Simulador' : 'Simular Actividad'}
        </button>
      </div>

      <HelpBox
        steps={[
          'Elige qué quieres hacer: Retirar, Transferir o Contar.',
          'Escanea la etiqueta de la ubicación (ej. U-101). También puedes elegirla de la lista.',
          'Escanea la etiqueta de la pieza (o escribe su código o nombre) y presiona Enter.',
          'Indica la cantidad con los botones grandes y presiona Confirmar. ¡Listo!',
        ]}
      />

      {/* Elegir accion */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          const active = action === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setAction(a.id)}
              className={`rounded-2xl p-4 text-left transition shadow-sm border-2 ${
                active ? `bg-gradient-to-br ${a.color} text-white border-transparent scale-[1.02] shadow-lg` : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
              <Icon className={`h-7 w-7 mb-2 ${active ? '' : 'text-slate-500'}`} />
              <div className="font-bold">{a.label}</div>
              <div className={`text-xs hidden sm:block ${active ? 'text-white/90' : 'text-slate-500'}`}>{a.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Barra de escaneo */}
      <form onSubmit={handleScan} className="mb-5">
        <div className="relative">
          <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-indigo-500" />
          <input
            ref={scanRef}
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            placeholder="Escanea una ubicación o una pieza y presiona Enter…"
            className="w-full pl-14 pr-24 py-4 rounded-2xl border-2 border-indigo-200 focus:border-indigo-500 focus:outline-none text-lg bg-white shadow-sm"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold">
            Buscar
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {/* Paso 1: ubicacion */}
        <Step n={1} title={needsDest ? 'Ubicación de ORIGEN' : 'Ubicación'} done={!!location}>
          {location ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" />
                <span className="font-bold">{location.code}</span>
                <span className="text-slate-600 text-sm">{location.name}</span>
              </div>
              <button onClick={() => setLocation(null)} className="text-sm text-indigo-600 hover:underline">Cambiar</button>
            </div>
          ) : (
            <select
              className={inputCls}
              value=""
              onChange={(e) => setLocation(mainLocations.find((l) => String(l.location_id) === e.target.value))}
            >
              <option value="">— O elige una ubicación de la lista —</option>
              {mainLocations.map((l) => (
                <option key={l.location_id} value={l.location_id}>{l.code} · {l.name}</option>
              ))}
            </select>
          )}
        </Step>

        {/* Paso 2: pieza */}
        <Step n={2} title="Pieza" done={!!part}>
          {part ? (
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Package className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-bold">{part.name}</div>
                    <div className="text-xs text-slate-500">ID {part.part_id}{part.sku ? ` · SKU ${part.sku}` : ''}</div>
                  </div>
                </div>
                <button onClick={() => reset(false)} className="text-sm text-indigo-600 hover:underline">Cambiar</button>
              </div>
              {availability && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge color="blue">Total en almacén: {availability.on_hand}</Badge>
                  <Badge color="amber">Reservado: {availability.reserved}</Badge>
                  <Badge color={availability.available > 0 ? 'green' : 'red'}>Disponible: {availability.available}</Badge>
                  {location && (
                    <Badge color={localAvailable ? 'green' : 'red'}>
                      En {location.code}: {localAvailable ? localAvailable.on_hand : 0}
                    </Badge>
                  )}
                </div>
              )}

              {aiLoading && (
                <div className="mt-4 p-4 bg-violet-50 rounded-lg border border-violet-100 flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600"></div>
                  <p className="text-sm text-violet-700">Analizando opciones (Reparación / Tiempos de entrega)...</p>
                </div>
              )}
              {aiRecommendation && !aiLoading && (
                <div className="mt-4 p-4 bg-violet-50 rounded-lg border border-violet-200">
                  <h4 className="text-sm font-semibold text-violet-800 mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                        Recomendación de la IA (Sin Stock)
                      </div>
                      {aiAudioUrl && (
                        <div className="flex items-center gap-2">
                          <audio 
                            key={aiAudioUrl}
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
                    </h4>
                  <p className="text-sm text-slate-700 mb-3">{aiRecommendation.analisis}</p>
                  {aiRecommendation.riesgos && aiRecommendation.riesgos.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Riesgos:</span>
                      <ul className="list-disc list-inside text-sm text-slate-600 mt-1">
                        {aiRecommendation.riesgos.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  {aiRecommendation.recomendaciones && aiRecommendation.recomendaciones.map((r, i) => (
                    <div key={i} className="mb-2 last:mb-0 bg-white p-3 rounded border border-violet-100">
                      <p className="text-sm font-medium text-slate-800">{r.titulo}</p>
                      <p className="text-xs text-slate-600 mt-1">{r.descripcion}</p>
                    </div>
                  ))}
                </div>
              )}
  
            </div>
          ) : partOptions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                ⚠️ Hay varias piezas con ese código. Toca la correcta:
              </p>
              {partOptions.map((p) => (
                <button
                  key={p.part_id}
                  onClick={() => { setPart(p); setPartOptions([]); }}
                  className="w-full text-left p-3 border rounded-xl bg-white hover:bg-indigo-50 hover:border-indigo-300"
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-slate-500">ID {p.part_id}{p.sku ? ` · SKU ${p.sku}` : ''}</div>
                </button>
              ))}
            </div>
          ) : (
                        <div className="space-y-3">
              <p className="text-sm text-slate-500">Escanea arriba, o elige una de la lista (se muestran todas):</p>
               {!location ? (
                  <div className="text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                    Por favor, selecciona una ubicación en el Paso 1 para ver las piezas disponibles.
                  </div>
                ) : (
                  <select 
                    className={inputCls} 
                    value={part ? String(part.part_id) : ""} 
                    onChange={(e) => {
                      if (e.target.value) {
                        const selectedPart = allParts.find(i => String(i.part_id) === e.target.value);
                        if (selectedPart) {
                          setPart({ part_id: selectedPart.part_id, name: selectedPart.name, sku: selectedPart.sku });
                        }
                      } else {
                        setPart(null);
                      }
                    }}
                  >
                    {allParts.length === 0 ? (
                      <option value="">Cargando catálogo...</option>
                    ) : (
                      <>
                        <option value="">-- Elige una pieza de la lista --</option>
                        {[...allParts].sort((a, b) => {
                          const invALocal = inventory.find(i => i.part_id === a.part_id && i.location_id === location.location_id);
                          const invBLocal = inventory.find(i => i.part_id === b.part_id && i.location_id === location.location_id);
                          const stockALocal = invALocal ? invALocal.on_hand : 0;
                          const stockBLocal = invBLocal ? invBLocal.on_hand : 0;
                          if (stockALocal !== stockBLocal) return stockBLocal - stockALocal;
                          
                          // fallback to global stock
                          const invATotal = inventory.filter(i => i.part_id === a.part_id).reduce((sum, x) => sum + x.on_hand, 0);
                          const invBTotal = inventory.filter(i => i.part_id === b.part_id).reduce((sum, x) => sum + x.on_hand, 0);
                          if (invATotal !== invBTotal) return invBTotal - invATotal;
                          
                          return a.name.localeCompare(b.name);
                        }).map(p => {
                          const localInv = inventory.find(i => i.part_id === p.part_id && i.location_id === location.location_id);
                          const totalInv = inventory.filter(i => i.part_id === p.part_id).reduce((sum, x) => sum + x.on_hand, 0);
                          const localStock = localInv ? localInv.on_hand : 0;
                          
                          return (
                            <option key={p.part_id} value={p.part_id}>
                              {p.name} (ID: {p.part_id}) - En esta ubicación: {localStock} (Stock Total: {totalInv})
                            </option>
                          );
                        })}
                      </>
                    )}
                  </select>
                )}
            </div>
          )}
        </Step>

        {/* Paso 3: detalles */}
        <Step n={3} title="Cantidad y detalles" done={false}>
          <div className="flex items-center justify-center gap-4 my-2">
            <button onClick={() => step(-1)} className="h-14 w-14 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
              <Minus className="h-6 w-6" />
            </button>
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-32 text-center text-4xl font-bold p-2 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:outline-none"
            />
            <button onClick={() => step(1)} className="h-14 w-14 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
              <Plus className="h-6 w-6" />
            </button>
          </div>
          <p className="text-center text-xs text-slate-500 mb-4">
            {action === 'count' ? 'Escribe la cantidad REAL que contaste en el estante.' : 'Cantidad de piezas.'}
          </p>

          {action === 'issue' && (
            <div>
              <label className="text-sm font-medium text-slate-700">Orden de trabajo (opcional)</label>
              <input className={inputCls + ' mt-1'} placeholder="Ej. R709769032" value={workOrder} onChange={(e) => setWorkOrder(e.target.value)} />
              <p className="text-xs text-slate-500 mt-1">Si la indicas, se descuenta primero lo reservado para esa orden.</p>
            </div>
          )}
          {action === 'transfer' && (
            <div>
              <label className="text-sm font-medium text-slate-700">Ubicación DESTINO</label>
               <select className={inputCls + ' mt-1'} value={destId} onChange={(e) => setDestId(e.target.value)}>
                <option value="">— Elige el destino —</option>
                {mainLocations.filter((l) => l.location_id !== location?.location_id).map((l) => (
                  <option key={l.location_id} value={l.location_id}>{l.code} · {l.name}</option>
                ))}
              </select>
            </div>
          )}
          {action === 'count' && (
            <div>
              <label className="text-sm font-medium text-slate-700">Motivo del conteo (obligatorio)</label>
              <input className={inputCls + ' mt-1'} placeholder="Ej. Inventario cíclico, pieza dañada…" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
        </Step>

        <button
          disabled={!ready || busy}
          onClick={confirm}
          className="w-full py-5 rounded-2xl text-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {busy ? 'Registrando…' : `Confirmar ${ACTIONS.find((a) => a.id === action).label.toLowerCase()}`}
        </button>
        {!ready && (
          <p className="text-center text-sm text-slate-500">
            Falta: {[!location && 'ubicación', !part && 'pieza', needsDest && !destId && 'destino', needsReason && !reason.trim() && 'motivo'].filter(Boolean).join(', ') || 'cantidad válida'}
          </p>
        )}

        {last && (
          <Card accent="emerald" title="Último movimiento" right={<button onClick={() => reset(true)} className="text-sm text-indigo-600 flex items-center gap-1"><RotateCcw className="h-4 w-4" />Empezar de cero</button>}>
            <p className="text-sm text-slate-700">
              {ACTIONS.find((a) => a.id === last.action).label} <b>{last.quantity}</b> × {last.part.name} · {last.at.toLocaleTimeString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">La ubicación se conserva: escanea la siguiente pieza para seguir.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

