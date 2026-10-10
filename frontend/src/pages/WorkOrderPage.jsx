import { useState, useEffect } from 'react';
import { ClipboardList, AlertTriangle, PackageCheck, Bot, MapPin, DollarSign, Wrench, Truck, Sparkles, TrendingDown } from 'lucide-react';
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
      const query = `Para la orden de trabajo ${orderId}, faltan las siguientes refacciones: ${partsText}. ` +
        `Indica para cada pieza su ubicación en el almacén, la ubicación del proveedor o taller externo, y calcula un costo aproximado en pesos mexicanos ($ MXN) de comprar cada refacción faltante y el costo total. ` +
        `Además indica opciones de reparación interna en taller vs compra externa para evitar sobreinventarios y tiempos de entrega.`;
      
      const res = await fetchApi(`/recommendations?q=${encodeURIComponent(query)}`);
      
      let parsed = typeof res.recommendation === 'string' 
        ? JSON.parse(res.recommendation.replace(/^\`\`\`(?:json)?\n?/gi, '').replace(/\n?\`\`\`$/g, '').trim()) 
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
                    className="flex items-center gap-2 bg-violet-100 hover:bg-violet-200 text-violet-700 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition shadow-xs"
                  >
                    {aiLoading === o.id ? (
                      <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Bot className="w-4 h-4 text-violet-600" />
                    )}
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
                  <div className="bg-gradient-to-br from-violet-50 to-indigo-50/40 p-5 rounded-2xl border border-violet-200/80 shadow-xs space-y-4 mt-4">
                    {/* Encabezado con Bot y Totales Financieros */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-200/60 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-violet-600 text-white rounded-xl shadow-xs">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-violet-950 text-base flex items-center gap-1.5">
                            Análisis de Proveedores, Costos y Reparación
                            <Sparkles className="w-4 h-4 text-amber-500" />
                          </h4>
                          <p className="text-xs text-violet-700 font-medium">
                            Estrategia de Optimización: Evitar Sobreinventario
                          </p>
                        </div>
                      </div>

                      {/* Tarjetas de Costos Financieros */}
                      <div className="flex flex-wrap items-center gap-2">
                        {aiData[o.id].costo_total_compra && (
                          <div className="bg-white border border-rose-200 px-3 py-1.5 rounded-xl shadow-2xs text-right">
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Costo Total Compra</span>
                            <span className="text-sm font-extrabold text-rose-700">{aiData[o.id].costo_total_compra}</span>
                          </div>
                        )}
                        {aiData[o.id].costo_total_reparacion && aiData[o.id].costo_total_reparacion !== 'N/A' && (
                          <div className="bg-white border border-emerald-200 px-3 py-1.5 rounded-xl shadow-2xs text-right">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Taller Interno</span>
                            <span className="text-sm font-extrabold text-emerald-700">{aiData[o.id].costo_total_reparacion}</span>
                          </div>
                        )}
                        {aiData[o.id].ahorro_potencial && aiData[o.id].ahorro_potencial !== '$0 MXN' && (
                          <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl shadow-xs text-right">
                            <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider block">Ahorro Estimado</span>
                            <span className="text-sm font-extrabold">{aiData[o.id].ahorro_potencial}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Resumen de Ubicaciones */}
                    {aiData[o.id].ubicaciones_resumen && (
                      <div className="bg-white p-3 rounded-xl border border-violet-100 flex items-start gap-2.5 text-xs text-slate-700 shadow-2xs">
                        <MapPin className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-violet-900 block font-semibold mb-0.5">Ubicaciones Clave:</strong>
                          <span>{aiData[o.id].ubicaciones_resumen}</span>
                        </div>
                      </div>
                    )}

                    {/* Resumen Analítico */}
                    <p className="text-sm text-slate-700 leading-relaxed bg-white/70 p-3.5 rounded-xl border border-violet-100">
                      {aiData[o.id].analisis}
                    </p>

                    {/* Desglose de Refacciones Faltantes, Ubicaciones y Costos */}
                    {aiData[o.id].refacciones_faltantes && aiData[o.id].refacciones_faltantes.length > 0 && (
                      <div className="space-y-2.5 pt-1">
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          Desglose de Refacciones, Ubicaciones y Costos de Compra:
                        </h5>
                        <div className="grid gap-3">
                          {aiData[o.id].refacciones_faltantes.map((item, idx) => (
                            <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                  <span>{item.nombre}</span>
                                  <span className="bg-rose-100 text-rose-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                    Faltan: {item.cantidad}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                  {item.costo_unitario_aprox && (
                                    <span className="text-slate-500">
                                      Unitario: <strong className="text-slate-900 font-semibold">{item.costo_unitario_aprox}</strong>
                                    </span>
                                  )}
                                  {item.costo_total_aprox && (
                                    <span className="bg-rose-50 text-rose-700 border border-rose-200 font-bold px-2 py-0.5 rounded-md">
                                      Total Compra: {item.costo_total_aprox}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div className="flex items-start gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                  <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold text-slate-800 block">Ubicación en Almacén:</span>
                                    <span>{item.ubicacion_almacen || 'Almacén Central (Bahía General)'}</span>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                  <Truck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold text-slate-800 block">Proveedor / Origen:</span>
                                    <span>{item.ubicacion_proveedor || 'Distribuidor Industrial'} {item.tiempo_entrega ? `• Entrega: ${item.tiempo_entrega}` : ''}</span>
                                  </div>
                                </div>
                              </div>

                              {item.opcion_reparacion && (
                                <div className="flex items-start gap-2 text-xs bg-emerald-50 text-emerald-900 p-2.5 rounded-lg border border-emerald-200/80">
                                  <Wrench className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <span className="font-bold text-emerald-950">Alternativa en Taller Interno: </span>
                                    <span>{item.opcion_reparacion}</span>
                                  </div>
                                </div>
                              )}

                              {item.decision_recomendada && (
                                <p className="text-[11px] text-slate-600 bg-indigo-50/40 p-2 rounded-lg border border-indigo-100">
                                  💡 <strong className="text-indigo-900">Estrategia sugerida:</strong> {item.decision_recomendada}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recomendaciones Estratégicas para Evitar Sobreinventario */}
                    {aiData[o.id].recomendaciones && aiData[o.id].recomendaciones.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-violet-100">
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Recomendaciones Estratégicas de Abastecimiento:
                        </h5>
                        <div className="space-y-2">
                          {aiData[o.id].recomendaciones.map((r, i) => (
                            <div key={i} className="bg-white p-3 rounded-xl border border-violet-100/90 shadow-2xs text-xs space-y-1">
                              <div className="flex justify-between items-center">
                                <strong className="text-violet-900 font-bold text-sm">{r.titulo}</strong>
                                {r.costo_estimado && (
                                  <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                                    {r.costo_estimado}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 leading-relaxed">{r.descripcion}</p>
                              {r.ubicacion && (
                                <div className="text-[11px] text-violet-700 font-medium flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3 text-violet-500" />
                                  <span>{r.ubicacion}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
