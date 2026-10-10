import { useState, useEffect } from 'react';
import { fetchApi } from '../api';

export default function WarehousePage() {
  const [shortages, setShortages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [resolveIds, setResolveIds] = useState({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sh, sg, un] = await Promise.all([
        fetchApi('/shortages'),
        fetchApi('/reorder-suggestions'),
        fetchApi('/unmatched-receipts'),
      ]);
      setShortages(sh.items || []);
      setSuggestions(sg.items || []);
      setUnmatched((un.items || []).filter((u) => u.status !== 'resolved'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolveUnmatched = async (id) => {
    const partId = resolveIds[id];
    if (!partId) return;
    try {
      await fetchApi(`/unmatched-receipts/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ part_id: parseInt(partId) }),
      });
      loadData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando almacén...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Panel de Almacén</h2>
        <button onClick={loadData} className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Recepciones Sin Relacionar</h3>
          {unmatched.length === 0 ? (
            <p className="text-gray-500">No hay recepciones pendientes.</p>
          ) : (
            <ul className="space-y-3">
              {unmatched.map((u) => (
                <li key={u.id} className="p-3 bg-gray-50 rounded border">
                  <div className="flex justify-between">
                    <span className="font-medium text-red-600">SKU: {u.sku}</span>
                    <span className="text-sm bg-gray-200 px-2 py-1 rounded">Cant: {u.quantity}</span>
                  </div>
                  <p className="text-sm text-gray-600 my-1">{u.description}</p>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="number"
                      placeholder="ID de la Pieza"
                      className="border p-1 text-sm rounded w-32"
                      value={resolveIds[u.id] || ''}
                      onChange={(e) => setResolveIds({ ...resolveIds, [u.id]: e.target.value })}
                    />
                    <button
                      onClick={() => handleResolveUnmatched(u.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Resolver
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Sugerencias de Compra</h3>
          {suggestions.length === 0 ? (
            <p className="text-gray-500">No hay sugerencias actuales.</p>
          ) : (
            <ul className="space-y-3">
              {suggestions.map((s) => (
                <li key={s.part_id} className="p-3 bg-gray-50 rounded border flex justify-between items-center">
                  <div>
                    <span className="font-bold">Pieza ID: {s.part_id}</span>
                    <p className="text-sm text-gray-600">Órdenes: {(s.work_order_ids || []).join(', ')}</p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">Sugerido: {s.suggested_quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500 lg:col-span-2">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Faltantes Abiertos</h3>
          {shortages.length === 0 ? (
            <p className="text-gray-500">No hay faltantes registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pieza</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faltante</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shortages.map((s, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.work_order_code || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {s.part_id ? `${s.part_id} - ${s.name}` : 'Desconocida'}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-orange-600">{s.missing_quantity ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
