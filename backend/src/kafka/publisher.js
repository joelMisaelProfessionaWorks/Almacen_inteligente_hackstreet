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

    // Simple polling interval for outbox pattern
    setInterval(async () => {
        try {
            await publishPendingEvents();
        } catch (err) {
            console.error('Error in outbox publisher:', err);
        }
    }, 2000); // Check every 2 seconds
}

async function publishPendingEvents() {
    // We use an explicit transaction or just update RETURNING to claim rows safely.
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Select and lock up to 100 unpublished events
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

        // Group messages by topic for Kafka
        const topicMessages = {};
        for (const event of events) {
            if (!topicMessages[event.topic]) {
                topicMessages[event.topic] = [];
            }
            topicMessages[event.topic].push({
                key: event.key,
                value: JSON.stringify(event.payload)
            });
        }

        // Send to Kafka
        for (const [topic, messages] of Object.entries(topicMessages)) {
            await producer.send({
                topic,
                messages
            });
        }

        // Mark as published
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
