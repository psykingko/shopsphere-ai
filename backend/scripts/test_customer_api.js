
const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const jwt = require('jsonwebtoken');

// Test utilities
const PORT = 3001; // Avoid colliding with main server
const BASE_URL = `http://localhost:${PORT}/api/v1/customers`;

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
        console.log("=== Starting Customer API E2E Tests ===");
        
        // Start server
        await new Promise(resolve => {
            server = app.listen(PORT, resolve);
        });

        // Setup test data
        const customerId = 'c0000000-0000-4000-8000-111111111111';
        const otherCustomerId = 'c0000000-0000-4000-8000-222222222222';
        const deletedCustomerId = 'c0000000-0000-4000-8000-333333333333';
        
        // Insert customers
        await pool.query(`INSERT INTO customers (id, first_name, last_name, email) VALUES ($1, 'Test', 'One', 't1@shop.com') ON CONFLICT DO NOTHING`, [customerId]);
        await pool.query(`INSERT INTO customers (id, first_name, last_name, email) VALUES ($1, 'Test', 'Two', 't2@shop.com') ON CONFLICT DO NOTHING`, [otherCustomerId]);
        await pool.query(`INSERT INTO customers (id, first_name, last_name, email, deleted_at) VALUES ($1, 'Test', 'Del', 'tdel@shop.com', NOW()) ON CONFLICT DO NOTHING`, [deletedCustomerId]);

        // Insert addresses
        await pool.query(`INSERT INTO customer_addresses (id, customer_id, street, city, zip, country) VALUES ($1, $2, '123 Main', 'City', '12345', 'US') ON CONFLICT DO NOTHING`, ['a0000000-0000-4000-8000-111111111111', customerId]);
        
        // Get JWT cookies
        const customerCookie = generateCookie('CUSTOMER', customerId, 'CUSTOMER'); // We allow role=CUSTOMER even if not in RBAC to pass jwt payload
        const otherCustomerCookie = generateCookie('CUSTOMER', otherCustomerId, 'CUSTOMER');
        const internalAgentCookie = generateCookie('USER', 'u0000000-0000-4000-8000-111111111111', 'SUPPORT_AGENT');
        const unauthorizedAgentCookie = generateCookie('USER', 'u0000000-0000-4000-8000-222222222222', 'UNKNOWN_ROLE'); // Unauthorized role

        // 1. Unauthenticated (No cookie -> 401)
        let res1 = await request(`/${customerId}`);
        assert(res1.status === 401, 'Unauthenticated request returns 401');

        // 2. Authenticated but unauthorized (RBAC block)
        let res2 = await request(`/${customerId}`, { headers: { 'Cookie': unauthorizedAgentCookie } });
        assert(res2.status === 403, 'Unauthorized RBAC role returns 403');

        // 3. Customer ownership: Accessing own customer -> 200
        let res3 = await request(`/${customerId}`, { headers: { 'Cookie': customerCookie } });
        assert(res3.status === 200, 'Customer accessing own record returns 200');
        assert(res3.data.data.email === 't1@shop.com', 'Returns correct customer data');
        assert(res3.data.data.addresses.length === 1, 'Returns associated addresses');
        assert(res3.data.data.password_hash === undefined, 'No sensitive fields are leaked');

        // 4. Customer ownership: Accessing another customer's record -> 403
        let res4 = await request(`/${otherCustomerId}`, { headers: { 'Cookie': customerCookie } });
        assert(res4.status === 403, 'Customer accessing another customer returns 403');

        // 5. Internal Agent with customer.read accessing any customer -> 200
        let res5 = await request(`/${otherCustomerId}`, { headers: { 'Cookie': internalAgentCookie } });
        assert(res5.status === 200, 'Internal agent accessing any customer returns 200');

        // 6. Invalid ID -> 400
        let res6 = await request(`/not-a-uuid`, { headers: { 'Cookie': internalAgentCookie } });
        assert(res6.status === 400, 'Malformed UUID returns 400');
        assert(res6.data.error.code === 'VALIDATION_FAILED', 'Correct error code for validation failure');

        // 7. Missing customer -> 404
        let res7 = await request(`/c0000000-0000-4000-8000-999999999999`, { headers: { 'Cookie': internalAgentCookie } });
        assert(res7.status === 404, 'Missing customer returns 404');
        assert(res7.data.error.code === 'NOT_FOUND', 'Correct error code for not found');

        // 8. Soft Deleted customer -> 404
        let res8 = await request(`/${deletedCustomerId}`, { headers: { 'Cookie': internalAgentCookie } });
        assert(res8.status === 404, 'Soft deleted customer returns 404 (omitted from API reads)');

        // 9. Spoofing protection
        // Try to pass a different role in the body, ensuring the middleware doesn't trust it. (This requires a POST/PUT/PATCH, but since we are sending GET, we can't easily send body without violating REST conventions. However, we can send a custom header which should be ignored).
        let res9 = await request(`/${otherCustomerId}`, { headers: { 'Cookie': customerCookie, 'x-role': 'ADMIN' } });
        assert(res9.status === 403, 'Client spoofing headers cannot override principal constraints (403)');

    } catch (e) {
        console.error(e);
        failed++;
    } finally {
        if (server) server.close();
        await pool.end();
    }

    if (failed === 0) {
        console.log("\n[SUCCESS] All Customer API tests passed.");
    } else {
        console.log(`\n[FAILED] ${failed} tests failed.`);
        process.exit(1);
    }
}

runTests();
