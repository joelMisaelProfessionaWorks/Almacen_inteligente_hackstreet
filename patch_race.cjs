const fs = require('fs');

let f = fs.readFileSync('backend/src/handlers/purchasing.js', 'utf8');

f = f.replace(
    `    // Hackathon race condition workaround: wait 50ms for part.upserted to be processed
    await new Promise(resolve => setTimeout(resolve, 50));

    const partsRes = await client.query(\`SELECT part_id FROM parts WHERE sku_norm = $1\`, [sku_norm]);`,
    `    let partsRes = await client.query(\`SELECT part_id FROM parts WHERE sku_norm = $1\`, [sku_norm]);
    if (partsRes.rows.length === 0) {
        // Wait and retry for race condition with catalog topic
        await new Promise(resolve => setTimeout(resolve, 500));
        partsRes = await client.query(\`SELECT part_id FROM parts WHERE sku_norm = $1\`, [sku_norm]);
    }`
);

fs.writeFileSync('backend/src/handlers/purchasing.js', f, 'utf8');
console.log('Patched race condition logic');
