const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/WarehousePage.jsx', 'utf8');

const resolverCode = `function Resolver({ item, onDone }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  const search = async (e) => {
    e?.preventDefault();
    if (!q.trim()) return;
    try {
      const r = await fetchApi(\`/parts?search=\${encodeURIComponent(q.trim())}\`);
      setResults(r.items || []);
      if (!r.items?.length) toast('info', 'Sin resultados. Prueba con otro texto.');
    } catch (err) {
      toast('error', err.message);
    }
  };

  const resolve = async (p) => {
    setBusy(true);
    try {
      await fetchApi(\`/unmatched-receipts/\${item.id}/resolve\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part_id: p.part_id }),
      });
      toast('success', \`Recepción relacionada con "\${p.name}". El stock ya se actualizó.\`);
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
              <span><b>{p.name}</b> <span className="text-slate-500">- ID {p.part_id}{p.sku ? \` - \${p.sku}\` : ''}</span></span>
              <Link2 className="h-4 w-4 text-indigo-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}`;

c = c.replace("import { Resolver } from '../components/Resolver';", resolverCode);
fs.writeFileSync('frontend/src/pages/WarehousePage.jsx', c, 'utf8');
