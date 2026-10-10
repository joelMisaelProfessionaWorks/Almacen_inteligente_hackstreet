import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Clock, AlertCircle, Bot } from 'lucide-react';
import { fetchApi } from '../api';
import { PageHeader, Card, Spinner, Badge } from '../components/ui';

export default function AdvancedDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    // We fetch parts, inventory, and some mock logic to build the dashboard
    Promise.all([
      fetchApi('/inventory'),
      fetchApi('/parts'),
      fetchApi('/work-orders')
    ]).then(([invRes, partsRes, ordersRes]) => {
      const inventory = invRes.items || [];
      const parts = partsRes.items || [];
      
      // Valuación a costo promedio (We generate deterministic costs based on ID)
      let totalValue = 0;
      const valuationList = [];
      const deadStock = [];
      const criticalStock = [];

      inventory.forEach(inv => {
        const p = parts.find(x => x.part_id === inv.part_id) || {};
        const avgCost = (inv.part_id % 150) + 15; // Simulated cost $15 - $165
        const value = avgCost * inv.on_hand;
        totalValue += value;
        
        valuationList.push({
          ...p,
          on_hand: inv.on_hand,
          avgCost,
          totalValue: value
        });

        // Dead stock logic: if on_hand is high but no recent reservations (simulated)
        if (inv.on_hand > 5 && inv.reserved === 0) {
          deadStock.push({ ...p, on_hand: inv.on_hand, avgCost });
        }

        // Critical stock logic: reserved is higher than on_hand
        if (inv.reserved > inv.on_hand || (inv.on_hand > 0 && inv.available === 0)) {
          criticalStock.push({ ...p, on_hand: inv.on_hand, reserved: inv.reserved });
        }
      });

      // Pronóstico de Demanda (Demand Forecast)
      // We look at pending work orders and count how many times parts are requested
      const demandForecast = [];
      (ordersRes.items || []).filter(o => o.pending).forEach(order => {
        order.missing_parts.forEach(mp => {
          const existing = demandForecast.find(d => d.part_id === mp.part_id);
          if (existing) {
            existing.futureDemand += mp.missing;
          } else {
            demandForecast.push({ ...mp, futureDemand: mp.missing });
          }
        });
      });

      setData({
        totalValue,
        valuationList: valuationList.sort((a,b) => b.totalValue - a.totalValue).slice(0, 5),
        deadStock: deadStock.slice(0, 5),
        criticalStock: criticalStock.slice(0, 5),
        demandForecast: demandForecast.sort((a,b) => b.futureDemand - a.futureDemand).slice(0, 5)
      });
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, []);

  const runAiAnalysis = async () => {
    setAnalyzing(true);
    try {
      const payload = {
        deadStock: data.deadStock.map(d => `${d.name} (${d.on_hand} en stock, sin movimiento)`),
        demand: data.demandForecast.map(d => `${d.name} (Demanda proyectada: ${d.futureDemand})`)
      };
      
      const res = await fetchApi(`/recommendations?q=${encodeURIComponent("Genera un pronóstico de demanda y sugiere qué hacer con estas piezas sin movimiento (Dead Stock) y cómo asegurar el suministro de las piezas críticas: " + JSON.stringify(payload))}`);
      
      let parsed = typeof res.recommendation === 'string' 
        ? JSON.parse(res.recommendation.replace(/^```(?:json)?\\n?/gi, '').replace(/\\n?```$/g, '').trim()) 
        : res.recommendation;
        
      setAiAnalysis(parsed);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <Spinner />;
  if (!data) return <div className="p-6 text-red-500">Error cargando datos del dashboard. Verifica la conexión con el servidor.</div>;

  return (
    <div className="space-y-6">
      <PageHeader icon={TrendingUp} title="Dashboard Avanzado" subtitle="Valuación, Pronóstico y Tablero de Rotación" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
            <h2 className="text-xl font-bold">Valuación a Costo Promedio</h2>
          </div>
          <p className="text-3xl font-black">${data.totalValue.toLocaleString()}</p>
          <p className="text-sm opacity-80 mt-2">Capital inmovilizado en inventario activo</p>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white border-0">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <h2 className="text-xl font-bold">Piezas Críticas</h2>
          </div>
          <p className="text-3xl font-black">{data.criticalStock.length}</p>
          <p className="text-sm opacity-80 mt-2">Con déficit de stock vs reserva</p>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white border-0">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 opacity-80" />
            <h2 className="text-xl font-bold">Piezas sin Movimiento</h2>
          </div>
          <p className="text-3xl font-black">{data.deadStock.length}</p>
          <p className="text-sm opacity-80 mt-2">Capital inmovilizado (Dead Stock)</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp className="text-blue-600" /> Pronóstico de Demanda</h3>
          <ul className="space-y-3">
            {data.demandForecast.map((d, i) => (
              <li key={i} className="flex justify-between items-center border-b pb-2">
                <span>{d.name} <span className="text-xs text-slate-500">({d.sku})</span></span>
                <Badge color="blue">Demanda: {d.futureDemand}</Badge>
              </li>
            ))}
            {data.demandForecast.length === 0 && <p className="text-sm text-slate-500">No hay demanda futura registrada.</p>}
          </ul>
        </Card>

        <Card>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Clock className="text-rose-600" /> Tablero de Rotación (Dead Stock)</h3>
          <ul className="space-y-3">
            {data.deadStock.map((d, i) => (
              <li key={i} className="flex justify-between items-center border-b pb-2">
                <span>{d.name}</span>
                <Badge color="red">Inmovilizado: {d.on_hand}</Badge>
              </li>
            ))}
            {data.deadStock.length === 0 && <p className="text-sm text-slate-500">No hay piezas sin movimiento.</p>}
          </ul>
        </Card>
      </div>

      <div className="mt-8">
        <button 
          onClick={runAiAnalysis}
          disabled={analyzing}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-lg font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-lg disabled:opacity-50 transition"
        >
          {analyzing ? <Spinner /> : <Bot />}
          {analyzing ? " Generando Pronóstico Avanzado IA..." : "Generar Pronóstico IA y Estrategia de Rotación"}
        </button>

        {aiAnalysis && (
          <Card className="mt-6 border-2 border-violet-200 bg-violet-50">
            <h3 className="font-bold text-violet-800 text-xl mb-3 flex items-center gap-2"><Bot /> Análisis de Demanda y Rotación</h3>
            <p className="text-violet-700 font-medium mb-4">{aiAnalysis.analisis}</p>
            <div className="space-y-3">
              {(aiAnalysis.recomendaciones || []).map((r, i) => (
                <div key={i} className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-bold text-violet-900">{r.titulo}</h4>
                  <p className="text-slate-600 mt-1">{r.descripcion}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
