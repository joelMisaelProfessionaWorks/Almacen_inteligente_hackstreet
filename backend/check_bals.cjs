const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://tsdbadmin:sui2pgbnts3zm2np@oravdeoeki.wcapf5t52v.tsdb.cloud.timescale.com:33609/tsdb?sslmode=require' });

async function run() {
  await client.connect();
  const res = await client.query("SELECT p.sku, b.on_hand, b.reserved FROM balances b JOIN parts p ON b.part_id=p.part_id");
  console.log(res.rows);
  await client.end();
}
run().catch(console.error);
