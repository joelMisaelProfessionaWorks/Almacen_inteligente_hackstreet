const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://tsdbadmin:sui2pgbnts3zm2np@oravdeoeki.wcapf5t52v.tsdb.cloud.timescale.com:33609/tsdb?sslmode=require' });

async function run() {
  await client.connect();
  const res = await client.query("SELECT p.sku, l.code, b.on_hand, b.reserved FROM balances b JOIN parts p ON b.part_id=p.part_id JOIN locations l ON b.location_id=l.location_id WHERE (b.on_hand - b.reserved) > 0 LIMIT 5");
  console.log('Available pieces:', res.rows);
  
  const res2 = await client.query("SELECT b.on_hand, b.reserved, p.sku, l.code FROM balances b JOIN parts p ON b.part_id=p.part_id JOIN locations l ON b.location_id=l.location_id WHERE p.sku='FLECHA-004'");
  console.log('FLECHA-004:', res2.rows);

  const res3 = await client.query("SELECT b.on_hand, b.reserved, p.sku, l.code FROM balances b JOIN parts p ON b.part_id=p.part_id JOIN locations l ON b.location_id=l.location_id WHERE p.sku='INSERTO-001'");
  console.log('INSERTO-001:', res3.rows);

  await client.end();
}
run().catch(console.error);
