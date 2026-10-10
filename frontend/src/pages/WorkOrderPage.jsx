import { useState, useEffect } from 'react';
import { ClipboardList, AlertTriangle, PackageCheck, Bot } from 'lucide-react';
import { fetchApi } from '../api';
import { PageHeader, HelpBox, Card, Empty, Spinner, Badge, btnPrimary } from '../components/ui';
import LocationsMap from './LocationsMap';

export default function WorkOrderPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(null); // id of the order being analyzed
  const [aiData, setAiData] = useState({});

  useEffect(() => {
    fetchApi('/work-orders')
      .then((d) => setOrders(d.items || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const analyzeOrder = async (orderId, missingParts) => {
    setAiLoading(orderId);
    try {
      const partsText = missingParts.map(p => `${p.name} (faltan ${p.missing})`).join(', ');
      const res = await fetchApi(`/recommendations?q=${encodeURIComponent("Faltan estas piezas para la orden " + orderId + ": " + partsText + ". ¿Qué recomiendas sobre tiempos de entrega, proveedores o reparación interna para evitar sobreinventarios?")}`);
      
      let parsed = typeof res.recommendation === 'string' 
        ? JSON.parse(res.recommendation.replace(/^\`\`\`(?:json)?\\n?/gi, '').replace(/\\n?\`\`\`$/g, '').trim()) 
        : res.recommendation;
      
      setAiData(prev => ({ ...prev, [orderId]: parsed }));
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(null);
    }
  };

  if (loading) return <Spinner />;

  const pendingOrders = orders.filter(o => o.pending);
  const readyOrders = orders.filter(o => !o.pending);

  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardList} title="Órdenes de Trabajo y Compras" subtitle="Gestión de órdenes pendientes y disponibles" />

      <HelpBox
        steps={[
          'Las órdenes "Pendientes" necesitan material que no está disponible.',
          'Usa el Asistente IA para obtener información sobre proveedores, tiempos de entrega o posibilidad de reparación interna.',
          'Las órdenes "Disponibles" tienen todo el material listo para ser surtido o transferido en el Piso.',
        ]}
      />

      <LocationsMap />
        <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-rose-700">
          <AlertTriangle className="h-6 w-6" /> Órdenes Pendientes (Faltan piezas)
        </h2>
        {pendingOrders.length === 0 ? (
          <p className="text-slate-500 italic">No hay órdenes pendientes.</p>
        ) : (
          <div className="grid gap-4">
            {pendingOrders.map(o => (
              <Card key={o.id} className="border-l-4 border-rose-500">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{o.code}</h3>
                    <Badge color="amber">Requiere compras o reparación</Badge>
                  </div>
                  <button 
                    onClick={() => analyzeOrder(o.id, o.missing_parts)}
                    disabled={aiLoading === o.id}
                    className="flex items-center gap-2 bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                  >
                    {aiLoading === o.id ? <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /> : <Bot className="w-4 h-4" />}
                    Analizar Proveedores / Reparación
                  </button>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-lg mb-3">
                  <span className="text-sm font-semibold text-slate-700 block mb-2">Piezas Faltantes:</span>
                  <ul className="text-sm space-y-1">
                    {o.missing_parts.map((p, idx) => (
                      <li key={idx} className="flex justify-between text-rose-600">
                        <span>{p.name} {p.sku ? `(${p.sku})` : ''}</span>
                        <span className="font-bold">Faltan: {p.missing}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {aiData[o.id] && (
                  <div className="bg-violet-50 p-4 rounded-xl border border-violet-100">
                    <h4 className="font-bold text-violet-800 flex items-center gap-2 mb-2">
                      <Bot className="w-4 h-4" /> Recomendación de la IA
                    </h4>
                    <p className="text-sm text-violet-700 font-medium mb-3">{aiData[o.id].analisis}</p>
                    <div className="space-y-2">
                      {(aiData[o.id].recomendaciones || []).map((r, i) => (
                        <div key={i} className="bg-white p-3 rounded shadow-sm text-sm">
                          <strong className="text-violet-900 block">{r.titulo}</strong>
                          <span className="text-slate-600">{r.descripcion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 mt-8">
        <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-700">
          <PackageCheck className="h-6 w-6" /> Órdenes Disponibles (Listas para surtir)
        </h2>
        {readyOrders.length === 0 ? (
          <p className="text-slate-500 italic">No hay órdenes listas en este momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {readyOrders.map(o => (
              <Card key={o.id} className="border-l-4 border-emerald-500">
                <h3 className="font-bold text-lg">{o.code}</h3>
                <Badge color="green" className="mt-2">Lista para Piso</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
