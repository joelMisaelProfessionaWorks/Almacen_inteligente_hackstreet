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
    
    // Start HTTP API immediately so frontend doesn't get connection refused
    app.listen(port, () => {
        console.log(`API running on http://localhost:${port}`);
    });

    try {
        await testDbConnection();
        await startPublisher();
        await startConsumer();
    } catch (err) {
        console.error('Error initializing DB/Kafka (server is still running):', err);
    }
}

main();

// force restart
