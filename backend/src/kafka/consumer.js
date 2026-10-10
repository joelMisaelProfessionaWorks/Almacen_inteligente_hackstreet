import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import { handleCatalogEvent } from '../handlers/catalog.js';
import { handlePurchasingEvent } from '../handlers/purchasing.js';
import { handleWorkOrderEvent } from '../handlers/workOrders.js';
import { handleInspectionEvent } from '../handlers/inspections.js';

dotenv.config();

const kafka = new Kafka({
    clientId: 'smart-warehouse-consumer',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:19092').split(',')
});

const consumer = kafka.consumer({ groupId: 'warehouse-group' });

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
            const payload = JSON.parse(message.value.toString());
            
            // Extract the envelope properties
            const eventId = payload.event_id;
            const eventType = payload.event_type;
            const data = payload.data;
            const occurredAt = payload.occurred_at;
            
            // Attach occurred_at into data for handlers to use if needed
            if (data && typeof data === 'object') {
                data.occurred_at = occurredAt;
            }

            console.log(`Received event on ${topic}:`, { eventId, type: eventType });

            try {
                if (topic === 'shop.catalog') {
                    await handleCatalogEvent(eventId, eventType, data);
                } else if (topic === 'shop.purchasing') {
                    await handlePurchasingEvent(eventId, eventType, data);
                } else if (topic === 'shop.work_orders') {
                    await handleWorkOrderEvent(eventId, eventType, data);
                } else if (topic === 'shop.inspections') {
                    await handleInspectionEvent(eventId, eventType, data);
                }
            } catch (err) {
                console.error(`Error processing event ${eventId} on topic ${topic}:`, err);
            }
        },
    });
}
