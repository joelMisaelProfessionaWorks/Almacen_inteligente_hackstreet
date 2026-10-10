import { pool } from './src/db.js';

async function run() {
    try {
        const parts = ['pc-24', 'tornillo gx12', 'inserto-001'];
        for (const p of parts) {
            console.log(`\nQuerying part: ${p}`);
            const res = await pool.query(`SELECT part_id, sku, name FROM parts WHERE sku ILIKE $1 OR name ILIKE $1`, [`%${p}%`]);
            console.log('Parts found:', res.rows);
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
