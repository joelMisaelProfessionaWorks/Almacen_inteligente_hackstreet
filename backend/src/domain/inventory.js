import { withTransaction, pool } from '../db.js';
import { recordMovement } from './ledger.js';
import { queueOutboxEvent, generateDeterministicId } from './events.js';

const TOPIC_OUT = 'inventory.events';

export async function processIssue(payload) {
    const { work_order_code, lines, occurred_at } = payload;
    const eventTime = occurred_at || new Date().toISOString();

    return await withTransaction(async (client) => {
        // Resolver part_id y location_id (el schema de salida asume parts o locations ya creadas)
        // Por simplicidad, el contrato pide un arreglo de objetos y produce un evento stock.issued
        
        let issuedLines = [];

        for (const line of lines) {
            // Asumimos que line tiene part_id, location_id, quantity
            // Validar y descontar saldo
            await recordMovement(client, {
                partId: line.part_id,
                locationId: line.location_id,
                quantity: -Math.abs(line.quantity), // salida es negativo
                type: 'issue',
                referenceId: work_order_code,
                occurredAt: eventTime
            });

            // En este punto, como pasamos la validación, descontamos también la reserva de esa work_order
            // TODO: Integrar con domain/reservations.js para descontar la reserva al surtir

            issuedLines.push({
                part_id: line.part_id,
                location_id: line.location_id,
                quantity: Math.abs(line.quantity)
            });
        }

        // Generar stock.issued
        const outEventId = generateDeterministicId(`issue-${work_order_code}-${eventTime}`);
        const outPayload = {
            event_id: outEventId,
            type: 'stock.issued',
            work_order_code,
            lines: issuedLines,
            occurred_at: eventTime
        };

        await queueOutboxEvent(client, TOPIC_OUT, work_order_code, outPayload);
        return outPayload;
    });
}

export async function processTransfer(payload) {
    const { part_id, source_location_id, target_location_id, quantity, occurred_at } = payload;
    const eventTime = occurred_at || new Date().toISOString();

    return await withTransaction(async (client) => {
        // Descontar origen
        await recordMovement(client, {
            partId: part_id,
            locationId: source_location_id,
            quantity: -Math.abs(quantity),
            type: 'transfer_out',
            referenceId: null,
            occurredAt: eventTime
        });

        // Incrementar destino
        await recordMovement(client, {
            partId: part_id,
            locationId: target_location_id,
            quantity: Math.abs(quantity),
            type: 'transfer_in',
            referenceId: null,
            occurredAt: eventTime
        });

        const outEventId = generateDeterministicId(`transfer-${part_id}-${source_location_id}-${target_location_id}-${eventTime}`);
        const outPayload = {
            event_id: outEventId,
            type: 'stock.transferred',
            part_id,
            source_location_id,
            target_location_id,
            quantity: Math.abs(quantity),
            occurred_at: eventTime
        };

        await queueOutboxEvent(client, TOPIC_OUT, `part:${part_id}`, outPayload);
        return outPayload;
    });
}

export async function processCount(payload) {
    const { part_id, location_id, quantity, reason, occurred_at } = payload;
    if (!reason) {
        const err = new Error('Reason is required');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }
    const eventTime = occurred_at || new Date().toISOString();

    return await withTransaction(async (client) => {
        // En un conteo, quantity es el NUEVO on_hand total de esa ubicación
        // Obtenemos el saldo actual
        const res = await client.query(`
            SELECT on_hand FROM balances 
            WHERE part_id = $1 AND location_id = $2
        `, [part_id, location_id]);
        
        const currentOnHand = res.rows.length > 0 ? Number(res.rows[0].on_hand) : 0;
        const diff = quantity - currentOnHand;

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
                part_id,
                location_id,
                previous_quantity: currentOnHand,
                new_quantity: quantity,
                reason,
                occurred_at: eventTime
            };

            await queueOutboxEvent(client, TOPIC_OUT, `part:${part_id}`, outPayload);
            return outPayload;
        }
        return { message: 'No adjustment needed' };
    });
}
