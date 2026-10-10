import { pool } from './src/db.js';

async function run() {
    try {
        console.log("Updating pc-24 (P*24)");
        await pool.query(`UPDATE balances SET on_hand = reserved + 10 WHERE part_id = 999846119 AND location_id = 100`);
        
        console.log("Updating tornillo gx12");
        await pool.query(`UPDATE balances SET on_hand = reserved + 10 WHERE part_id = 999846120 AND location_id = 100`);
        
        console.log("Updating inserto-001");
        // Only update location 100 to provide exactly 10 available there
        await pool.query(`UPDATE balances SET on_hand = reserved + 10 WHERE part_id = 8 AND location_id = 100`);
        
        console.log("Update completed successfully.");
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
