import { pool, withTransaction } from '../db.js';
import { processIssue, processTransfer, processCount } from '../domain/inventory.js';
import { generateDeterministicId, queueOutboxEvent } from '../domain/events.js';
import { processReceiptAndShortages } from '../handlers/purchasing.js';

function normalizeSku(value) {
    return String(value || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' ');
}

function mapLocationRow(row) {
    return {
        kind: 'location',
        location_id: Number(row.location_id),
        code: row.code,
        name: row.name,
        display: `${row.code}${row.name ? ` · ${row.name}` : ''}`,
    };
}

function mapPartRow(row) {
    const sku = row.sku || (row.part_id ? `P-${row.part_id}` : '');
    return {
        kind: 'part',
        part_id: Number(row.part_id),
        sku: sku,
        name: row.name,
        display: `${sku}${row.name ? ` · ${row.name}` : ''}`,
    };
}

export function setupApiRoutes(app) {
    app.get('/locations', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT location_id, code, name
                FROM locations
                ORDER BY code ASC
            `);

            res.json({ items: result.rows.map(mapLocationRow) });
        } catch (err) {
            console.error(err);
            res.status(500).json({ detail: 'Internal Server Error' });
        }
    });

    app.get('/scan/:code', async (req, res) => {
        try {
            const rawCode = String(req.params.code || '').trim();
            const normalizedSku = normalizeSku(rawCode);
            const candidates = [];

            const locationByCode = await pool.query(`
                SELECT location_id, code, name
                FROM locations
                WHERE code = $1
            `, [rawCode]);
            candidates.push(...locationByCode.rows.map(mapLocationRow));

            const numericLocationId = Number(rawCode);
            if (Number.isInteger(numericLocationId) && String(numericLocationId) === rawCode) {
                const locationById = await pool.query(`
                    SELECT location_id, code, name
                    FROM locations
                    WHERE location_id = $1
                `, [numericLocationId]);
                candidates.push(...locationById.rows.map(mapLocationRow));
            }

            const partsBySku = await pool.query(`
                SELECT part_id, sku, name
                FROM parts
                WHERE sku = $1 OR sku_norm = $2
                ORDER BY part_id ASC
            `, [rawCode, normalizedSku]);
            candidates.push(...partsBySku.rows.map(mapPartRow));

            const pMatch = /^P-(\d+)$/i.exec(rawCode);
            if (pMatch) {
                const partById = await pool.query(`
                    SELECT part_id, sku, name
                    FROM parts
                    WHERE part_id = $1
                `, [Number(pMatch[1])]);
                candidates.push(...partById.rows.map(mapPartRow));
            }

            if (candidates.length === 0) {
                return res.status(404).json({ detail: 'No se encontró coincidencia para el código escaneado' });
            }

            const unique = [];
            const seen = new Set();
            for (const item of candidates) {
                const key = `${item.kind}:${item.location_id ?? item.part_id}`;
                if (seen.has(key)) continue;
                seen.add(key);
                unique.push(item);
            }

            const locations = unique.filter((item) => item.kind === 'location');
            const parts = unique.filter((item) => item.kind === 'part');

            if (locations.length === 1 && parts.length === 0) {
                return res.json({ location: locations[0] });
            }
            if (parts.length === 1 && locations.length === 0) {
                return res.json({ part: parts[0] });
            }

            return res.json({ kind: 'ambiguous', options: unique });
        } catch (err) {
            console.error(err);
            res.status(500).json({ detail: 'Internal Server Error' });
        }
    });

    app.get('/parts/:part_id/availability', async (req, res) => {
        try {
            const partId = req.params.part_id;
            const result = await pool.query(`
                SELECT location_id, on_hand, reserved, (on_hand - reserved) as available 
                FROM balances 
                WHERE part_id = $1
            `, [partId]);
            
            let totalOnHand = 0;
            let totalReserved = 0;
            
            const locations = result.rows.map(r => {
                totalOnHand += Number(r.on_hand);
                totalReserved += Number(r.reserved);
                return {
                    location_id: r.location_id,
                    on_hand: Number(r.on_hand),
                    reserved: Number(r.reserved),
                    available: Number(r.available)
                };
            });

            res.json({
                part_id: parseInt(partId),
                on_hand: totalOnHand,
                reserved: totalReserved,
                available: totalOnHand - totalReserved,
                locations: locations
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ detail: 'Internal Server Error' });
        }
    });

    app.get('/parts/:part_id/ledger', async (req, res) => {
        try {
            const partId = req.params.part_id;
            const result = await pool.query(`
                SELECT movement_id, location_id, quantity, type, reference_id, occurred_at 
                FROM movements 
                WHERE part_id = $1
                ORDER BY occurred_at DESC, movement_id DESC
            `, [partId]);

            res.json({
                part_id: parseInt(partId),
                movements: result.rows.map(r => ({
                    movement_id: r.movement_id.toString(),
                    location_id: r.location_id,
                    quantity: Number(r.quantity),
                    type: r.type,
                    reference_id: r.reference_id,
                    occurred_at: r.occurred_at
                }))
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ detail: 'Internal Server Error' });
        }
    });

    app.post('/issues', async (req, res) => {
        try {
            const result = await processIssue(req.body);
            res.status(201).json(result);
        } catch (err) {
            if (err.code === 'INSUFFICIENT_STOCK') {
                return res.status(409).json({ detail: err.message });
            }
            console.error(err);
            res.status(500).json({ detail: 'Internal Server Error' });
        }
    });

    app.post('/transfers', async (req, res) => {
        try {
            const result = await processTransfer(req.body);
            res.status(201).json(result);
        } catch (err) {
            if (err.code === 'INSUFFICIENT_STOCK') {
                return res.status(409).json({ detail: err.message });
            }
            console.error(err);
            res.status(500).json({ detail: 'Internal Server Error' });
        }
    });

    app.post('/counts', async (req, res) => {
        try {
            const result = await processCount(req.body);
            res.status(201).json(result);
        } catch (err) {
            if (err.code === 'VALIDATION_ERROR') {
                return res.status(422).json({ detail: err.message });
            }
            console.error(err);
            res.status(500).json({ detail: 'Internal Server Error' });
        }
    });

    app.get('/unmatched-receipts', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT id, purchase_line_id, sku, description, quantity, unit_price, currency, received_at, work_order_code 
                FROM unmatched_receipts 
                WHERE status = 'unresolved'
            `);
            
            res.json({
                items: result.rows.map(r => ({
                    id: parseInt(r.id),
                    purchase_line_id: r.purchase_line_id,
                    part_number: r.sku,
                    description: r.description,
                    quantity: Number(r.quantity),
                    unit_price: r.unit_price ? String(r.unit_price) : "0",
                    currency: r.currency || 'MXN',
                    received_at: r.received_at ? r.received_at.toISOString() : new Date().toISOString(),
                    work_order_code: r.work_order_code || null
                }))
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ detail: 'Internal Server Error' });
        }
    });

    app.post('/unmatched-receipts/:id/resolve', async (req, res) => {
        try {
            const unmatchedId = req.params.id;
            const { part_id, location_id } = req.body;
            
            const result = await withTransaction(async (client) => {
                const uRes = await client.query(`SELECT * FROM unmatched_receipts WHERE id = $1`, [unmatchedId]);
                if (uRes.rows.length === 0) return 'NOT_FOUND';
                
                const un = uRes.rows[0];
                if (un.status === 'resolved') return 'ALREADY_RESOLVED';
                
                await client.query(`UPDATE unmatched_receipts SET status = 'resolved' WHERE id = $1`, [unmatchedId]);

                await processReceiptAndShortages(client, un.receipt_event_id, {
                    partId: part_id,
                    locationId: location_id || 100,
                    line_id: un.purchase_line_id,
                    quantity: Number(un.quantity),
                    unit_price: un.unit_price,
                    currency: un.currency,
                    eventTime: new Date().toISOString(),
                    work_order_code: un.work_order_code
                });
                return 'OK';
            });
            
            if (result === 'NOT_FOUND') {
                return res.status(404).json({ detail: 'Not found' });
            }
            if (result === 'ALREADY_RESOLVED') {
                return res.status(409).json({ detail: 'Already resolved' });
            }
            
            res.status(200).json({ detail: 'Recepción relacionada exitosamente' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ detail: 'Internal Server Error' });
        }
    });

    app.get('/work-orders/:code/materials', async (req, res) => {
        try {
            const code = String(req.params.code || '').trim();
            const woRes = await pool.query(`
                SELECT work_order_id, code
                FROM work_orders
                WHERE code = $1
            `, [code]);

            if (woRes.rows.length === 0) {
                return res.status(404).json({ detail: 'Not found' });
            }

            const workOrder = woRes.rows[0];
            const linesRes = await pool.query(`
                SELECT
                    bl.bom_line_id,
                    bl.part_id,
                    bl.qty_per_unit,
                    bl.group_name,
                    p.name AS part_name,
                    COALESCE(r.reserved_quantity, 0) AS reserved_quantity,
                    COALESCE(iss.issued_quantity, 0) AS issued_quantity
                FROM bom_lines bl
                LEFT JOIN parts p ON p.part_id = bl.part_id
                LEFT JOIN (
                    SELECT bom_line_id, SUM(reserved_quantity) AS reserved_quantity
                    FROM reservations
                    WHERE work_order_id = $1 AND status = 'active'
                    GROUP BY bom_line_id
                ) r ON r.bom_line_id = bl.bom_line_id
                LEFT JOIN (
                    SELECT m.part_id, SUM(ABS(m.quantity)) AS issued_quantity
                    FROM movements m
                    WHERE m.type = 'issue' AND m.reference_id = $2
                    GROUP BY m.part_id
                ) iss ON iss.part_id = bl.part_id
                WHERE bl.model_id = $1
                ORDER BY bl.bom_line_id ASC
            `, [workOrder.work_order_id, code]);

            const lines = linesRes.rows.map((row) => {
                const required = row.qty_per_unit === null || row.qty_per_unit === undefined ? null : Number(row.qty_per_unit);
                const reserved = Number(row.reserved_quantity || 0);
                const issued = Number(row.issued_quantity || 0);
                const missing = required === null ? null : Math.max(required - reserved - issued, 0);

                return {
                    inspection_item_id: row.bom_line_id,
                    bom_line_id: row.bom_line_id,
                    part_id: row.part_id === null ? null : Number(row.part_id),
                    name: row.part_name || row.group_name || `BOM ${row.bom_line_id}`,
                    required,
                    reserved,
                    issued,
                    missing,
                };
            });

            res.json({
                work_order_id: Number(workOrder.work_order_id),
                code: workOrder.code,
                lines,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ detail: 'Internal Server Error' });
        }
    });
    app.get('/shortages', (req, res) => res.status(501).json({ detail: 'Not implemented' }));
    app.get('/reorder-suggestions', (req, res) => res.status(501).json({ detail: 'Not implemented' }));
}
