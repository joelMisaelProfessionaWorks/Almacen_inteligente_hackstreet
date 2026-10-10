import { pool, withTransaction } from '../db.js';
import { processIssue, processTransfer, processCount } from '../domain/inventory.js';
import { generateDeterministicId, queueOutboxEvent } from '../domain/events.js';
import { processReceiptAndShortages } from '../handlers/purchasing.js';

export function setupApiRoutes(app) {
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
            
            await withTransaction(async (client) => {
                const uRes = await client.query(`SELECT * FROM unmatched_receipts WHERE id = $1 AND status = 'unresolved'`, [unmatchedId]);
                if (uRes.rows.length === 0) {
                    res.status(404).json({ detail: 'Not found or already resolved' });
                    return;
                }
                const un = uRes.rows[0];
                
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
            });
            
            res.status(200).json({ detail: 'Recepcin relacionada exitosamente' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ detail: 'Internal Server Error' });
        }
    });

    app.get('/work-orders/:code/materials', (req, res) => res.status(501).json({ detail: 'Not implemented' }));
    app.get('/shortages', (req, res) => res.status(501).json({ detail: 'Not implemented' }));
    app.get('/reorder-suggestions', (req, res) => res.status(501).json({ detail: 'Not implemented' }));
}
