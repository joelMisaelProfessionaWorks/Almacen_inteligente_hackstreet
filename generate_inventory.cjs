const { pool } = require('./backend/src/db.js');
const fs = require('fs');
const path = require('path');

async function run() {
  const res = await pool.query(`
    SELECT l.code, l.name as loc_name, p.sku, p.name as part_name, b.on_hand 
    FROM balances b 
    JOIN locations l ON b.location_id = l.location_id 
    JOIN parts p ON b.part_id = p.part_id 
    WHERE b.on_hand > 0 
    ORDER BY l.code, p.sku
  `);
  
  let md = '# Inventario Disponible por Ubicación\n\n';
  let curLoc = '';
  res.rows.forEach(row => {
    if (row.code !== curLoc) {
      md += `\n### Ubicación ${row.code} (${row.loc_name})\n\n| SKU | Pieza | Cantidad |\n|---|---|---|\n`;
      curLoc = row.code;
    }
    md += `| ${row.sku} | ${row.part_name} | ${row.on_hand} |\n`;
  });
  
  const artifactPath = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config'), '..', '.gemini', 'antigravity', 'brain', '9deacb3f-f28f-44b9-8588-13f74ee65d60', 'inventario_disponible.md');
  
  // Write to both places
  fs.writeFileSync('inventario_disponible.md', md);
  fs.writeFileSync(artifactPath, md);
  console.log('Artifact written to', artifactPath);
  process.exit(0);
}

run().catch(console.error);
