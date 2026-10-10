const { pool } = require('./backend/src/db.js');

async function run() {
    try {
        const query = `
            SELECT 
                b.part_id, 
                p.sku AS codigo_de_barra, 
                p.name AS pieza, 
                SUM(b.on_hand) as on_hand, 
                SUM(b.reserved) as reserved, 
                SUM(b.on_hand - b.reserved) as available
            FROM balances b
            JOIN parts p ON b.part_id = p.part_id
            GROUP BY b.part_id, p.sku, p.name
            HAVING SUM(b.on_hand) > 0
            ORDER BY on_hand DESC
            LIMIT 50;
        `;
        const res = await pool.query(query);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
