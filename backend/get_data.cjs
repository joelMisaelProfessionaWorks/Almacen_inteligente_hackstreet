const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://tsdbadmin:sui2pgbnts3zm2np@oravdeoeki.wcapf5t52v.tsdb.cloud.timescale.com:33609/tsdb?sslmode=require' });

async function run() {
  await client.connect();
  const res1 = await client.query('SELECT part_id, sku, name FROM parts LIMIT 5');
  console.log('Parts:', res1.rows);
  const res2 = await client.query('SELECT location_id, code FROM locations LIMIT 5');
  console.log('Locations:', res2.rows);
  const res3 = await client.query('SELECT b.part_id, b.location_id, l.code as loc, p.sku, b.on_hand FROM balances b JOIN locations l ON b.location_id=l.location_id JOIN parts p ON b.part_id=p.part_id LIMIT 5');
  console.log('Balances:', res3.rows);
  const res4 = await client.query('SELECT id, code, status FROM work_orders LIMIT 5');
  console.log('Orders:', res4.rows);
  const res5 = await client.query("SELECT id, part_number, quantity, description FROM unmatched_receipts WHERE status = 'pending' LIMIT 2");
  console.log('Unmatched:', res5.rows);
  await client.end();
}
run().catch(console.error);
