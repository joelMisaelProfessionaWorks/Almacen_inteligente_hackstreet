import { useState, useEffect, useMemo, useRef } from 'react';
import { Warehouse, Boxes, AlertTriangle, ShoppingCart, Inbox, RefreshCw, Search, Link2 } from 'lucide-react';
import { fetchApi } from '../api';
import { PageHeader, HelpBox, Card, Empty, Spinner, Badge, useToast, inputCls } from '../components/ui';
function Resolver({ item, onDone }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  const search = async (e) => {
    e?.preventDefault();
    if (!q.trim()) return;
    try {
      const r = await fetchApi(`/parts?search=${encodeURIComponent(q.trim())}`);
      setResults(r.items || []);
      if (!r.items?.length) toast('info', 'Sin resultados. Prueba con otro texto.');
    } catch (err) {
      toast('error', err.message);
    }
  };

  const resolve = async (p) => {
    setBusy(true);
    try {
      await fetchApi(`/unmatched-receipts/${item.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part_id: p.part_id }),
      });
      toast('success', `Recepción relacionada con "${p.name}". El stock ya se actualizó.`);
      onDone();
    } catch (err) {
      toast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 bg-slate-50 rounded-xl p-3 border">
      <form onSubmit={search} className="flex gap-2">
        <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca la pieza correcta por código o nombre" />
        <button className="bg-indigo-600 text-white px-4 rounded-xl"><Search className="h-5 w-5" /></button>
      </form>
      {results.length > 0 && (
        <div className="mt-2 space-y-1 max-h-48 overflow-auto">
          {results.map((p) => (
            <button
              key={p.part_id}
              disabled={busy}
              onClick={() => resolve(p)}
              className="w-full text-left p-2 rounded-lg bg-white border hover:border-indigo-400 text-sm flex items-center justify-between"
            >
              <span><b>{p.name}</b> <span className="text-slate-500">- ID {p.part_id}{p.sku ? ` - ${p.sku}` : ''}</span></span>
              <Link2 className="h-4 w-4 text-indigo-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
import { AiAssistant } from '../components/AiAssistant';

function Kpi({ icon: Icon, label, value, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl p-4 bg-white border-2 shadow-sm transition hover:shadow-md ${active ? 'border-indigo-500' : 'border-transparent'}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg text-white ${color}`}><Icon className="h-5 w-5" /></div>
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-sm font-medium text-slate-500">{label}</div>
    </button>
  );
}

export default function WarehousePage() {
  const toast = useToast();
  const [tab, setTab] = useState('stock');
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [inv, sh, sg, un] = await Promise.all([
        fetchApi('/inventory').catch(() => ({items:[]})),
        fetchApi('/shortages').catch(() => ({items:[]})),
        fetchApi('/reorder-suggestions').catch(() => ({items:[]})),
        fetchApi('/unmatched-receipts').catch(() => ({items:[]})),
      ]);
      setInventory(inv.items || []);
      setShortages(sh.items || []);
      setSuggestions(sg.items || []);
      setUnmatched(un.items || []);
    } catch (e) {
      toast('error', 'No se pudo cargar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  
  const inventoryRef = useRef([]);
  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    load();
    const interval = setInterval(async () => {
      try {
        const inv = await fetchApi('/inventory').catch(() => ({items:[]}));
        const newItems = inv.items || [];
        
        // Compare with current
        const current = inventoryRef.current;
        if (current.length > 0) {
          let hasChanges = false;
          newItems.forEach(newItem => {
            const oldItem = current.find(i => i.part_id === newItem.part_id && i.location_id === newItem.location_id);
            if (oldItem && newItem.on_hand > oldItem.on_hand) {
              const diff = newItem.on_hand - oldItem.on_hand;
              toast('success', `¡Alerta: Han llegado ${diff} unidades de ${newItem.name} (SKU: ${newItem.sku}) a ${newItem.location_code}!`);
              hasChanges = true;
            } else if (!oldItem && newItem.on_hand > 0) {
              toast('success', `¡Alerta: Nuevo stock de ${newItem.on_hand} unidades de ${newItem.name} en ${newItem.location_code}!`);
              hasChanges = true;
            }
          });
          if (hasChanges) {
            // Reload all dashboard data to reflect the new stock across all widgets
            load();
          }
        }
      } catch (e) {}
    }, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);


  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? inventory.filter((i) => `${i.part_id} ${i.sku || ''} ${i.name} ${i.location_code || ''}`.toLowerCase().includes(f)) : inventory;
  }, [inventory, filter]);

  const tabs = [
    { id: 'stock', label: 'Existencias', icon: Boxes, count: inventory.length, color: 'bg-indigo-500' },
    { id: 'shortages', label: 'Faltantes', icon: AlertTriangle, count: shortages.length, color: 'bg-rose-500' },
    { id: 'suggestions', label: 'Por comprar', icon: ShoppingCart, count: suggestions.length, color: 'bg-sky-500' },
    { id: 'unmatched', label: 'Sin relacionar', icon: Inbox, count: unmatched.length, color: 'bg-amber-500' },
  ];

  return (
    <div>
      <PageHeader icon={Warehouse} title="Almacén" subtitle="Existencias, faltantes, compras sugeridas y recepciones pendientes">
        <button onClick={load} className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl text-sm hover:bg-slate-50 shadow-sm">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </PageHeader>

      <HelpBox
        steps={[
          'Toca una de las tarjetas de colores para cambiar de vista.',
          'Existencias: cuánto hay de cada pieza y dónde. Usa el buscador para filtrar.',
          'Faltantes: piezas que una orden necesita y no hay. Por comprar: cuánto conviene pedir.',
          'Sin relacionar: llegó una compra que no coincide con ninguna pieza. Búscala y toca "relacionar".',
        ]}
      />

      <div className="mb-6">
        <AiAssistant onSearch={setFilter} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {tabs.map((t) => (
          <Kpi key={t.id} icon={t.icon} label={t.label} value={t.count} color={t.color} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </div>

      {loading && <Spinner />}

      {!loading && tab === 'stock' && (
        <Card title="Existencias por pieza y ubicación" accent="indigo">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input className={inputCls + ' pl-10'} placeholder="Buscar por nombre, SKU, ID o ubicación..." value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          {filtered.length === 0 ? <Empty text="No hay existencias que coincidan." /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-500 border-b">
                    <th className="py-2 pr-3">Pieza</th><th className="pr-3">Ubicación</th>
                    <th className="pr-3 text-right">En mano</th><th className="pr-3 text-right">Reservado</th><th className="text-right">Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 200).map((i) => (
                    <tr key={`${i.part_id}-${i.location_id}`} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-2 pr-3"><div className="font-medium">{i.name}</div><div className="text-xs text-slate-500">ID {i.part_id}{i.sku ? ` - ${i.sku}` : ''}</div></td>
                      <td className="pr-3"><Badge>{i.location_code || i.location_id}</Badge></td>
                      <td className="pr-3 text-right font-semibold">{i.on_hand}</td>
                      <td className="pr-3 text-right text-amber-600">{i.reserved}</td>
                      <td className={`text-right font-bold ${i.available > 0 ? 'text-emerald-600' : i.available < 0 ? 'text-rose-600' : 'text-slate-400'}`}>{i.available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 200 && <p className="text-xs text-slate-500 mt-2">Mostrando 200 de {filtered.length}. Afina la búsqueda.</p>}
            </div>
          )}
        </Card>
      )}

      {!loading && tab === 'shortages' && (
        <Card title="Faltantes abiertos" accent="rose">
          {shortages.length === 0 ? <Empty icon={AlertTriangle} text="¡Todo surtido! No hay faltantes abiertos." /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-slate-500 border-b"><th className="py-2 pr-3">Orden</th><th className="pr-3">Pieza</th><th className="text-right">Faltan</th></tr></thead>
                <tbody>
                  {shortages.map((s, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-rose-50/50">
                      <td className="py-2 pr-3 font-semibold">{s.work_order_code || '—'}</td>
                      <td className="pr-3">{s.part_id ? `${s.name} (ID ${s.part_id})` : <Badge color="amber">Pieza sin identificar</Badge>}</td>
                      <td className="text-right font-bold text-rose-600">{s.missing_quantity ?? '?'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {!loading && tab === 'suggestions' && (
        <Card title="Sugerencias de compra" accent="sky">
          {suggestions.length === 0 ? <Empty icon={ShoppingCart} text="Sin sugerencias: el stock cubre las necesidades." /> : (
            <div className="grid sm:grid-cols-2 gap-3">
              {suggestions.map((s) => (
                <div key={s.part_id} className="rounded-xl border p-4 bg-sky-50/40">
                  <div className="text-xs text-slate-500">Pieza ID {s.part_id}</div>
                  <div className="text-3xl font-bold text-sky-700">{s.suggested_quantity} <span className="text-sm font-normal text-slate-500">por comprar</span></div>
                  <div className="text-xs text-slate-500 mt-1">Cubre {(s.work_order_ids || []).length} orden(es)</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {!loading && tab === 'unmatched' && (
        <Card title="Recepciones sin relacionar" accent="amber">
          {unmatched.length === 0 ? <Empty icon={Inbox} text="No hay recepciones pendientes." /> : (
            <ul className="space-y-3">
              {unmatched.map((u) => (
                <li key={u.id} className="border rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-amber-700">Código recibido: {u.part_number}</div>
                      <div className="text-xs text-slate-500">{u.description || 'Sin descripción'}{u.work_order_code ? ` - Orden ${u.work_order_code}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color="blue">Cantidad: {u.quantity}</Badge>
                      <button onClick={() => setOpen(open === u.id ? null : u.id)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm">
                        {open === u.id ? 'Cerrar' : 'Relacionar'}
                      </button>
                    </div>
                  </div>
                  {open === u.id && <Resolver item={u} onDone={() => { setOpen(null); load(); }} />}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
