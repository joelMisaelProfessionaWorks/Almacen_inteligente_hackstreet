require('dotenv').config();
const { pool } = require('./src/db.js');

async function run() {
  try {
    console.log('Inserting parts...');
    
    // Check max part_id
    const maxRes = await pool.query('SELECT MAX(part_id) as m FROM parts');
    let nextId = Math.max(1000, (maxRes.rows[0].m || 0) + 1);

    // Insert P*24
    const res1 = await pool.query(`
      INSERT INTO parts (part_id, sku, sku_norm, name, description) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING part_id`, 
      [nextId++, 'P*24', 'P*24', 'P*24', 'Pieza P*24 agregada manualmente']
    );
    const p1 = res1.rows[0].part_id;
    console.log('P*24 inserted with ID:', p1);

    // Insert GX12
    const res2 = await pool.query(`
      INSERT INTO parts (part_id, sku, sku_norm, name, description) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING part_id`, 
      [nextId++, 'GX12', 'GX12', 'Tornillo GX12', 'Tornillo GX12 agregado manualmente']
    );
    const p2 = res2.rows[0].part_id;
    console.log('Tornillo GX12 inserted with ID:', p2);

    // Give them a balance of 10 in U-100
    const locId = 100;
    
    await pool.query(`
      INSERT INTO balances (part_id, location_id, on_hand, reserved)
      VALUES ($1, $2, 10, 0)
      ON CONFLICT (part_id, location_id) 
      DO UPDATE SET on_hand = balances.on_hand + 10
    `, [p1, locId]);

    await pool.query(`
      INSERT INTO balances (part_id, location_id, on_hand, reserved)
      VALUES ($1, $2, 10, 0)
      ON CONFLICT (part_id, location_id) 
      DO UPDATE SET on_hand = balances.on_hand + 10
    `, [p2, locId]);

    console.log('Balances updated successfully to 10 in location U-100!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
