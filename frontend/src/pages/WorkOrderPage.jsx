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
      const data = await fetchApi(/work-orders//materials);
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
            placeholder="Código de la Orden (Ej: WO-123)" 
            className="flex-1 p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">Buscar</button>
        </form>
        {error && <p className="mt-4 text-red-600 bg-red-50 p-3 rounded">{error}</p>}
      </div>

      {loading && <div className="p-8 text-center text-gray-500">Cargando materiales...</div>}

      {materials && !loading && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Materiales para {materials.work_order_code}</h3>
            <span className={px-3 py-1 rounded-full text-sm font-medium }>
              {materials.status.toUpperCase()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Línea BOM</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pieza</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Requerido</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reservado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entregado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Faltante</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {materials.items.length === 0 && (
                  <tr><td colSpan="7" className="px-4 py-4 text-center text-gray-500">No hay materiales requeridos</td></tr>
                )}
                {materials.items.map((m, idx) => (
                  <tr key={idx} className={m.shortage_quantity > 0 ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3 text-sm text-gray-900">{m.group_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.bom_line_id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.part_name || m.part_id}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{m.required_quantity}</td>
                    <td className="px-4 py-3 text-sm text-right text-blue-600">{m.reserved_quantity}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">{m.delivered_quantity}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-red-600">{m.shortage_quantity > 0 ? m.shortage_quantity : 0}</td>
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

