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
            `, [payload.id, payload.code, payload.status]);
        } else if (type === 'work_order.stage_changed') {
            await client.query(`
                UPDATE work_orders SET status = $1 WHERE work_order_id = $2
            `, [payload.stage, payload.id]);
        } else if (type === 'work_order.deleted') {
            // Regla 14: Liberar reservas y cerrar faltantes, marcar deleted_at
            await client.query(`
                UPDATE work_orders SET deleted_at = NOW(), status = 'deleted' WHERE work_order_id = $1
            `, [payload.id]);

            // TODO: Integrar liberación de reservas con domain/reservations.js
            const { releaseWorkOrderReservations } = await import('../domain/reservations.js');
            await releaseWorkOrderReservations(client, payload.id, eventId, payload.occurred_at);
        }
    });
}
