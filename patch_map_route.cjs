const fs = require('fs');

let r = fs.readFileSync('backend/src/api/routes.js', 'utf8');

const mapRoute = `
    // --- Endpoint para el mapa de proveedores (Huesillos vs Motores) ---
    app.get('/locations-map', async (req, res) => {
        try {
            const result = await pool.query(\`
                SELECT location_id, code, name
                FROM locations
                ORDER BY code ASC
            \`);
            
            // Coordenadas simuladas y clasificación por tipo de pieza (sin alterar la base de datos)
            const supplierData = [
                { lat: 25.4260, lng: -101.0000, city: 'Saltillo', type: 'huesillos', label: 'Proveedor de Huesillos' },
                { lat: 25.6866, lng: -100.3161, city: 'Monterrey', type: 'motores', label: 'Proveedor de Motores' },
                { lat: 22.1565, lng: -100.9855, city: 'San Luis Potosí', type: 'huesillos', label: 'Distribuidor de Huesillos' },
                { lat: 21.1619, lng: -101.6830, city: 'León', type: 'motores', label: 'Fabricante de Motores' }
            ];

            const items = result.rows.map((row, index) => {
                const data = supplierData[index % supplierData.length];
                return {
                    location_id: Number(row.location_id),
                    code: row.code,
                    name: row.name,
                    latitude: data.lat,
                    longitude: data.lng,
                    city: data.city,
                    partType: data.type, // 'huesillos' o 'motores'
                    categoryLabel: data.label
                };
            });

            res.json({ items });
        } catch (err) {
            console.error(err);
            res.status(500).json({ detail: 'Internal Server Error' });
        }
    });
`;

if (!r.includes('/locations-map')) {
    // Insert right before the last closing brace.
    const lastIndex = r.lastIndexOf('}');
    r = r.substring(0, lastIndex) + mapRoute + '\\n}\\n';
    fs.writeFileSync('backend/src/api/routes.js', r, 'utf8');
    console.log('Added /locations-map route.');
} else {
    console.log('Route already exists.');
}
