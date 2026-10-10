import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.on('error', (err, client) => { console.error('Unexpected error on idle client', err); }); export async function testDbConnection() {
    try {
        const client = await pool.connect();
        console.log('Successfully connected to database');
        client.release();
    } catch (err) {
        console.error('Error connecting to database:', err);
        throw err;
    }
}

/**
 * Helper to run a block of code inside a database transaction.
 * Automatically commits if successful, or rollbacks on error.
 */
export async function withTransaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export { pool };
