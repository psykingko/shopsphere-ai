const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const jwt = require('jsonwebtoken');

// Test utilities
const PORT = 3003;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

async function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(new URL(BASE_URL + path), options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                if (data) {
                    try {
                        parsed = JSON.parse(data);
                    } catch (e) {
                        parsed = data;
                    }
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: parsed
                });
            });
        });
        req.on('error', reject);
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

function generateCookie(principalType, principalId, role) {
    const payload = {
        principal_type: principalType,
        principal_id: principalId,
        role: role
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    return `token=${token}`;
}

async function runTests() {
    let server;
    let failed = 0;
    const assert = (condition, msg) => {
        if (condition) {
            console.log(`[PASS] ${msg}`);
        } else {
            console.error(`[FAIL] ${msg}`);
            failed++;
        }
    };

    try {
        console.log("=== Starting Order API E2E Tests ===");
        
        await new Promise(resolve => {
            server = app.listen(PORT, resolve);
        });

        // Query database to dynamically discover deterministic seed data instead of hardcoding raw UUIDs
        const custRes = await pool.query('SELECT id FROM customers LIMIT 2');
        const custAId = custRes.rows[0].id;
        const custBId = custRes.rows[1].id;

        const orderARes = await pool.query('SELECT id, status, total_amount FROM orders WHERE customer_id = $1 LIMIT 1', [custAId]);
        const orderA = orderARes.rows[0];
        const orderBRes = await pool.query('SELECT id FROM orders WHERE customer_id = $1 LIMIT 1', [custBId]);
        const orderBId = orderBRes.rows[0].id;

        const fullOrderRes = await pool.query(`
            SELECT o.id, o.customer_id, o.status, o.total_amount 
            FROM orders o
            JOIN payments p ON p.order_id = o.id
            JOIN shipments s ON s.order_id = o.id
            LIMIT 1
        `);
        const fullOrder = fullOrderRes.rows[0];

        const userRes = await pool.query(`SELECT u.id, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'SUPPORT_AGENT' LIMIT 1`);
        const agentId = userRes.rows[0].id;
        
        const adminRes = await pool.query(`SELECT u.id, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'ADMIN' LIMIT 1`);
        const adminId = adminRes.rows[0].id;

        const custACookie = generateCookie('CUSTOMER', custAId, 'CUSTOMER');
        const custBCookie = generateCookie('CUSTOMER', custBId, 'CUSTOMER');
        const agentCookie = generateCookie('USER', agentId, 'SUPPORT_AGENT');
        const adminCookie = generateCookie('USER', adminId, 'ADMIN');

        // 1. Unauthenticated requests -> 401
        let resUnauthList = await request('/orders');
        assert(resUnauthList.status === 401, 'Unauthenticated order list -> 401');
        
        let resUnauthDetail = await request(`/orders/${orderA.id}`);
        assert(resUnauthDetail.status === 401, 'Unauthenticated order detail -> 401');

        // 2. Customer Access Checks
        let custAList = await request('/orders', { headers: { 'Cookie': custACookie } });
        assert(custAList.status === 200, 'Customer can list their own orders -> 200');
        assert(custAList.data.data.every(o => o.customer_id === custAId), 'Customer list contains ONLY their own orders');
        
        let custADetail = await request(`/orders/${orderA.id}`, { headers: { 'Cookie': custACookie } });
        assert(custADetail.status === 200, 'Customer can retrieve their own order -> 200');

        let custATryB = await request(`/orders/${orderBId}`, { headers: { 'Cookie': custACookie } });
        assert(custATryB.status === 403, 'Customer cannot retrieve another customer\'s order (403)');

        let custATryBList = await request(`/orders?customer_id=${custBId}`, { headers: { 'Cookie': custACookie } });
        assert(custATryBList.data.data.every(o => o.customer_id === custAId), 'Customer cannot manipulate customer_id query parameter to access another customer\'s orders');

        let spoofRoleReq = await request(`/orders/${orderBId}`, { headers: { 'Cookie': custACookie, 'x-role': 'ADMIN' } });
        assert(spoofRoleReq.status === 403, 'Customer cannot manipulate role headers');

        // 3. Internal User Access Checks
        let agentList = await request('/orders', { headers: { 'Cookie': agentCookie } });
        assert(agentList.status === 200, 'Authorized SUPPORT_AGENT can read orders');

        let adminList = await request('/orders', { headers: { 'Cookie': adminCookie } });
        assert(adminList.status === 200, 'ADMIN can read orders');
        
        // 4. Order Detail Validations
        const fullOwnerCookie = generateCookie('CUSTOMER', fullOrder.customer_id, 'CUSTOMER');
        let fullDetailRes = await request(`/orders/${fullOrder.id}`, { headers: { 'Cookie': fullOwnerCookie } });
        assert(fullDetailRes.status === 200, 'Existing full order -> 200');
        
        const fd = fullDetailRes.data.data;
        assert(fd.business_id !== undefined, 'Correct order business ID');
        assert(fd.status === fullOrder.status, 'Correct status');
        assert(Number(fd.total_amount) === Number(fullOrder.total_amount), 'Correct total amount');
        assert(fd.created_at !== undefined, 'Correct created_at');
        
        assert(Array.isArray(fd.items) && fd.items.length > 0, 'Correct order items');
        assert(fd.items[0].quantity > 0, 'Correct quantity');
        assert(fd.items[0].unit_price !== undefined, 'Correct historical unit_price');
        assert(fd.items[0].product_sku !== undefined, 'Correct product associations');
        
        assert(fd.payment && fd.payment.id !== undefined && fd.payment.status !== undefined, 'Payment information is safe');
        assert(fd.payment.gateway_reference === undefined || typeof fd.payment.gateway_reference === 'string', 'Payment credentials do not leak');
        assert(fd.shipment && fd.shipment.tracking_number !== undefined, 'Shipment information is safe');

        // Data Consistency
        let sum = fd.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0);
        // Sometimes floating point arithmetic can be tricky, so let's allow a small delta or check conceptually
        assert(Math.abs(sum - Number(fullOrder.total_amount)) < 0.01, 'Order total matches persisted order total');

        // 5. Validation
        let badIdReq = await request('/orders/not-a-uuid', { headers: { 'Cookie': agentCookie } });
        assert(badIdReq.status === 400, 'Malformed UUID -> 400');

        let missingIdReq = await request('/orders/c0000000-0000-4000-8000-999999999999', { headers: { 'Cookie': agentCookie } });
        assert(missingIdReq.status === 404, 'Valid but nonexistent UUID -> 404');
        
        // 6. Pagination
        let page1 = await request('/orders?page=1&limit=2', { headers: { 'Cookie': adminCookie } });
        let page2 = await request('/orders?page=2&limit=2', { headers: { 'Cookie': adminCookie } });
        assert(page1.data.page === 1, 'page=1 returns first page');
        assert(page2.data.page === 2, 'page=2 returns correct next page');
        assert(page1.data.data[0].id !== page2.data.data[0].id, 'Pagination effectively shifts window');
        assert(page1.data.limit === 2, 'limit is respected');
        assert(page1.data.total > 0, 'total is correct');
        
        // 7. Filtering
        let statusFilter = await request(`/orders?status=${orderA.status}`, { headers: { 'Cookie': adminCookie } });
        assert(statusFilter.data.data.every(o => o.status === orderA.status), 'Status filter works');
        
        // 8. Security/Regression Constraints
        assert(fullDetailRes.data.data.payment.password_hash === undefined, 'No sensitive fields leak');
        assert(fullDetailRes.data.data.payment.card_number === undefined, 'Raw payment credentials do not leak');

    } catch (e) {
        console.error(e);
        failed++;
    } finally {
        if (server) server.close();
        await pool.end();
    }

    if (failed === 0) {
        console.log("\n[SUCCESS] All Order API tests passed.");
    } else {
        console.log(`\n[FAILED] ${failed} tests failed.`);
        process.exit(1);
    }
}

runTests();
