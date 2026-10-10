import { queueOutboxEvent, generateDeterministicId } from './events.js';

export async function processInspectionApproved(client, eventId, payload) {
    const { inspection_id, work_order_id, items, occurred_at } = payload;
    const eventTime = occurred_at || new Date().toISOString();

    const woRes = await client.query(`SELECT code, deleted_at FROM work_orders WHERE work_order_id = $1`, [work_order_id]);
    if (woRes.rows.length === 0) {
        const err = new Error(`Work order ${work_order_id} not found`);
        err.code = '23503'; 
        throw err;
    }
    const wo = woRes.rows[0];

    if (wo.deleted_at) {
        console.log(`Ignoring inspection ${inspection_id} because work_order ${work_order_id} is deleted`);
        return;
    }

    const inspRes = await client.query(`SELECT voided_at FROM inspections WHERE inspection_id = $1`, [inspection_id]);
    if (inspRes.rows.length > 0 && inspRes.rows[0].voided_at) {
        console.log(`Ignoring inspection ${inspection_id} because it was already voided`);
        return;
    }

    if (!items || items.length === 0) return;

    for (const line of items) {
        if (line.action !== 'buy') continue;

        const bomRes = await client.query(`SELECT part_id, qty_per_unit FROM bom_lines WHERE bom_line_id = $1`, [line.bom_line_id]);
        if (bomRes.rows.length === 0) {
            const err = new Error(`BOM line ${line.bom_line_id} not found`);
            err.code = '23503';
            throw err;
        }
        const bom = bomRes.rows[0];

        let quantity = line.quantity;
        if (quantity === null || quantity === undefined) {
            quantity = bom.qty_per_unit;
        }

        const partId = line.part_id || bom.part_id;
        
        let partName = 'UNKNOWN';
        if (partId) {
            const partRowRes = await client.query(`SELECT name FROM parts WHERE part_id = $1`, [partId]);
            if (partRowRes.rows.length > 0) partName = partRowRes.rows[0].name;
        }

        if (partId === null || partId === undefined) {
            const outEventId = generateDeterministicId(`shortage-${eventId}-${line.bom_line_id}`);
            await client.query(`
                INSERT INTO shortages (work_order_id, missing_quantity, inspection_item_id) 
                VALUES ($1, $2, $3)
            `, [work_order_id, quantity, line.inspection_item_id]);
            
            await queueOutboxEvent(client, 'inventory.events', wo.code, {
                event_id: outEventId,
                type: 'stock.shortage_detected',
                work_order_id: parseInt(work_order_id, 10),
                part_id: null,
                name: partName,
                missing_quantity: quantity,
                inspection_item_id: parseInt(line.inspection_item_id, 10),
                occurred_at: eventTime
            });
            continue;
        }

        const prevRes = await client.query(`
            SELECT reserved_quantity FROM reservations 
            WHERE work_order_id = $1 AND bom_line_id = $2
        `, [work_order_id, line.bom_line_id]);

        let previousReserved = prevRes.rows.length > 0 ? Number(prevRes.rows[0].reserved_quantity) : 0;
        
        await client.query(`
            INSERT INTO needs (work_order_id, bom_line_id, inspection_id, required_quantity)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (work_order_id, bom_line_id) DO UPDATE SET
                inspection_id = EXCLUDED.inspection_id,
                required_quantity = EXCLUDED.required_quantity
        `, [work_order_id, line.bom_line_id, inspection_id, quantity]);

        const diff = quantity - previousReserved;
        
        if (diff > 0) {
            const balRes = await client.query(`
                SELECT location_id, on_hand, reserved, (on_hand - reserved) as available
                FROM balances 
                WHERE part_id = $1 AND (on_hand - reserved) > 0
                FOR UPDATE
            `, [partId]);

            let needed = diff;
            let newlyReserved = 0;

            for (const bal of balRes.rows) {
                if (needed <= 0) break;
                const available = Number(bal.available);
                const toReserve = Math.min(available, needed);
                
                await client.query(`
                    UPDATE balances SET reserved = reserved + $1 WHERE part_id = $2 AND location_id = $3
                `, [toReserve, partId, bal.location_id]);

                needed -= toReserve;
                newlyReserved += toReserve;
            }

            const rInsert = await client.query(`
                INSERT INTO reservations (work_order_id, bom_line_id, reserved_quantity, status)
                VALUES ($1, $2, $3, 'active')
                ON CONFLICT (work_order_id, bom_line_id) DO UPDATE SET
                    reserved_quantity = reservations.reserved_quantity + $3,
                    status = 'active'
                RETURNING reservation_id
            `, [work_order_id, line.bom_line_id, newlyReserved]);
            
            const reservation_id = rInsert.rows[0].reservation_id;

            if (newlyReserved > 0) {
                const resEventId = generateDeterministicId(`reserved-${eventId}-${line.bom_line_id}`);
                await queueOutboxEvent(client, 'inventory.events', wo.code, {
                    event_id: resEventId,
                    type: 'stock.reserved',
                    reservation_id: parseInt(reservation_id, 10),
                    work_order_id: parseInt(work_order_id, 10),
                    part_id: parseInt(partId, 10),
                    quantity: newlyReserved,
                    inspection_item_id: parseInt(line.inspection_item_id, 10),
                    occurred_at: eventTime
                });
            }

            if (needed > 0) {
                const shortEventId = generateDeterministicId(`shortage-${eventId}-${line.bom_line_id}`);
                await client.query(`
                    INSERT INTO shortages (part_id, work_order_id, missing_quantity, inspection_item_id) 
                    VALUES ($1, $2, $3, $4)
                `, [partId, work_order_id, needed, line.inspection_item_id]);

                await queueOutboxEvent(client, 'inventory.events', wo.code, {
                    event_id: shortEventId,
                    type: 'stock.shortage_detected',
                    work_order_id: parseInt(work_order_id, 10),
                    part_id: parseInt(partId, 10),
                    name: partName,
                    missing_quantity: needed,
                    inspection_item_id: parseInt(line.inspection_item_id, 10),
                    occurred_at: eventTime
                });
            }

        } else if (diff < 0) {
            const toRelease = Math.abs(diff);
            await client.query(`
                UPDATE reservations 
                SET reserved_quantity = reserved_quantity - $1
                WHERE work_order_id = $2 AND bom_line_id = $3
            `, [toRelease, work_order_id, line.bom_line_id]);

            await releaseFromBalances(client, partId, toRelease);
        }
    }
}

