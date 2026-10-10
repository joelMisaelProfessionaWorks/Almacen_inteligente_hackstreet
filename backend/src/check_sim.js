import { pool } from './db.js';
import { processInspectionApproved } from './domain/reservations.js';

async function test() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        const partId = 1111113;
        await client.query("INSERT INTO parts (part_id, sku, name) VALUES (" + partId + ", 'BAJA-TEST-3', 'BAJA')");
        
        await client.query("INSERT INTO balances (part_id, location_id, on_hand, reserved) VALUES (" + partId + ", 100, 1, 0)");
        
        const woId = 222224;
        await client.query("INSERT INTO work_orders (work_order_id, code, status) VALUES (" + woId + ", 'WO-TEST-3', 'open')");
        
        await client.query("INSERT INTO bom_lines (bom_line_id, model_id, part_id, qty_per_unit) VALUES (9999, " + woId + ", " + partId + ", 1)");
        
        const inspectionId = 7777;
        await client.query("INSERT INTO inspections (inspection_id, work_order_id) VALUES (" + inspectionId + ", " + woId + ")");
        
        const payload = {
            work_order_id: woId,
            inspection_id: inspectionId,
            items: [
                {
                    action: 'buy',
                    part_id: partId,
                    bom_line_id: 9999,
                    inspection_item_id: 8888,
                    quantity: 3
                }
            ],
            occurred_at: new Date().toISOString()
        };
        
        await processInspectionApproved(client, 'event-test-12345', payload);
        
        const bal = await client.query("SELECT * FROM balances WHERE part_id = " + partId);
        console.log('Balances:', bal.rows);
        
        const resv = await client.query("SELECT * FROM reservations WHERE work_order_id = " + woId);
        console.log('Reservations:', resv.rows);
        
        const short = await client.query("SELECT * FROM shortages WHERE work_order_id = " + woId);
        console.log('Shortages:', short.rows);
        
        await client.query("ROLLBACK");
    } catch(e) {
        console.log('Error:', e);
        await client.query("ROLLBACK");
    } finally {
        client.release();
        pool.end();
    }
}
test();
