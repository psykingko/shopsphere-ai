const { pool } = require('./database');

/**
 * Lightweight helper to manage PostgreSQL transactions and propagate the client to callbacks.
 * 
 * @param {Function} callback - An async function that receives the (client) as its argument.
 * @returns {Promise<any>} The result of the callback.
 */
async function withTransaction(callback) {
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

module.exports = {
    withTransaction
};
