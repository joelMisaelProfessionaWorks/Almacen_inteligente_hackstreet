const fs = require('fs');
let r = fs.readFileSync('backend/src/api/routes.js', 'utf8');

const newRoute = `
    app.get('/work-orders', async (req, res) => {
        try {
            // Fetch all work orders and determine if they have shortages
            const woRes = await pool.query(\`
                SELECT w.work_order_id, w.code, w.status,
                (SELECT COUNT(*) FROM shortages s WHERE s.work_order_id = w.work_order_id AND s.status = 'open') as shortage_count
                FROM work_orders w
                ORDER BY shortage_count DESC, w.code ASC
                LIMIT 100
            \`);
            
            // Get all missing parts for pending orders (to show suppliers/AI info)
            const shortagesRes = await pool.query(\`
                SELECT s.work_order_id, s.part_id, p.name, p.sku, s.missing_quantity
                FROM shortages s
                JOIN parts p ON s.part_id = p.part_id
                WHERE s.status = 'open'
            \`);
            
            const orders = woRes.rows.map(w => {
                return {
                    id: w.work_order_id,
                    code: w.code,
                    status: w.status,
                    pending: w.shortage_count > 0,
                    missing_parts: shortagesRes.rows.filter(s => s.work_order_id === w.work_order_id).map(s => ({
                        part_id: s.part_id,
                        name: s.name,
                        sku: s.sku,
                        missing: Number(s.missing_quantity)
                    }))
                };
            });
            
            res.json({ items: orders });
        } catch (err) {
            console.error(err);
            res.status(500).json({ detail: err.message });
        }
    });
`;

r = r.replace('export function setupApiRoutes(app) {', 'export function setupApiRoutes(app) {\n' + newRoute);
fs.writeFileSync('backend/src/api/routes.js', r, 'utf8');
console.log('Added /work-orders route.');
