import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchApi } from '../api';

export default function LocationsMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      // Inicializar mapa centrado en la región
      mapInstanceRef.current = L.map(mapRef.current).setView([24.5000, -100.5000], 6);

      // Capa de mapa clara (light mode)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
    }

    async function loadMarkers() {
      try {
        const data = await fetchApi('/locations-map');
        const locations = data.items || [];

        locations.forEach(loc => {
          const lat = parseFloat(loc.latitude);
          const lng = parseFloat(loc.longitude);

          if (!isNaN(lat) && !isNaN(lng)) {
            const isHuesillo = loc.partType === 'huesillos';
            // violet-600 vs rose-500 for matching the current app theme
            const pinColor = isHuesillo ? '#e11d48' : '#7c3aed'; 

            const customIcon = L.divIcon({
              className: 'custom-map-pin',
              html: `<div style="background-color: ${pinColor}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px ${pinColor};"></div>`,
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            });

            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(mapInstanceRef.current);

            marker.bindPopup(`
              <div style="color: ${pinColor}; font-weight: bold; font-size: 1.1em;">📍 ${loc.name}</div>
              <p style="margin: 4px 0; color: #475569;"><b>Tipo:</b> ${loc.categoryLabel}</p>
              <p style="margin: 0; color: #64748b;"><b>Código:</b> ${loc.code} (${loc.city})</p>
            `);
          }
        });
      } catch (error) {
        console.error('Error al cargar el mapa:', error);
      }
    }

    loadMarkers();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm mt-4">
      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-2">🗺️ Mapeo de Proveedores</h3>
      <p className="text-slate-500 text-sm mb-4">Proveedores de Huesillos (Rojo) y Motores (Morado)</p>
      
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '400px', 
          borderRadius: '8px', 
          zIndex: 10
        }} 
      />
    </div>
  );
}
