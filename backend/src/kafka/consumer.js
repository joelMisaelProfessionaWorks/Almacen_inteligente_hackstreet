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
            const eventId = message.key ? message.key.toString() : null;
            const payload = JSON.parse(message.value.toString());
            
            console.log(`Received event on ${topic}:`, { eventId, type: payload.type });

            try {
                if (topic === 'shop.catalog') {
                    await handleCatalogEvent(eventId, payload.type, payload);
                } else if (topic === 'shop.purchasing') {
                    await handlePurchasingEvent(eventId, payload.type, payload);
                } else if (topic === 'shop.work_orders') {
                    await handleWorkOrderEvent(eventId, payload.type, payload);
                } else if (topic === 'shop.inspections') {
                    await handleInspectionEvent(eventId, payload.type, payload);
                }
            } catch (err) {
                console.error(`Error processing event ${eventId} on topic ${topic}:`, err);
            }
        },
    });
}
