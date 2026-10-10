import { v5 as uuidv5 } from 'uuid';

// Namespace for generating deterministic UUIDs (Outbox event IDs)
const EVENT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Helper to generate a deterministic UUID based on input string (e.g. input_event_id + index)
 */
export function generateDeterministicId(inputString) {
    return uuidv5(inputString, EVENT_NAMESPACE);
}

/**
 * Queue an event into the outbox within the current transaction
 */
export async function queueOutboxEvent(client, topic, key, payload) {
    await client.query(`
        INSERT INTO outbox (topic, key, payload)
        VALUES ($1, $2, $3)
    `, [topic, key, JSON.stringify(payload)]);
}

/**
 * Guard idempotency. Attempts to insert the event_id into processed_events.
 * Returns true if it was inserted (not processed yet).
 * Returns false if it already exists (duplicate/idempotent).
 */
export async function markEventProcessed(client, eventId, occurredAt) {
    try {
        await client.query(`
            INSERT INTO processed_events (event_id, occurred_at) 
            VALUES ($1, $2)
        `, [eventId, occurredAt]);
        return true;
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return false;
        }
        throw err;
    }
}
