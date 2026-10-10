const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://tsdbadmin:sui2pgbnts3zm2np@oravdeoeki.wcapf5t52v.tsdb.cloud.timescale.com:33609/tsdb?sslmode=require' });

async function run() {
  await client.connect();
  const res4 = await client.query('SELECT work_order_id, code, status FROM work_orders LIMIT 5');
  console.log('Orders:', res4.rows);
  const res5 = await client.query("SELECT * FROM unmatched_receipts LIMIT 2");
  console.log('Unmatched:', res5.rows);
  await client.end();
}
run().catch(console.error);
