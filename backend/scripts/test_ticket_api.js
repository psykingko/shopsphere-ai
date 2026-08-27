const http = require('http');
const { Pool } = require('pg');
const app = require('../src/app');

// Configuration
const PORT = 3004;
const BASE_URL = `http://localhost:${PORT}`;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'shopsphere_dev',
    user: process.env.DB_USER || 'shopsphere_app',
    password: process.env.DB_PASSWORD || '0000',
});

let server;
let adminToken, customer1Token, customer2Token;
let customer1Id, customer2Id, orderId1;
let existingTicketId;

async function setup() {
    return new Promise((resolve) => {
        server = http.createServer(app);
        server.listen(PORT, async () => {
            console.log(`Test server running on port ${PORT}`);

            // Fetch testing context
            const adminRes = await pool.query(`SELECT u.id, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'ADMIN' LIMIT 1`);
            const adminUser = adminRes.rows[0];

            const customerRes = await pool.query(`SELECT id, email FROM customers LIMIT 2`);
            customer1Id = customerRes.rows[0].id;
            customer2Id = customerRes.rows[1].id;

            const orderRes = await pool.query(`SELECT id FROM orders WHERE customer_id = $1 LIMIT 1`, [customer1Id]);
            orderId1 = orderRes.rows[0] ? orderRes.rows[0].id : null;

            const ticketRes = await pool.query(`SELECT id FROM support_tickets WHERE customer_id = $1 LIMIT 1`, [customer1Id]);
            existingTicketId = ticketRes.rows[0].id;

            // Generate JWTs (Bypassing POST /login for speed, directly signing test tokens)
            const jwt = require('jsonwebtoken');
            const SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_12345';
            
            adminToken = jwt.sign({ 
                principal_id: adminUser.id, 
                principal_type: 'USER', 
                role: adminUser.role,
                email: adminUser.email 
            }, SECRET, { expiresIn: '1h' });

            customer1Token = jwt.sign({ 
                principal_id: customer1Id, 
                principal_type: 'CUSTOMER', 
                role: 'CUSTOMER',
                email: customerRes.rows[0].email 
            }, SECRET, { expiresIn: '1h' });

            customer2Token = jwt.sign({ 
                principal_id: customer2Id, 
                principal_type: 'CUSTOMER', 
                role: 'CUSTOMER',
                email: customerRes.rows[1].email 
            }, SECRET, { expiresIn: '1h' });

            resolve();
        });
    });
}

async function teardown() {
    return new Promise((resolve) => {
        server.close(async () => {
            await pool.end();
            console.log('Test server shut down.');
            resolve();
        });
    });
}

function makeRequest(method, path, token, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const reqHeaders = {
            'Content-Type': 'application/json',
            ...headers
        };
        if (token) {
            reqHeaders['Cookie'] = `token=${token}`; // Assuming auth middleware looks for 'token' cookie or Authorization header. We will use Cookie as implemented in authMiddleware (wait, the prompt says req.principal comes from cookie/header. We'll use Authorization).
            reqHeaders['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            method,
            headers: reqHeaders
        };

        const req = http.request(`${BASE_URL}${path}`, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try { parsed = data ? JSON.parse(data) : null; } catch (e) { parsed = data; }
                resolve({ status: res.statusCode, body: parsed });
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            failed++;
        }
    }

    try {
        await setup();

        // 1. Authentication
        let res = await makeRequest('GET', '/api/v1/tickets', null);
        assert(res.status === 401, 'Unauthenticated GET /tickets returns 401');

        // 2. Customer Isolation
        res = await makeRequest('GET', '/api/v1/tickets', customer1Token);
        assert(res.status === 200, 'Customer 1 can list tickets');
        assert(res.body.data.every(t => t.customer_id === customer1Id), 'Customer 1 ticket list only contains their own tickets');

        res = await makeRequest('GET', `/api/v1/tickets/${existingTicketId}`, customer1Token);
        assert(res.status === 200, 'Customer 1 can fetch their own ticket details');

        res = await makeRequest('GET', `/api/v1/tickets/${existingTicketId}`, customer2Token);
        assert(res.status === 403, 'Customer 2 cannot fetch Customer 1\'s ticket (403)');

        // 3. Admin Access
        res = await makeRequest('GET', `/api/v1/tickets/${existingTicketId}`, adminToken);
        assert(res.status === 200, 'Admin can fetch any ticket');

        // 4. Ticket Creation
        const idempotencyKey = `test-key-${Date.now()}`;
        const createPayload = {
            subject: 'Test issue',
            category: 'General Inquiry',
            priority: 'LOW',
            content: 'Hello, this is a test ticket.',
            order_id: orderId1
        };

        res = await makeRequest('POST', '/api/v1/tickets', customer1Token, createPayload, { 'Idempotency-Key': idempotencyKey });
        assert(res.status === 201, 'Customer 1 can create a ticket with valid payload and idempotency key');
        const createdTicketId = res.body.data.id;
        assert(!!createdTicketId, 'Created ticket has an ID');

        // 5. Idempotency Test
        const resDuplicate = await makeRequest('POST', '/api/v1/tickets', customer1Token, createPayload, { 'Idempotency-Key': idempotencyKey });
        assert(resDuplicate.status === 201, 'Duplicate ticket creation with same key returns original 201 result');
        assert(resDuplicate.body.data.id === createdTicketId, 'Duplicate request returned the exact same ticket ID');

        const conflictingPayload = { ...createPayload, priority: 'HIGH' };
        const resConflict = await makeRequest('POST', '/api/v1/tickets', customer1Token, conflictingPayload, { 'Idempotency-Key': idempotencyKey });
        assert(resConflict.status === 409, 'Conflict payload with same key returns 409 Conflict');

        // 6. Validation
        res = await makeRequest('POST', '/api/v1/tickets', customer1Token, createPayload); // No idempotency key
        assert(res.status === 400, 'Creation without Idempotency-Key returns 400');

        console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
        if (failed > 0) process.exit(1);

    } catch (e) {
        console.error('Test script crashed:', e);
        process.exit(1);
    } finally {
        await teardown();
    }
}

runTests();
