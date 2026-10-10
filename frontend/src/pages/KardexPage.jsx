import { useState } from 'react';
import { fetchApi } from '../api';

export default function KardexPage() {
  const [partId, setPartId] = useState('');
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!partId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi(/parts//ledger);
      setLedger(data);
    } catch (err) {
      setError(err.message);
      setLedger(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Kardex (Libro Mayor)</h2>
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <input 
            type="number" 
            placeholder="ID de la Pieza (Ej: 101)" 
            className="flex-1 p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500"
            value={partId}
            onChange={(e) => setPartId(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">Buscar</button>
        </form>
        {error && <p className="mt-4 text-red-600 bg-red-50 p-3 rounded">{error}</p>}
      </div>

      {loading && <div className="p-8 text-center text-gray-500">Cargando kardex...</div>}

      {ledger && !loading && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Movimientos para la Pieza {ledger.part_id}
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref. Evento</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo Corrido</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ledger.items.length === 0 && (
                  <tr><td colSpan="6" className="px-4 py-4 text-center text-gray-500">Sin movimientos</td></tr>
                )}
                {ledger.items.map((m, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(m.occurred_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.location_id}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={px-2 py-1 rounded text-xs font-medium }>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={m.reference_event_id}>
                      {m.reference_event_id}
                    </td>
                    <td className={px-4 py-3 text-sm text-right font-bold }>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">{m.running_balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

