const http = require('http');

async function fetchJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:8000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 8000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let resp = '';
      res.on('data', chunk => resp += chunk);
      res.on('end', () => resolve(resp));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runSimulator() {
  console.log('--- Iniciando Simulador de Piso Automatizado ---');
  
  while (true) {
    try {
      const [invData, woData, locData] = await Promise.all([
        fetchJson('/inventory'),
        fetchJson('/work-orders'),
        fetchJson('/locations')
      ]);

      const inventory = invData.items || [];
      const workOrders = woData.items || woData || [];
      const locations = locData.items || locData || [];

      const availableStock = inventory.filter(i => i.available > 0);
      
      if (availableStock.length === 0 || workOrders.length === 0 || locations.length === 0) {
        console.log('Esperando datos...');
        await sleep(5000);
        continue;
      }

      const action = Math.random();

      if (action < 0.4) {
        const item = getRandom(availableStock);
        let toLoc = getRandom(locations);
        const toLocId = toLoc.location_id || toLoc.id;
        
        while (toLocId === item.location_id) {
          toLoc = getRandom(locations);
        }

        const qty = Math.floor(Math.random() * item.available) + 1;
        
        console.log(`[TRANSFER] Movilizando ${qty}x ${item.sku} de U-${item.location_id} a U-${toLoc.location_id || toLoc.id}`);
        await postJson('/transfers', {
          part_id: item.part_id,
          from_location_id: item.location_id,
          to_location_id: toLoc.location_id || toLoc.id,
          quantity: qty,
          user_id: 'AUTO_SIMULATOR'
        });

      } else if (action < 0.8) {
        const item = getRandom(availableStock);
        const wo = getRandom(workOrders);
        const qty = 1; 
        
        console.log(`[ISSUE] Surtido ${qty}x ${item.sku} desde U-${item.location_id} para orden ${wo.code}`);
        await postJson('/issues', {
          work_order_code: wo.code,
          part_id: item.part_id,
          location_id: item.location_id,
          quantity: qty,
          issued_by: 'AUTO_SIMULATOR'
        });

      } else {
        const item = getRandom(inventory);
        const diff = Math.floor(Math.random() * 3) - 1; 
        let newQty = Math.max(0, item.on_hand + diff);
        
        console.log(`[COUNT] Conteo en U-${item.location_id} de ${item.sku}. Existencia previa: ${item.on_hand}, Encontrado: ${newQty}`);
        await postJson('/counts', {
          location_id: item.location_id,
          reason: 'CICLICO_SIMULADO',
          lines: [{
            part_id: item.part_id,
            counted_quantity: newQty
          }],
          user_id: 'AUTO_SIMULATOR'
        });
      }

    } catch (e) {
      console.error('Error en simulador:', e.message);
    }
    
    const waitMs = 2000 + Math.random() * 3000;
    await sleep(waitMs);
  }
}

runSimulator();
