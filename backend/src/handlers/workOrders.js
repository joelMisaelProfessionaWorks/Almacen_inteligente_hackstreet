import { pool, withTransaction } from '../db.js';
import { markEventProcessed } from '../domain/events.js';

export async function handleWorkOrderEvent(eventId, type, payload) {
    if (!eventId) return;

    await withTransaction(async (client) => {
        const isNew = await markEventProcessed(client, eventId, payload.occurred_at || new Date().toISOString());
        if (!isNew) return;

        if (type === 'work_order.opened') {
            await client.query(`
                INSERT INTO work_orders (work_order_id, code, status)
                VALUES ($1, $2, $3)
                ON CONFLICT (work_order_id) DO UPDATE SET
                    code = EXCLUDED.code,
                    status = EXCLUDED.status
            `, [payload.work_order_id, payload.code, payload.status || 'opened']);
        } else if (type === 'work_order.stage_changed') {
            await client.query(`
                UPDATE work_orders SET status = $1 WHERE work_order_id = $2
            `, [payload.to_stage, payload.work_order_id]);
        } else if (type === 'work_order.deleted') {
            await client.query(`
                UPDATE work_orders SET deleted_at = NOW(), status = 'deleted' WHERE work_order_id = $1
            `, [payload.work_order_id]);

            const { releaseWorkOrderReservations } = await import('../domain/reservations.js');
            await releaseWorkOrderReservations(client, payload.work_order_id, eventId, payload.occurred_at);
        }
    });
}
