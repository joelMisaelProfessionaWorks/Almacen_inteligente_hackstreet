import { queueOutboxEvent, generateDeterministicId } from './events.js';

/**
 * Registra un movimiento en el libro mayor y actualiza el saldo.
 * type puede ser: 'receipt', 'issue', 'transfer_out', 'transfer_in', 'adjustment', 'count'
 * quantity es positivo para entradas, negativo para salidas.
 */
export async function recordMovement(client, params) {
    const { partId, locationId, quantity, type, referenceId, occurredAt } = params;

    // 1. Validar que la ubicación existe, si no, crearla on the fly o rechazar?
    // El contrato dice que la U-100 es recepción. Debería existir.

    // 2. Bloquear la fila de balance para evitar condiciones de carrera (FOR UPDATE)
    const balanceRes = await client.query(`
        INSERT INTO balances (part_id, location_id, on_hand, reserved)
        VALUES ($1, $2, 0, 0)
        ON CONFLICT (part_id, location_id) DO UPDATE SET on_hand = balances.on_hand
        RETURNING on_hand, reserved
    `, [partId, locationId]);

    const currentBalance = balanceRes.rows[0];
    const available = Number(currentBalance.on_hand) - Number(currentBalance.reserved);

    // 3. Validar negativos (Regla 8 y 16)
    // POST /issues o transfer_out no pueden dejar saldo disponible en negativo.
    if ((type === 'issue' || type === 'transfer_out') && quantity < 0) {
        if (available + quantity < 0) {
            const err = new Error('Insufficient available stock');
            err.code = 'INSUFFICIENT_STOCK'; // Para mapear a 409 HTTP
            throw err;
        }
    }

    // 4. Actualizar balance
    await client.query(`
        UPDATE balances 
        SET on_hand = on_hand + $1
        WHERE part_id = $2 AND location_id = $3
    `, [quantity, partId, locationId]);

    // 5. Insertar movimiento
    const moveRes = await client.query(`
        INSERT INTO movements (part_id, location_id, quantity, type, reference_id, occurred_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING movement_id
    `, [partId, locationId, quantity, type, referenceId, occurredAt]);

    return moveRes.rows[0].movement_id;
}
