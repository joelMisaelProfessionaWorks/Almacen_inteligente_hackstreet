import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import { handleCatalogEvent } from '../handlers/catalog.js';
import { handlePurchasingEvent } from '../handlers/purchasing.js';
import { handleWorkOrderEvent } from '../handlers/workOrders.js';
import { handleInspectionEvent } from '../handlers/inspections.js';
import { pool } from '../db.js';

dotenv.config();

const kafka = new Kafka({
    clientId: 'smart-warehouse-consumer',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:19092').split(',')
});

const consumer = kafka.consumer({ groupId: 'warehouse-group' });

async function retryPendingEvents() {
    try {
        const res = await pool.query(`
            SELECT event_id, topic, payload FROM pending_events 
            ORDER BY next_attempt_at ASC LIMIT 50
        `);
        for (const row of res.rows) {
            const topic = row.topic;
            const payload = row.payload;
            const eventId = row.event_id;
            
            try {
                if (topic === 'shop.catalog') {
                    await handleCatalogEvent(eventId, payload.__type, payload);
                } else if (topic === 'shop.purchasing') {
                    await handlePurchasingEvent(eventId, payload.__type, payload);
                } else if (topic === 'shop.work_orders') {
                    await handleWorkOrderEvent(eventId, payload.__type, payload);
                } else if (topic === 'shop.inspections') {
                    await handleInspectionEvent(eventId, payload.__type, payload);
                }
                
                // If success, delete from pending_events
                await pool.query(`DELETE FROM pending_events WHERE event_id = $1`, [eventId]);
                console.log(`Successfully retried event ${eventId} on ${topic}`);
            } catch (err) {
                if (err.code === '23503') {
                    // Still missing FK dependencies, ignore and keep waiting
                    await pool.query(`UPDATE pending_events SET attempts = attempts + 1, last_error = $1 WHERE event_id = $2`, [err.message, eventId]);
                } else {
                    console.error(`Error retrying event ${eventId}:`, err);
                    await pool.query(`UPDATE pending_events SET attempts = attempts + 1, last_error = $1 WHERE event_id = $2`, [err.message, eventId]);
                }
            }
        }
    } catch (err) {
        console.error('Error in retryPendingEvents:', err);
    }
}

export async function startConsumer() {
    await consumer.connect();
    console.log('Kafka Consumer connected');
    
    const topics = [
        'shop.catalog',
        'shop.work_orders',
        'shop.inspections',
        'shop.purchasing'
    ];

    for (const topic of topics) {
        await consumer.subscribe({ topic, fromBeginning: true });
    }

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            try {
                const value = message.value.toString();
                const payload = JSON.parse(value);
                const eventId = payload.event_id || payload.eventId;
                const type = payload.type || payload.event_type;
                
                // Extract inner data if envelope
                let data = payload;
                if (payload.data && typeof payload.data === 'object') {
                    data = { ...payload, ...payload.data };
                }

                console.log(`Received event on ${topic}:`, { eventId, type });

                if (topic === 'shop.catalog') {
                    await handleCatalogEvent(eventId, type, data);
                } else if (topic === 'shop.purchasing') {
                    await handlePurchasingEvent(eventId, type, data);
                } else if (topic === 'shop.work_orders') {
                    await handleWorkOrderEvent(eventId, type, data);
                } else if (topic === 'shop.inspections') {
                    await handleInspectionEvent(eventId, type, data);
                }
            } catch (err) {
                console.error(`Error processing message on ${topic}:`, err);
            }
        }
    });

    setInterval(retryPendingEvents, 2000);
}
