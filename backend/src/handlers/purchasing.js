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
    const { purpose, work_order_code, part_number, description, quantity, unit_price, currency, line_id, occurred_at } = payload;
    const eventTime = occurred_at || new Date().toISOString();

    if (purpose === 'customer_order') return;

    const sku_norm = part_number ? part_number.trim().toUpperCase().replace(/\s+/g, ' ') : '';
    
    // Hackathon race condition workaround: wait 50ms for part.upserted to be processed
    await new Promise(resolve => setTimeout(resolve, 50));

    const partsRes = await client.query(`SELECT part_id FROM parts WHERE sku_norm = $1`, [sku_norm]);

    if (partsRes.rows.length !== 1) {
        await client.query(`
            INSERT INTO unmatched_receipts (
                receipt_event_id, sku, quantity, purchase_line_id, description, 
                unit_price, currency, received_at, work_order_code
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [eventId, part_number, quantity, line_id, description, String(unit_price), currency, eventTime, work_order_code]);

        const outEventId = generateDeterministicId(`unmatched-${eventId}`);
        await queueOutboxEvent(client, 'inventory.events', `purchase_line:${line_id}`, {
            event_id: outEventId,
            type: 'stock.unmatched_receipt',
            receipt_event_id: eventId,
            part_number: part_number || 'UNKNOWN',
            description: description || 'UNKNOWN',
            purchase_line_id: parseInt(line_id, 10),
            quantity: quantity,
            occurred_at: eventTime
        });
        return;
    }

    const partId = partsRes.rows[0].part_id;
    const locationId = 100;

    await processReceiptAndShortages(client, eventId, {
        partId,
        locationId,
        line_id,
        quantity,
        unit_price,
        currency,
        eventTime,
        work_order_code
    });
}

export async function processReceiptAndShortages(client, eventId, data) {
    const { partId, locationId, line_id, quantity, unit_price, currency, eventTime, work_order_code } = data;

    await recordMovement(client, {
        partId,
        locationId,
        quantity: quantity,
        type: 'receipt',
        referenceId: eventId,
        occurredAt: eventTime
    });

    const outEventId = generateDeterministicId(`received-${eventId}-${Date.now()}`);
    await queueOutboxEvent(client, 'inventory.events', `part:${partId}`, {
        event_id: outEventId,
        type: 'stock.received',
        part_id: parseInt(partId, 10),
        location_id: parseInt(locationId, 10),
        purchase_line_id: parseInt(line_id, 10),
        quantity: quantity,
        unit_cost: unit_price ? String(unit_price) : "0",
        currency: currency || 'MXN',
        occurred_at: eventTime
    });

    let remainingReceiptQty = quantity;
    let targetWoId = null;
    if (work_order_code) {
        const woRes = await client.query(`SELECT work_order_id, deleted_at FROM work_orders WHERE code = $1`, [work_order_code]);
        if (woRes.rows.length > 0 && !woRes.rows[0].deleted_at) {
            targetWoId = woRes.rows[0].work_order_id;
        }
    }

    const shortagesRes = await client.query(`
        SELECT id, work_order_id, missing_quantity, inspection_item_id 
        FROM shortages 
        WHERE part_id = $1 AND status = 'open'
        ORDER BY (work_order_id = $2) DESC, created_at ASC
        FOR UPDATE
    `, [partId, targetWoId]);

    let resolvedCount = 0;

    for (const shortage of shortagesRes.rows) {
        if (remainingReceiptQty <= 0) break;
        
        const toResolve = Math.min(Number(shortage.missing_quantity), remainingReceiptQty);
        
        await client.query(`
            UPDATE balances SET reserved = reserved + $1 WHERE part_id = $2 AND location_id = $3
        `, [toResolve, partId, locationId]);

        let rUpdate = await client.query(`
            UPDATE reservations 
            SET reserved_quantity = reserved_quantity + $1
            WHERE work_order_id = $2 AND status = 'active'
            RETURNING reservation_id
        `, [toResolve, shortage.work_order_id]);

        if (rUpdate.rows.length === 0) {
            rUpdate = await client.query(`
                INSERT INTO reservations (work_order_id, reserved_quantity, status)
                VALUES ($1, $2, 'active')
                RETURNING reservation_id
            `, [shortage.work_order_id, toResolve]);
        }

        const reservation_id = rUpdate.rows[0].reservation_id;

        const remainingShortage = Number(shortage.missing_quantity) - toResolve;
        if (remainingShortage === 0) {
            await client.query(`UPDATE shortages SET missing_quantity = 0, status = 'resolved' WHERE id = $1`, [shortage.id]);
        } else {
            await client.query(`UPDATE shortages SET missing_quantity = $1 WHERE id = $2`, [remainingShortage, shortage.id]);
        }

        const woCodeRes = await client.query(`SELECT code FROM work_orders WHERE work_order_id = $1`, [shortage.work_order_id]);
        const woCode = woCodeRes.rows.length > 0 ? woCodeRes.rows[0].code : null;

        const resEventId = generateDeterministicId(`resolved-reserve-${eventId}-${shortage.id}-${resolvedCount}-${Date.now()}`);
        
        // ensure integer inspection_item_id or 1 if missing
        let inspId = shortage.inspection_item_id ? parseInt(shortage.inspection_item_id, 10) : 1;

        await queueOutboxEvent(client, 'inventory.events', woCode, {
            event_id: resEventId,
            type: 'stock.reserved',
            reservation_id: parseInt(reservation_id, 10),
            work_order_id: parseInt(shortage.work_order_id, 10),
            part_id: parseInt(partId, 10),
            quantity: toResolve,
            inspection_item_id: inspId,
            occurred_at: eventTime
        });

        if (remainingShortage === 0 && woCode) {
            const shortResEventId = generateDeterministicId(`resolved-shortage-${eventId}-${shortage.id}-${resolvedCount}-${Date.now()}`);
            await queueOutboxEvent(client, 'inventory.events', woCode, {
                event_id: shortResEventId,
                type: 'stock.shortage_resolved',
                work_order_id: parseInt(shortage.work_order_id, 10),
                part_id: parseInt(partId, 10),
                quantity: toResolve,
                occurred_at: eventTime
            });
        }

        remainingReceiptQty -= toResolve;
        resolvedCount++;
    }
}
