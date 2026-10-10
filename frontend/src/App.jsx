import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import FloorPage from './pages/FloorPage';
import WarehousePage from './pages/WarehousePage';
import WorkOrderPage from './pages/WorkOrderPage';
import KardexPage from './pages/KardexPage';
import { fetchApi } from './api';

function App() {
  // Voice alerts for new shortages
  useEffect(() => {
    let lastShortagesCount = 0;
    const checkShortages = async () => {
      try {
        const data = await fetchApi('/shortages');
        const currentCount = data.items ? data.items.length : 0;
        if (currentCount > lastShortagesCount && lastShortagesCount > 0) {
          const utterance = new SpeechSynthesisUtterance('Alerta. Se ha detectado un nuevo faltante en el almacén.');
          utterance.lang = 'es-MX';
          window.speechSynthesis.speak(utterance);
        }
        lastShortagesCount = currentCount;
      } catch (e) {
        console.error("Error checking shortages:", e);
      }
    };
    
    // Poll every 10 seconds
    const interval = setInterval(checkShortages, 10000);
    checkShortages();
    
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <nav className="bg-blue-600 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex space-x-4 md:space-x-8 items-center overflow-x-auto">
                <span className="font-bold text-lg md:text-xl flex items-center gap-2 whitespace-nowrap">
                  <Package className="h-5 w-5 md:h-6 md:w-6" /> Smart Warehouse
                </span>
                <Link to="/" className="hover:bg-blue-700 px-3 py-2 rounded-md font-medium whitespace-nowrap">Piso</Link>
                <Link to="/warehouse" className="hover:bg-blue-700 px-3 py-2 rounded-md font-medium whitespace-nowrap">Almacén</Link>
                <Link to="/work-orders" className="hover:bg-blue-700 px-3 py-2 rounded-md font-medium whitespace-nowrap">Ordenes</Link>
                <Link to="/kardex" className="hover:bg-blue-700 px-3 py-2 rounded-md font-medium whitespace-nowrap">Kardex</Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6">
          <Routes>
            <Route path="/" element={<FloorPage />} />
            <Route path="/warehouse" element={<WarehousePage />} />
            <Route path="/work-orders" element={<WorkOrderPage />} />
            <Route path="/kardex" element={<KardexPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
