import { withTransaction } from '../db.js';
import { markEventProcessed } from '../domain/events.js';

export async function handleInspectionEvent(eventId, type, payload) {
    if (!eventId) return;

    await withTransaction(async (client) => {
        const isNew = await markEventProcessed(client, eventId, payload.occurred_at || new Date().toISOString());
        if (!isNew) return;

        const { processInspectionApproved, releaseInspectionReservations } = await import('../domain/reservations.js');

        // Upsert inspection to track it for voiding later
        if (payload.id && payload.work_order_id) {
             await client.query(`
                INSERT INTO inspections (inspection_id, work_order_id)
                VALUES ($1, $2)
                ON CONFLICT (inspection_id) DO NOTHING
            `, [payload.id, payload.work_order_id]);
        }

        if (type === 'inspection.approved') {
            await processInspectionApproved(client, eventId, payload);
        } else if (type === 'inspection.voided') {
            // Regla 13: inspection.voided -> liberar reservas de esta inspeccion
            await client.query(`
                UPDATE inspections SET voided_at = NOW() WHERE inspection_id = $1
            `, [payload.id]);

            await releaseInspectionReservations(client, payload.id, eventId, payload.occurred_at);
        } else {
            // Regla 1, 4: rejected, discarded, etc. no hacen nada.
        }
    });
}
