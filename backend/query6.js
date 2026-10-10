import { pool } from './src/db.js';

async function run() {
    try {
        const balRes = await pool.query(`SELECT location_id, on_hand, reserved FROM balances WHERE part_id = 999846119`);
        console.log(`Balances for part P*24 (999846119):`, balRes.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
