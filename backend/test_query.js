const { pool } = require('./src/config/database');

(async () => {
    try {
        const c = await pool.query('SELECT id FROM customers LIMIT 2');
        const c1Id = c.rows[0].id;
        const c2Id = c.rows[1].id;

        const o1 = await pool.query('SELECT id, customer_id, status FROM orders WHERE customer_id = $1 LIMIT 1', [c1Id]);
        const o2 = await pool.query('SELECT id, customer_id FROM orders WHERE customer_id = $1 LIMIT 1', [c2Id]);
        
        const u = await pool.query('SELECT u.id, r.name as role FROM users u JOIN roles r ON u.role_id = r.id');
        
        console.log('C1:', c1Id, 'O1:', o1.rows[0]);
        console.log('C2:', c2Id, 'O2:', o2.rows[0]);
        console.log('U1:', u.rows[0]);
        console.log('U2:', u.rows[1]);
        
        // Also let's grab an order UUID that has payments/shipments if possible
        const fullOrder = await pool.query(`
            SELECT o.id 
            FROM orders o
            JOIN payments p ON p.order_id = o.id
            JOIN shipments s ON s.order_id = o.id
            LIMIT 1
        `);
        console.log('Order with all related:', fullOrder.rows[0]);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
})();
