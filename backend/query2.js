import { pool } from './src/db.js';

async function run() {
    try {
        const res = await pool.query(`SELECT part_id, sku, name FROM parts WHERE sku ILIKE $1 OR name ILIKE $1`, [`%pc%24%`]);
        console.log('Parts found for pc-24:', res.rows);
        
        if (res.rows.length === 0) {
            const res2 = await pool.query(`SELECT part_id, sku, name FROM parts WHERE sku ILIKE $1 OR name ILIKE $1`, [`%pc%`]);
            console.log('Other PC parts found:', res2.rows);
        } else {
            for (const row of res.rows) {
                const balRes = await pool.query(`SELECT location_id, on_hand, reserved FROM balances WHERE part_id = $1`, [row.part_id]);
                console.log(`Balances for part ${row.part_id}:`, balRes.rows);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
