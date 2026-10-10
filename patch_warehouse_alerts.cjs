const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/WarehousePage.jsx', 'utf8');

const pollingLogic = `
  const inventoryRef = useRef([]);
  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    load();
    const interval = setInterval(async () => {
      try {
        const inv = await fetchApi('/inventory').catch(() => ({items:[]}));
        const newItems = inv.items || [];
        
        // Compare with current
        const current = inventoryRef.current;
        if (current.length > 0) {
          let hasChanges = false;
          newItems.forEach(newItem => {
            const oldItem = current.find(i => i.part_id === newItem.part_id && i.location_id === newItem.location_id);
            if (oldItem && newItem.on_hand > oldItem.on_hand) {
              const diff = newItem.on_hand - oldItem.on_hand;
              toast('success', \`¡Alerta: Han llegado \${diff} unidades de \${newItem.name} (SKU: \${newItem.sku}) a \${newItem.location_code}!\`);
              hasChanges = true;
            } else if (!oldItem && newItem.on_hand > 0) {
              toast('success', \`¡Alerta: Nuevo stock de \${newItem.on_hand} unidades de \${newItem.name} en \${newItem.location_code}!\`);
              hasChanges = true;
            }
          });
          if (hasChanges) {
            // Reload all dashboard data to reflect the new stock across all widgets
            load();
          }
        }
      } catch (e) {}
    }, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);
`;

c = c.replace(
  "useEffect(() => { load(); }, []);",
  pollingLogic
);

c = c.replace(
  "import { useState, useEffect, useMemo } from 'react';",
  "import { useState, useEffect, useMemo, useRef } from 'react';"
);

fs.writeFileSync('frontend/src/pages/WarehousePage.jsx', c, 'utf8');
console.log('WarehousePage patched.');
