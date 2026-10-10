import { withTransaction } from '../db.js';
import { markEventProcessed, queueOutboxEvent, generateDeterministicId } from '../domain/events.js';
import { recordMovement } from '../domain/ledger.js';

export async function handlePurchasingEvent(eventId, type, payload) {
    if (!eventId) return;

    await withTransaction(async (client) => {
        const isNew = await markEventProcessed(client, eventId, payload.occurred_at || new Date().toISOString());
        if (!isNew) {
            console.log(`[Idempotency] Event ${eventId} already processed.`);
            return;
        }

        if (type === 'purchase.item_received') {
            await handlePurchaseItemReceived(client, eventId, payload);
        } else {
            console.log(`Unknown purchasing event type: ${type}`);
        }
    });
}

async function handlePurchaseItemReceived(client, eventId, payload) {
    const { purpose, work_order_code, part_number, quantity, unit_price, occurred_at } = payload;
    const eventTime = occurred_at || new Date().toISOString();

    if (purpose === 'customer_order') return;

    const sku_norm = part_number ? part_number.trim().toUpperCase().replace(/\s+/g, ' ') : '';
    const partsRes = await client.query(`SELECT part_id FROM parts WHERE sku_norm = $1`, [sku_norm]);

    if (partsRes.rows.length !== 1) {
        await client.query(`
            INSERT INTO unmatched_receipts (receipt_event_id, sku, quantity)
            VALUES ($1, $2, $3)
        `, [eventId, part_number, quantity]);

        const outEventId = generateDeterministicId(`unmatched-${eventId}`);
        await queueOutboxEvent(client, 'inventory.events', `receipt:${eventId}`, {
            event_id: outEventId,
            type: 'stock.unmatched_receipt',
            receipt_event_id: eventId,
            sku: part_number,
            quantity: quantity,
            occurred_at: eventTime
        });
        return;
    }

    const partId = partsRes.rows[0].part_id;
    const locationId = 100;

    await recordMovement(client, {
        partId,
        locationId,
        quantity: quantity,
        type: 'receipt',
        referenceId: eventId,
        occurredAt: eventTime
    });

    const outEventId = generateDeterministicId(`received-${eventId}`);
    await queueOutboxEvent(client, 'inventory.events', `part:${partId}`, {
        event_id: outEventId,
        type: 'stock.received',
        part_id: partId,
        location_id: locationId,
        quantity,
        unit_price,
        occurred_at: eventTime
    });

    // Regla 12: Surtir faltantes
    // Primero los de work_order_code (si la orden vive y tiene faltante para este partId)
    // Luego los demas por antigüedad
    let remainingReceiptQty = quantity;

    let targetWoId = null;
    if (work_order_code) {
        const woRes = await client.query(`SELECT work_order_id, deleted_at FROM work_orders WHERE code = $1`, [work_order_code]);
        if (woRes.rows.length > 0 && !woRes.rows[0].deleted_at) {
            targetWoId = woRes.rows[0].work_order_id;
        }
    }

    // Buscamos shortages abiertos para esta parte
    // Ordenamos: si coincide con targetWoId primero, sino por id (antigüedad)
    const shortagesRes = await client.query(`
        SELECT id, work_order_id, missing_quantity 
        FROM shortages 
        WHERE part_id = $1 AND status = 'open'
        ORDER BY (work_order_id = $2) DESC, created_at ASC
        FOR UPDATE
    `, [partId, targetWoId]);

    let resolvedCount = 0;

    for (const shortage of shortagesRes.rows) {
        if (remainingReceiptQty <= 0) break;
        
        const toResolve = Math.min(Number(shortage.missing_quantity), remainingReceiptQty);
        
        // Convertimos shortage a reserva
        await client.query(`
            UPDATE balances SET reserved = reserved + $1 WHERE part_id = $2 AND location_id = $3
        `, [toResolve, partId, locationId]);

        // Intentar actualizar la reservation de esta orden. 
        // Nota: Un shortage puede venir de una o más líneas de bom para esa orden, pero en Hackathon simplificado sumamos
        await client.query(`
            UPDATE reservations 
            SET reserved_quantity = reserved_quantity + $1
            WHERE work_order_id = $2 AND status = 'active'
        `, [toResolve, shortage.work_order_id]);

        // Actualizar shortage
        const remainingShortage = Number(shortage.missing_quantity) - toResolve;
        if (remainingShortage === 0) {
            await client.query(`UPDATE shortages SET missing_quantity = 0, status = 'resolved' WHERE id = $1`, [shortage.id]);
        } else {
            await client.query(`UPDATE shortages SET missing_quantity = $1 WHERE id = $2`, [remainingShortage, shortage.id]);
        }

        // Obtener código de orden para evento
        const woCodeRes = await client.query(`SELECT code FROM work_orders WHERE work_order_id = $1`, [shortage.work_order_id]);
        const woCode = woCodeRes.rows.length > 0 ? woCodeRes.rows[0].code : null;

        const resEventId = generateDeterministicId(`resolved-reserve-${eventId}-${shortage.id}-${resolvedCount}`);
        await queueOutboxEvent(client, 'inventory.events', `part:${partId}`, {
            event_id: resEventId,
            type: 'stock.reserved',
            part_id: partId,
            work_order_code: woCode,
            quantity: toResolve,
            occurred_at: eventTime
        });

        if (remainingShortage === 0 && woCode) {
            const shortResEventId = generateDeterministicId(`resolved-shortage-${eventId}-${shortage.id}-${resolvedCount}`);
            await queueOutboxEvent(client, 'inventory.events', `work_order:${woCode}`, {
                event_id: shortResEventId,
                type: 'stock.shortage_resolved',
                work_order_code: woCode,
                part_id: partId,
                occurred_at: eventTime
            });
        }

        remainingReceiptQty -= toResolve;
        resolvedCount++;
    }
}
