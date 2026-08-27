const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const jwt = require('jsonwebtoken');

// Test utilities
const PORT = 3004;
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
        console.log("=== Starting Shipment API E2E Tests ===");
        
        await new Promise(resolve => {
            server = app.listen(PORT, resolve);
        });

        // 1. Discover data
        // Find a shipment and its owner
        const shipmentRes = await pool.query(`
            SELECT s.id as shipment_id, s.carrier, s.tracking_number, s.status, s.estimated_delivery, o.customer_id
            FROM shipments s
            JOIN orders o ON s.order_id = o.id
            LIMIT 1
        `);
        if (shipmentRes.rowCount === 0) {
            throw new Error("No shipments found in the seeded database. Cannot run tests.");
        }
        const s1 = shipmentRes.rows[0];

        // Find a completely different customer
        const otherCustRes = await pool.query(`
            SELECT id FROM customers WHERE id != $1 LIMIT 1
        `, [s1.customer_id]);
        const otherCustomerId = otherCustRes.rows[0].id;

        // Internal staff
        const agentRes = await pool.query(`SELECT u.id, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'SUPPORT_AGENT' LIMIT 1`);
        const agentId = agentRes.rows[0].id;

        // Generate tokens
        const ownerCookie = generateCookie('CUSTOMER', s1.customer_id, 'CUSTOMER');
        const otherCustCookie = generateCookie('CUSTOMER', otherCustomerId, 'CUSTOMER');
        const agentCookie = generateCookie('USER', agentId, 'SUPPORT_AGENT');

        // Authentication tests
        let resUnauth = await request(`/shipments/${s1.shipment_id}`);
        assert(resUnauth.status === 401, 'No authentication -> 401');

        // Customer Ownership tests
        let resOwner = await request(`/shipments/${s1.shipment_id}`, { headers: { 'Cookie': ownerCookie } });
        assert(resOwner.status === 200, 'Customer accessing shipment belonging to their order -> 200');

        let resOtherCust = await request(`/shipments/${s1.shipment_id}`, { headers: { 'Cookie': otherCustCookie } });
        assert(resOtherCust.status === 403, 'Customer accessing another customer\'s shipment -> denied (403)');

        let resSpoofedCust = await request(`/shipments/${s1.shipment_id}?customer_id=${s1.customer_id}`, { headers: { 'Cookie': otherCustCookie } });
        assert(resSpoofedCust.status === 403, 'Customer cannot bypass ownership using query parameters');

        let spoofRole = await request(`/shipments/${s1.shipment_id}`, { headers: { 'Cookie': otherCustCookie, 'x-role': 'ADMIN' } });
        assert(spoofRole.status === 403, 'Client-supplied role/header cannot override req.principal');

        // Internal staff tests
        let resAgent = await request(`/shipments/${s1.shipment_id}`, { headers: { 'Cookie': agentCookie } });
        assert(resAgent.status === 200, 'Authorized shipment.read role (SUPPORT_AGENT) -> 200');

        // Data Validation tests
        const data = resOwner.data.data;
        assert(data.id === s1.shipment_id, 'Correct shipment ID');
        assert(data.carrier === s1.carrier, 'Correct carrier');
        assert(data.tracking_number === s1.tracking_number, 'Correct tracking_number');
        assert(data.status === s1.status, 'Correct shipment status');
        assert(data.password_hash === undefined, 'No password_hash leakage');

        // Edge case input tests
        let resBadId = await request(`/shipments/not-a-uuid`, { headers: { 'Cookie': agentCookie } });
        assert(resBadId.status === 400, 'Malformed UUID -> 400');

        let resNonexistent = await request(`/shipments/d0000000-0000-4000-8000-999999999999`, { headers: { 'Cookie': agentCookie } });
        assert(resNonexistent.status === 404, 'Valid nonexistent shipment -> 404');

    } catch (e) {
        console.error(e);
        failed++;
    } finally {
        if (server) server.close();
        await pool.end();
    }

    if (failed === 0) {
        console.log("\n[SUCCESS] All Shipment API tests passed.");
    } else {
        console.log(`\n[FAILED] ${failed} tests failed.`);
        process.exit(1);
    }
}

runTests();
