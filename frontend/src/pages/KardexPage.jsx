import { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { fetchApi } from '../api';
import { PageHeader, HelpBox, Card, Empty, Spinner, Badge, useToast, inputCls, btnPrimary } from '../components/ui';

export default function KardexPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [options, setOptions] = useState([]);
  const [part, setPart] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);

  const openPart = async (p) => {
    setPart(p);
    setOptions([]);
    setLoading(true);
    try {
      setLedger(await fetchApi(`/parts/${p.part_id}/ledger`));
    } catch (err) {
      toast('error', err.message);
      setLedger(null);
    } finally {
      setLoading(false);
    }
  };

  const search = async (e) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    setLedger(null);
    setPart(null);
    try {
      const r = await fetchApi(`/parts?search=${encodeURIComponent(v)}`);
      if (r.items.length === 0) toast('info', 'No se encontró ninguna pieza con ese texto.');
      else if (r.items.length === 1) openPart(r.items[0]);
      else setOptions(r.items);
    } catch (err) {
      toast('error', err.message);
    }
  };

  const entries = ledger?.entries || [];
  const current = entries.length ? entries[0].balance : 0;
  const totalIn = entries.filter((e) => e.quantity > 0).reduce((a, e) => a + e.quantity, 0);
  const totalOut = entries.filter((e) => e.quantity < 0).reduce((a, e) => a + e.quantity, 0);

  const typeLabel = {
    receipt: ['Entrada', 'green'],
    issue: ['Salida', 'red'],
    transfer_in: ['Transfer. entrada', 'blue'],
    transfer_out: ['Transfer. salida', 'amber'],
    adjustment: ['Ajuste', 'amber'],
    count: ['Conteo', 'amber'],
  };

  return (
    <div>
      <PageHeader icon={BookOpen} title="Kardex" subtitle="Historial completo de movimientos de una pieza con saldo corrido" />

      <HelpBox
        steps={[
          'Escribe el nombre, SKU o ID de la pieza y presiona Buscar.',
          'Si hay varias coincidencias, toca la que necesitas.',
          'La tabla muestra los movimientos del más reciente al más antiguo; "Saldo" es la existencia después de cada movimiento.',
        ]}
      />

      <Card accent="indigo" className="mb-6">
        <form onSubmit={search} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input className={inputCls + ' pl-10'} placeholder="Nombre, SKU o ID de la pieza" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className={btnPrimary}>Buscar</button>
        </form>
        {options.length > 0 && (
          <div className="mt-3 space-y-2 max-h-72 overflow-auto">
            <p className="text-xs text-slate-500">{options.length} coincidencias — elige una:</p>
            {options.map((p) => (
              <button key={p.part_id} onClick={() => openPart(p)} className="w-full text-left p-3 border rounded-xl hover:bg-indigo-50 hover:border-indigo-300">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-slate-500">ID {p.part_id}{p.sku ? ` · SKU ${p.sku}` : ''}</div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {loading && <Spinner text="Cargando movimientos…" />}
      {!loading && !ledger && options.length === 0 && <Empty icon={BookOpen} text="Busca una pieza para ver su kardex." />}

      {ledger && !loading && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-2xl p-4 border shadow-sm"><div className="text-xs text-slate-500">Saldo actual</div><div className="text-3xl font-bold text-indigo-700">{current}</div></div>
            <div className="bg-white rounded-2xl p-4 border shadow-sm"><div className="text-xs text-slate-500">Total entradas</div><div className="text-3xl font-bold text-emerald-600">+{totalIn}</div></div>
            <div className="bg-white rounded-2xl p-4 border shadow-sm"><div className="text-xs text-slate-500">Total salidas</div><div className="text-3xl font-bold text-rose-600">{totalOut}</div></div>
          </div>

          <Card title={part ? `${part.name} (ID ${part.part_id})` : `Pieza ${ledger.part_id}`} accent="indigo">
            {entries.length === 0 ? <Empty text="Esta pieza aún no tiene movimientos." /> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-slate-500 border-b">
                      <th className="py-2 pr-3">Fecha</th><th className="pr-3">Tipo</th><th className="pr-3">Ubicación</th>
                      <th className="pr-3 text-right">Cantidad</th><th className="text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((m) => {
                      const [label, color] = typeLabel[m.type] || [m.type, 'slate'];
                      return (
                        <tr key={m.movement_id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="py-2 pr-3 text-slate-600">{new Date(m.occurred_at).toLocaleString()}</td>
                          <td className="pr-3"><Badge color={color}>{label}</Badge></td>
                          <td className="pr-3"><Badge>{m.location_id}</Badge></td>
                          <td className={`pr-3 text-right font-bold ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                          <td className="text-right font-bold text-slate-800">{m.balance}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
