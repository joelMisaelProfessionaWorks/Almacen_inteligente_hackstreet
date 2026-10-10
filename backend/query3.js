import { pool } from './src/db.js';

async function run() {
    try {
        const res = await pool.query(`SELECT part_id, sku, name FROM parts LIMIT 50`);
        console.log('All parts (max 50):', res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
