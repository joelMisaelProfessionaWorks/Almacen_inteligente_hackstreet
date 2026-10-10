import { pool } from './src/db.js';

async function run() {
    try {
        const res = await pool.query(`SELECT part_id, sku, name FROM parts WHERE sku ILIKE '%pc%24%' OR sku ILIKE 'pc-24' OR name ILIKE '%pc-24%' OR sku = 'pc-24'`);
        console.log('pc-24 parts:', res.rows);
        
        if (res.rows.length === 0) {
             const res2 = await pool.query(`SELECT part_id, sku, name FROM parts WHERE sku ILIKE '%p-24%' OR sku ILIKE '%p%24%'`);
             console.log('p-24 parts:', res2.rows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
