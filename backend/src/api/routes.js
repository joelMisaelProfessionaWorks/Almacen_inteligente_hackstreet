import { pool } from '../db.js';
import { processIssue, processTransfer, processCount } from '../domain/inventory.js';

export function setupApiRoutes(app) {
    // GET /parts/{part_id}/availability
    app.get('/parts/:part_id/availability', async (req, res) => {
        try {
            const partId = req.params.part_id;
            const result = await pool.query(`
                SELECT location_id, on_hand, reserved, (on_hand - reserved) as available 
                FROM balances 
                WHERE part_id = $1
            `, [partId]);
            
            // Format to match API contract
            res.json({
                part_id: parseInt(partId),
                locations: result.rows.map(r => ({
                    location_id: r.location_id,
                    on_hand: Number(r.on_hand),
                    reserved: Number(r.reserved),
                    available: Number(r.available)
                }))
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ detail: 'Internal Server Error' });
        }
    });

    // GET /parts/{part_id}/ledger
    app.get('/parts/:part_id/ledger', async (req, res) => {
        try {
            const partId = req.params.part_id;
            // Most recent first according to plan
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

    // POST /issues
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

    // POST /transfers
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

    // POST /counts
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

    // Stubs for the rest
    app.get('/work-orders/:code/materials', (req, res) => res.status(501).json({ detail: 'Not implemented' }));
    app.get('/shortages', (req, res) => res.status(501).json({ detail: 'Not implemented' }));
    app.get('/reorder-suggestions', (req, res) => res.status(501).json({ detail: 'Not implemented' }));
    app.get('/unmatched-receipts', (req, res) => res.status(501).json({ detail: 'Not implemented' }));
    app.post('/unmatched-receipts/:id/resolve', (req, res) => res.status(501).json({ detail: 'Not implemented' }));
}
