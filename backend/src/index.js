process.on('uncaughtException', (err) => { console.error('Uncaught Exception:', err); });
process.on('unhandledRejection', (reason) => { console.error('Unhandled Rejection:', reason); });
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupApiRoutes } from './api/routes.js';
import { startConsumer } from './kafka/consumer.js';
import { startPublisher } from './kafka/publisher.js';
import { testDbConnection } from './db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Setup API routes
setupApiRoutes(app);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

async function main() {
    console.log('Starting Smart Warehouse Backend...');
    
    // 1. Check DB Connection
    await testDbConnection();

    // 2. Start HTTP API
    app.listen(port, () => {
        console.log(`API running on http://localhost:${port}`);
    });

    // 3. Start Kafka Publisher (Outbox pattern)
    await startPublisher();

    // 4. Start Kafka Consumer
    await startConsumer();
}

main().catch(err => {
    console.error('Fatal error during startup:', err);
    process.exit(1);
});
