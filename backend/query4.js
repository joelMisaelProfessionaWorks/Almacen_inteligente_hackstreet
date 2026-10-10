import { pool } from './src/db.js';

async function run() {
    try {
        const res = await pool.query(`SELECT part_id, sku, name FROM parts WHERE sku ILIKE '%24%' OR name ILIKE '%24%' OR sku ILIKE '%pc%' OR name ILIKE '%pc%' LIMIT 50`);
        console.log('Parts found:', res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
