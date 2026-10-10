import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

const kafka = new Kafka({
    clientId: 'smart-warehouse-consumer',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:19092').split(',')
});

const consumer = kafka.consumer({ groupId: 'warehouse-group' });

export async function startConsumer() {
    await consumer.connect();
    console.log('Kafka Consumer connected');
    
    // As per PLAN.md rule 7: We must consume shop.catalog from beginning to end
    // before consuming other topics to prevent dependency errors.
    // For now, we subscribe to all topics the hackathon requires
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
            // TODO: Route to handlers and process with idempotency
        },
    });
}
