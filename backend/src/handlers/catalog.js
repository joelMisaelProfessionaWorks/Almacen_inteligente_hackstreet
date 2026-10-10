import { withTransaction, pool } from '../db.js';
import { markEventProcessed } from '../domain/events.js';

export async function handleCatalogEvent(eventId, type, payload) {
    if (!eventId) return;

    try {
        await withTransaction(async (client) => {
            const isNew = await markEventProcessed(client, eventId, payload.occurred_at || new Date().toISOString());
            if (!isNew) {
                console.log(`[Idempotency] Event ${eventId} already processed.`);
                return;
            }

            switch (type) {
                case 'part.upserted':
                    await handlePartUpserted(client, payload);
                    break;
                case 'location.upserted':
                    await handleLocationUpserted(client, payload);
                    break;
                case 'bom.upserted':
                    await handleBomUpserted(client, payload);
                    break;
                default:
                    console.log(`Unknown catalog event type: ${type}`);
            }
        });
    } catch (err) {
        if (err.code === '23503') { // Foreign Key violation
            console.log(`[Out of order] Catalog event ${eventId} missing dependency, queuing to pending_events.`);
            await queuePendingEvent(eventId, 'shop.catalog', payload, err.message);
        } else {
            throw err;
        }
    }
}

async function handlePartUpserted(client, payload) {
    const { id, sku, name, description, unit_of_measure } = payload;
    const sku_norm = sku ? sku.trim().toUpperCase().replace(/\s+/g, ' ') : null;

    await client.query(`
        INSERT INTO parts (part_id, sku, sku_norm, name, description, unit_of_measure)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (part_id) DO UPDATE SET
            sku = EXCLUDED.sku,
            sku_norm = EXCLUDED.sku_norm,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            unit_of_measure = EXCLUDED.unit_of_measure
    `, [id, sku, sku_norm, name, description, unit_of_measure]);
}

async function handleLocationUpserted(client, payload) {
    const { id, code, name } = payload;
    await client.query(`
        INSERT INTO locations (location_id, code, name)
        VALUES ($1, $2, $3)
        ON CONFLICT (location_id) DO UPDATE SET
            code = EXCLUDED.code,
            name = EXCLUDED.name
    `, [id, code, name]);
}

async function handleBomUpserted(client, payload) {
    const { work_order_id, lines } = payload;
    for (const line of lines) {
        await client.query(`
            INSERT INTO bom_lines (bom_line_id, work_order_id, part_id, qty_per_unit, group_name)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (bom_line_id) DO UPDATE SET
                work_order_id = EXCLUDED.work_order_id,
                part_id = EXCLUDED.part_id,
                qty_per_unit = EXCLUDED.qty_per_unit,
                group_name = EXCLUDED.group_name
        `, [line.id, work_order_id, line.part_id, line.qty_per_unit, line.group_name]);
    }
}

export async function queuePendingEvent(eventId, topic, payload, errorMsg) {
    const client = await pool.connect();
    try {
        await client.query(`
            INSERT INTO pending_events (event_id, topic, payload, last_error)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (event_id) DO UPDATE SET
                attempts = pending_events.attempts + 1,
                last_error = EXCLUDED.last_error,
                next_attempt_at = NOW() + INTERVAL '5 seconds'
        `, [eventId, topic, JSON.stringify(payload), errorMsg]);
    } finally {
        client.release();
    }
}
