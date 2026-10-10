import { withTransaction } from '../db.js';
import { markEventProcessed } from '../domain/events.js';
import { queuePendingEvent } from './catalog.js';

export async function handleInspectionEvent(eventId, type, payload) {
    if (!eventId) return;

    try {
        await withTransaction(async (client) => {
            const isNew = await markEventProcessed(client, eventId, payload.occurred_at || new Date().toISOString());
            if (!isNew) return;

            const { processInspectionApproved, releaseInspectionReservations } = await import('../domain/reservations.js');

            const inspection_id = payload.inspection_id;
            const work_order_id = payload.work_order_id;

            if (inspection_id && work_order_id) {
                await client.query(`
                    INSERT INTO inspections (inspection_id, work_order_id)
                    VALUES ($1, $2)
                    ON CONFLICT (inspection_id) DO NOTHING
                `, [inspection_id, work_order_id]);
            }

            if (type === 'inspection.approved') {
                await processInspectionApproved(client, eventId, payload);
            } else if (type === 'inspection.voided') {
                await client.query(`
                    UPDATE inspections SET voided_at = NOW() WHERE inspection_id = $1
                `, [inspection_id]);

                await releaseInspectionReservations(client, inspection_id, eventId, payload.occurred_at);
            }
        });
    } catch (err) {
        if (err.code === '23503') { // Foreign Key violation
            console.log(`[Out of order] Inspection event ${eventId} missing dependency, queuing to pending_events.`);
            await queuePendingEvent(eventId, 'shop.inspections', type, payload, err.message);
        return false; } else {
            throw err;
        }
    }
}
