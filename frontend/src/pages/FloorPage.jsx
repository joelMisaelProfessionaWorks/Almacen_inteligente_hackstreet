import { useState } from 'react';
import { fetchApi } from '../api';

export default function FloorPage() {
  const [location, setLocation] = useState('');
  const [partQuery, setPartQuery] = useState('');
  const [partId, setPartId] = useState('');
  const [action, setAction] = useState('issue');
  const [quantity, setQuantity] = useState(1);
  const [extraField, setExtraField] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [partOptions, setPartOptions] = useState([]);

  const handleSearchPart = async (e) => {
    e.preventDefault();
    if (!partQuery) return;
    setLoading(true);
    setError(null);
    setPartOptions([]);
    try {
      const data = await fetchApi(`/parts?search=${encodeURIComponent(partQuery)}`);
      if (data.items.length === 1) {
        setPartId(data.items[0].part_id);
        setMessage(`Pieza seleccionada: ${data.items[0].name} (SKU: ${data.items[0].sku})`);
      } else if (data.items.length > 1) {
        setPartOptions(data.items);
        setMessage('SKU ambiguo, por favor selecciona la pieza correcta.');
      } else {
        setError('No se encontró ninguna pieza con ese código.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!partId || !location || !quantity) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (action === 'issue') {
        await fetchApi('/issues', {
          method: 'POST',
          body: JSON.stringify({
            part_id: parseInt(partId),
            location_id: parseInt(location),
            quantity: parseFloat(quantity),
            work_order_code: extraField || undefined,
          }),
        });
        setMessage('Retiro registrado correctamente.');
      } else if (action === 'transfer') {
        await fetchApi('/transfers', {
          method: 'POST',
          body: JSON.stringify({
            part_id: parseInt(partId),
            from_location_id: parseInt(location),
            to_location_id: parseInt(extraField),
            quantity: parseFloat(quantity),
          }),
        });
        setMessage('Transferencia registrada correctamente.');
      } else if (action === 'count') {
        await fetchApi('/counts', {
          method: 'POST',
          body: JSON.stringify({
            part_id: parseInt(partId),
            location_id: parseInt(location),
            quantity: parseFloat(quantity),
            reason: extraField || 'Conteo físico',
          }),
        });
        setMessage('Conteo registrado correctamente.');
      }

      const utterance = new SpeechSynthesisUtterance('Operación completada');
      utterance.lang = 'es-MX';
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Terminal de Piso (Escáner)</h2>

      <div className="space-y-4">
        <form onSubmit={handleSearchPart} className="flex gap-2">
          <input
            type="text"
            placeholder="Escanear Pieza (SKU)..."
            className="flex-1 p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 text-lg"
            value={partQuery}
            onChange={(e) => setPartQuery(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
            Buscar
          </button>
        </form>

        {partOptions.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">Selecciona la pieza exacta:</h3>
            <div className="space-y-2">
              {partOptions.map((p) => (
                <button
                  key={p.part_id}
                  onClick={() => {
                    setPartId(p.part_id);
                    setPartOptions([]);
                    setMessage(`Pieza seleccionada: ${p.name} (ID ${p.part_id})`);
                  }}
                  className="w-full text-left p-3 border rounded bg-white hover:bg-blue-50"
                >
                  <span className="font-bold">{p.sku}</span> - {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acción</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full p-3 border rounded-lg bg-gray-50 text-lg"
            >
              <option value="issue">Retirar (Salida)</option>
              <option value="transfer">Transferir</option>
              <option value="count">Contar (Ajuste)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación Origen</label>
              <input
                type="number"
                placeholder="ID Ubicación"
                required
                className="w-full p-3 border rounded-lg bg-gray-50 text-lg"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full p-3 border rounded-lg bg-gray-50 text-lg"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {action === 'issue' ? 'Orden de Trabajo (Opcional)' : action === 'transfer' ? 'Ubicación Destino' : 'Motivo'}
            </label>
            <input
              type={action === 'transfer' ? 'number' : 'text'}
              placeholder={action === 'issue' ? 'Ej: WO-123' : action === 'transfer' ? 'ID Destino' : 'Motivo del conteo'}
              required={action !== 'issue'}
              className="w-full p-3 border rounded-lg bg-gray-50 text-lg"
              value={extraField}
              onChange={(e) => setExtraField(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !partId}
            className="w-full bg-green-600 text-white p-4 rounded-lg font-bold text-xl hover:bg-green-700 disabled:opacity-50"
          >
            Confirmar {action === 'issue' ? 'Retiro' : action === 'transfer' ? 'Transferencia' : 'Conteo'}
          </button>
        </form>

        {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
        {message && <div className="p-3 bg-green-100 text-green-700 rounded-lg">{message}</div>}
      </div>
    </div>
  );
}
