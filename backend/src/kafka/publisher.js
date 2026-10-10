import { Kafka } from 'kafkajs';
import { pool } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

const kafka = new Kafka({
    clientId: 'smart-warehouse-publisher',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:19092').split(',')
});

const producer = kafka.producer();

export async function startPublisher() {
    await producer.connect();
    console.log('Kafka Producer connected');

    setInterval(async () => {
        try {
            await publishPendingEvents();
        } catch (err) {
            console.error('Error in outbox publisher:', err);
        }
    }, 1000); 
}

async function publishPendingEvents() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const res = await client.query(`
            SELECT id, topic, key, payload 
            FROM outbox 
            WHERE published_at IS NULL 
            ORDER BY created_at ASC 
            FOR UPDATE SKIP LOCKED 
            LIMIT 100
        `);

        const events = res.rows;
        if (events.length === 0) {
            await client.query('COMMIT');
            return;
        }

        const topicMessages = {};
        for (const event of events) {
            if (!topicMessages[event.topic]) {
                topicMessages[event.topic] = [];
            }
            
            const payload = event.payload;
            const event_id = payload.event_id || `evt-${event.id}`;
            const event_type = payload.type || payload.event_type || 'unknown';
            const occurred_at = payload.occurred_at || new Date().toISOString();
            
            const data = { ...payload };
            delete data.event_id;
            delete data.type;

            const envelope = {
                event_id,
                event_type,
                event_version: 1,
                occurred_at,
                source: "inventory",
                key: event.key,
                data
            };

            topicMessages[event.topic].push({
                key: event.key,
                value: JSON.stringify(envelope)
            });
        }

        for (const [topic, messages] of Object.entries(topicMessages)) {
            await producer.send({
                topic,
                messages
            });
        }

        const ids = events.map(e => e.id);
        await client.query(`
            UPDATE outbox 
            SET published_at = NOW() 
            WHERE id = ANY($1)
        `, [ids]);

        await client.query('COMMIT');
        console.log(`Published ${events.length} events from outbox`);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
