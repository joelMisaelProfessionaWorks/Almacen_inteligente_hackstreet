import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Package, ScanLine, Warehouse, ClipboardList, BookOpen, Volume2, VolumeX } from 'lucide-react';
import FloorPage from './pages/FloorPage';
import WarehousePage from './pages/WarehousePage';
import WorkOrderPage from './pages/WorkOrderPage';
import KardexPage from './pages/KardexPage';
import AdvancedDashboardPage from './pages/AdvancedDashboardPage';
import { ToastProvider, useToast } from './components/ui';
import { fetchApi } from './api';

const tabs = [
  { to: '/', label: 'Piso', icon: ScanLine, end: true },
  { to: '/warehouse', label: 'Almacén', icon: Warehouse },
  { to: '/work-orders', label: 'Órdenes', icon: ClipboardList },
  { to: '/kardex', label: 'Kardex', icon: BookOpen },
    { to: '/advanced', label: 'IA Avanzada', icon: Package },
];

function Shell() {
  const toast = useToast();
  const [voice, setVoice] = useState(() => localStorage.getItem('voice') !== '0');
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  // Aviso de voz + notificacion cuando aparece un faltante nuevo
  useEffect(() => {
    let known = null;
    const check = async () => {
      try {
        const data = await fetchApi('/shortages');
        const keys = new Set((data.items || []).map((s) => `${s.work_order_id}:${s.inspection_item_id}`));
        if (known !== null) {
          const fresh = [...keys].filter((k) => !known.has(k));
          if (fresh.length > 0) {
            const msg = `Alerta: se abrió ${fresh.length === 1 ? 'un nuevo faltante' : fresh.length + ' nuevos faltantes'} en el almacén`;
            toast('error', msg);
            if (voiceRef.current && 'speechSynthesis' in window) {
              const u = new SpeechSynthesisUtterance(msg);
              u.lang = 'es-MX';
              window.speechSynthesis.speak(u);
            }
          }
        }
        known = keys;
      } catch {
        /* backend apagado: ignorar */
      }
    };
    check();
    const id = setInterval(check, 8000);
    return () => clearInterval(id);
  }, [toast]);

  const toggleVoice = () => {
    const next = !voice;
    setVoice(next);
    localStorage.setItem('voice', next ? '1' : '0');
    if (next && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('Alertas de voz activadas');
      u.lang = 'es-MX';
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 pb-24 md:pb-0">
      <header className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Package className="h-6 w-6" /> Almacén Inteligente
          </div>
          <nav className="hidden md:flex gap-1">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                    isActive ? 'bg-white text-indigo-700 shadow' : 'text-indigo-100 hover:bg-white/15'
                  }`
                }
              >
                <Icon className="h-4 w-4" /> {label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={toggleVoice}
            title={voice ? 'Desactivar alertas de voz' : 'Activar alertas de voz'}
            className="flex items-center gap-2 text-sm bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl"
          >
            {voice ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden sm:inline">Voz {voice ? 'activada' : 'apagada'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <Routes>
          <Route path="/" element={<FloorPage />} />
          <Route path="/warehouse" element={<WarehousePage />} />
          <Route path="/work-orders" element={<WorkOrderPage />} />
          <Route path="/kardex" element={<KardexPage />} />
          <Route path="/advanced" element={<AdvancedDashboardPage />} />
        </Routes>
      </main>

      {/* Barra inferior para movil */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t shadow-2xl z-40 grid grid-cols-4">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 text-xs font-medium ${isActive ? 'text-indigo-600' : 'text-slate-500'}`
            }
          >
            <Icon className="h-6 w-6 mb-0.5" /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </BrowserRouter>
  );
}
