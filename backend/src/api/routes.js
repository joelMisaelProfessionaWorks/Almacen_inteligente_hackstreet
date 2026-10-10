export function setupApiRoutes(app) {
    // GET /parts/{part_id}/availability
    app.get('/parts/:part_id/availability', async (req, res) => {
        res.status(501).json({ detail: 'Not implemented' });
    });

    // GET /parts/{part_id}/ledger
    app.get('/parts/:part_id/ledger', async (req, res) => {
        res.status(501).json({ detail: 'Not implemented' });
    });

    // GET /work-orders/{code}/materials
    app.get('/work-orders/:code/materials', async (req, res) => {
        res.status(501).json({ detail: 'Not implemented' });
    });

    // GET /shortages
    app.get('/shortages', async (req, res) => {
        res.status(501).json({ detail: 'Not implemented' });
    });

    // GET /reorder-suggestions
    app.get('/reorder-suggestions', async (req, res) => {
        res.status(501).json({ detail: 'Not implemented' });
    });

    // GET /unmatched-receipts
    app.get('/unmatched-receipts', async (req, res) => {
        res.status(501).json({ detail: 'Not implemented' });
    });

    // POST /unmatched-receipts/{id}/resolve
    app.post('/unmatched-receipts/:id/resolve', async (req, res) => {
        res.status(501).json({ detail: 'Not implemented' });
    });

    // POST /issues
    app.post('/issues', async (req, res) => {
        res.status(501).json({ detail: 'Not implemented' });
    });

    // POST /transfers
    app.post('/transfers', async (req, res) => {
        res.status(501).json({ detail: 'Not implemented' });
    });

    // POST /counts
    app.post('/counts', async (req, res) => {
        res.status(501).json({ detail: 'Not implemented' });
    });
}
