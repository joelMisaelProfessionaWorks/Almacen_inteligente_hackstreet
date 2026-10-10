import { withTransaction, pool } from '../db.js';
import { recordMovement } from './ledger.js';
import { queueOutboxEvent, generateDeterministicId } from './events.js';

const TOPIC_OUT = 'inventory.events';

export async function processIssue(payload) {
    const { work_order_code, part_id, location_id, quantity, issued_by, occurred_at } = payload;
    const eventTime = occurred_at || new Date().toISOString();

    return await withTransaction(async (client) => {
        // Validar y descontar saldo
        await recordMovement(client, {
            partId: part_id,
            locationId: location_id,
            quantity: -Math.abs(quantity), // salida es negativo
            type: 'issue',
            referenceId: work_order_code,
            occurredAt: eventTime
        });

        // Generar stock.issued
        const outEventId = generateDeterministicId(`issue-${work_order_code}-${part_id}-${eventTime}`);
        
        const woRes = await client.query(`SELECT work_order_id FROM work_orders WHERE code = $1`, [work_order_code]);
        const work_order_id = woRes.rows.length > 0 ? woRes.rows[0].work_order_id : null;

        // Reduce reservation
        if (work_order_id) {
            const issuedQty = Math.abs(quantity);
            // We assume there's one active reservation for this part in this work order.
            // Find bom_line_id
            const resRows = await client.query(`
                SELECT reservation_id, bom_line_id, reserved_quantity
                FROM reservations
                WHERE work_order_id = $1 AND status = 'active'
            `, [work_order_id]);
            
            // Just reduce from the first one that matches part_id
            for (const r of resRows.rows) {
                // Check if bom_line part_id matches
                const bomRes = await client.query(`SELECT part_id FROM bom_lines WHERE bom_line_id = $1`, [r.bom_line_id]);
                if (bomRes.rows.length > 0 && bomRes.rows[0].part_id == part_id) {
                    const toReduce = Math.min(Number(r.reserved_quantity), issuedQty);
                    if (toReduce > 0) {
                        await client.query(`
                            UPDATE reservations SET reserved_quantity = reserved_quantity - $1
                            WHERE reservation_id = $2
                        `, [toReduce, r.reservation_id]);
                        
                        await client.query(`
                            UPDATE balances SET reserved = reserved - $1
                            WHERE part_id = $2 AND location_id = $3
                        `, [toReduce, part_id, location_id]);
                        break;
                    }
                }
            }
        }

        const outPayload = {
            event_id: outEventId,
            type: 'stock.issued',
            work_order_id: work_order_id ? parseInt(work_order_id, 10) : 1,
            work_order_code: work_order_code,
            part_id: parseInt(part_id, 10),
            location_id: parseInt(location_id, 10),
            quantity: Math.abs(quantity),
            issued_by: issued_by || 'system'
        };

        // Llave (key): código de la orden
        await queueOutboxEvent(client, TOPIC_OUT, work_order_code, outPayload);
        return { message: 'Issued successfully' };
    });
}

export async function processTransfer(payload) {
    const { part_id, from_location_id, to_location_id, quantity, occurred_at } = payload;
    const eventTime = occurred_at || new Date().toISOString();

    return await withTransaction(async (client) => {
        // Descontar origen
        await recordMovement(client, {
            partId: part_id,
            locationId: from_location_id,
            quantity: -Math.abs(quantity),
            type: 'transfer_out',
            referenceId: null,
            occurredAt: eventTime
        });

        // Incrementar destino
        await recordMovement(client, {
            partId: part_id,
            locationId: to_location_id,
            quantity: Math.abs(quantity),
            type: 'transfer_in',
            referenceId: null,
            occurredAt: eventTime
        });

        const outEventId = generateDeterministicId(`transfer-${part_id}-${from_location_id}-${to_location_id}-${eventTime}`);
        const outPayload = {
            event_id: outEventId,
            type: 'stock.transferred',
            part_id: parseInt(part_id, 10),
            from_location_id: parseInt(from_location_id, 10),
            to_location_id: parseInt(to_location_id, 10),
            quantity: Math.abs(quantity)
        };

        await queueOutboxEvent(client, TOPIC_OUT, `part:${part_id}`, outPayload);
        return { message: 'Transferred successfully' };
    });
}

export async function processCount(payload) {
    const { location_id, reason, lines, occurred_at } = payload;
    if (!reason) {
        const err = new Error('Reason is required');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }
    const eventTime = occurred_at || new Date().toISOString();

    return await withTransaction(async (client) => {
        const adjustments = [];

        for (const line of lines) {
            const { part_id, counted_quantity } = line;

            const res = await client.query(`
                SELECT on_hand FROM balances 
                WHERE part_id = $1 AND location_id = $2
            `, [part_id, location_id]);
            
            const currentOnHand = res.rows.length > 0 ? Number(res.rows[0].on_hand) : 0;
            const diff = counted_quantity - currentOnHand;

            if (diff !== 0) {
                await recordMovement(client, {
                    partId: part_id,
                    locationId: location_id,
                    quantity: diff,
                    type: 'count',
                    referenceId: reason,
                    occurredAt: eventTime
                });

                const outEventId = generateDeterministicId(`count-${part_id}-${location_id}-${eventTime}`);
                const outPayload = {
                    event_id: outEventId,
                    type: 'stock.adjusted',
                    part_id: parseInt(part_id, 10),
                    location_id: parseInt(location_id, 10),
                    delta: diff,
                    reason
                };

                await queueOutboxEvent(client, TOPIC_OUT, `part:${part_id}`, outPayload);
                adjustments.push(outPayload);
            }
        }

        return { message: 'Count processed', adjustments };
    });
}
