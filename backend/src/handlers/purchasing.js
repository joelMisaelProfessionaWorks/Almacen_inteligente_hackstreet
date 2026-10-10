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

    // Regla 9: purpose = customer_order se ignora por completo
    if (purpose === 'customer_order') {
        console.log(`Ignoring purchase.item_received ${eventId} because purpose is customer_order`);
        return;
    }

    // Regla 10: Normalizar part_number y buscar coincidencia en parts
    const sku_norm = part_number ? part_number.trim().toUpperCase().replace(/\s+/g, ' ') : '';
    const partsRes = await client.query(`
        SELECT part_id FROM parts WHERE sku_norm = $1
    `, [sku_norm]);

    if (partsRes.rows.length !== 1) {
        // 0 o >1 coincidencias -> unmatched_receipt
        await client.query(`
            INSERT INTO unmatched_receipts (receipt_event_id, sku, quantity)
            VALUES ($1, $2, $3)
        `, [eventId, part_number, quantity]);

        const outEventId = generateDeterministicId(`unmatched-${eventId}`);
        const outPayload = {
            event_id: outEventId,
            type: 'stock.unmatched_receipt',
            receipt_event_id: eventId,
            sku: part_number,
            quantity: quantity,
            occurred_at: eventTime
        };
        await queueOutboxEvent(client, 'inventory.events', `receipt:${eventId}`, outPayload);
        return;
    }

    const partId = partsRes.rows[0].part_id;
    const locationId = 100; // Regla 11: U-100 siempre es recepción. Asumimos location_id = 100

    // Incrementar on_hand en balances y crear movimiento
    await recordMovement(client, {
        partId,
        locationId,
        quantity: quantity,
        type: 'receipt',
        referenceId: eventId,
        occurredAt: eventTime
    });

    // TODO: Si trae work_order_code, surtir primero el faltante de esa orden (Regla 12)
    // Esto se integrará en el Paso 3 con reservations.js

    // Emitir evento de salida stock.received
    const outEventId = generateDeterministicId(`received-${eventId}`);
    const outPayload = {
        event_id: outEventId,
        type: 'stock.received',
        part_id: partId,
        location_id: locationId,
        quantity,
        unit_price, // Útil para valuación a costo promedio (Extra)
        occurred_at: eventTime
    };
    await queueOutboxEvent(client, 'inventory.events', `part:${partId}`, outPayload);
}
