import { useState } from 'react';
import { fetchApi } from '../api';

export default function WorkOrderPage() {
  const [code, setCode] = useState('');
  const [materials, setMaterials] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi(`/work-orders/${encodeURIComponent(code)}/materials`);
      setMaterials(data);
    } catch (err) {
      setError(err.message);
      setMaterials(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Consulta de Orden de Trabajo</h2>
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <input
            type="text"
            placeholder="Código de la Orden"
            className="flex-1 p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">
            Buscar
          </button>
        </form>
        {error && <p className="mt-4 text-red-600 bg-red-50 p-3 rounded">{error}</p>}
      </div>

      {loading && <div className="p-8 text-center text-gray-500">Cargando materiales...</div>}

      {materials && !loading && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Materiales para {materials.code}</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Línea BOM</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pieza</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Requerido</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reservado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entregado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Faltante</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {materials.lines.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center text-gray-500">
                      No hay materiales requeridos
                    </td>
                  </tr>
                )}
                {materials.lines.map((m, idx) => (
                  <tr key={idx} className={m.missing > 0 ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.bom_line_id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {m.part_id ? `${m.part_id} - ${m.name}` : m.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{m.required ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-right text-blue-600">{m.reserved}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">{m.issued}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-red-600">{m.missing ?? 0}</td>
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
