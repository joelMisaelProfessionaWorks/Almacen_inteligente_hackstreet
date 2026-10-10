const fs = require('fs');
let c = fs.readFileSync('backend/src/api/routes.js', 'utf8');

c = c.replace(
  /if \(!search\) return res\.json\(\{ items: \[\] \}\);\s*const result = await pool\.query\([\s\S]*?\);\s*res\.json/m,
  `let result;
            if (!search) {
                result = await pool.query('SELECT part_id, sku, name, description FROM parts ORDER BY name');
            } else {
                result = await pool.query(
                    \`SELECT part_id, sku, name, description FROM parts
                     WHERE sku ILIKE $1 OR sku_norm ILIKE $1 OR name ILIKE $1 OR CAST(part_id AS TEXT) = $2
                     ORDER BY name LIMIT 25\`,
                    ['%' + search + '%', search]
                );
            }
            res.json`
);

fs.writeFileSync('backend/src/api/routes.js', c, 'utf8');
console.log("Patched API successfully.");