export async function releaseWorkOrderReservations(client, work_order_id, eventId, eventTime) {
    const resList = await client.query(`
        SELECT bom_line_id, reserved_quantity 
        FROM reservations 
        WHERE work_order_id = $1 AND status = 'active'
    `, [work_order_id]);

    for (const r of resList.rows) {
        const bomRes = await client.query(`SELECT part_id FROM bom_lines WHERE bom_line_id = $1`, [r.bom_line_id]);
        if (bomRes.rows.length > 0 && bomRes.rows[0].part_id) {
            await releaseFromBalances(client, bomRes.rows[0].part_id, r.reserved_quantity);
        }
    }

    await client.query(`UPDATE reservations SET reserved_quantity = 0, status = 'released' WHERE work_order_id = $1`, [work_order_id]);
    await client.query(`UPDATE shortages SET status = 'closed' WHERE work_order_id = $1 AND status = 'open'`, [work_order_id]);
}

export async function releaseInspectionReservations(client, inspection_id, eventId, eventTime) {
    const needs = await client.query(`SELECT work_order_id, bom_line_id FROM needs WHERE inspection_id = $1`, [inspection_id]);
    
    for (const need of needs.rows) {
        const res = await client.query(`
            SELECT reserved_quantity FROM reservations 
            WHERE work_order_id = $1 AND bom_line_id = $2 AND status = 'active'
        `, [need.work_order_id, need.bom_line_id]);

        if (res.rows.length > 0 && res.rows[0].reserved_quantity > 0) {
            const qty = Number(res.rows[0].reserved_quantity);
            const bomRes = await client.query(`SELECT part_id FROM bom_lines WHERE bom_line_id = $1`, [need.bom_line_id]);
            if (bomRes.rows.length > 0 && bomRes.rows[0].part_id) {
                await releaseFromBalances(client, bomRes.rows[0].part_id, qty);
            }
            await client.query(`UPDATE reservations SET reserved_quantity = 0, status = 'released' WHERE work_order_id = $1 AND bom_line_id = $2`, [need.work_order_id, need.bom_line_id]);
        }
    }
}

async function releaseFromBalances(client, partId, amountToRelease) {
    let remaining = amountToRelease;
    const balRes = await client.query(`
        SELECT location_id, reserved 
        FROM balances 
        WHERE part_id = $1 AND reserved > 0 
        ORDER BY reserved DESC
        FOR UPDATE
    `, [partId]);

    for (const bal of balRes.rows) {
        if (remaining <= 0) break;
        const availableToFree = Number(bal.reserved);
        const toFree = Math.min(availableToFree, remaining);

        await client.query(`
            UPDATE balances SET reserved = reserved - $1 WHERE part_id = $2 AND location_id = $3
        `, [toFree, partId, bal.location_id]);

        remaining -= toFree;
    }
}
