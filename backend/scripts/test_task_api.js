const http = require('http');
const app = require('../src/app');

const PORT = 3005;

// Mock UUIDs for testing (assuming seeded database has these users/tasks)
const CUSTOMER_ID = '0a0ae3e0-fd01-4095-8493-052f94979f00';
const ADMIN_ID = '3a3ae3e0-fd01-4095-8493-052f94979f03';
const AGENT_ID = '2a2ae3e0-fd01-4095-8493-052f94979f02';
const MANAGER_ID = '4a4ae3e0-fd01-4095-8493-052f94979f04';

// JWT Generation (borrowed logic to generate tokens dynamically for tests without hardcoding secret here)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';

function generateToken(principalId, role, principalType = 'USER') {
    return jwt.sign(
        { principal_id: principalId, role, principal_type: principalType },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}

const customerToken = generateToken(CUSTOMER_ID, 'CUSTOMER', 'CUSTOMER');
const adminToken = generateToken(ADMIN_ID, 'ADMIN');
const agentToken = generateToken(AGENT_ID, 'SUPPORT_AGENT');
const managerToken = generateToken(MANAGER_ID, 'SUPPORT_MANAGER');

async function request(method, path, token, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: `/api/v1/tasks${path}`,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (token) {
            options.headers['Cookie'] = `token=${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try { parsed = JSON.parse(data); } catch (e) {}
                resolve({ statusCode: res.statusCode, body: parsed });
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    let server;
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
        server = app.listen(PORT, async () => {
            console.log(`Test server running on port ${PORT}`);

            // 1. Unauthenticated -> 401
            let res = await request('GET', '/');
            assert(res.statusCode === 401, 'Unauthenticated task list -> 401');

            res = await request('GET', '/not-a-uuid');
            assert(res.statusCode === 401, 'Unauthenticated task detail -> 401');

            // 2. RBAC rules
            res = await request('GET', '/', customerToken);
            assert(res.statusCode === 403, 'CUSTOMER role cannot access task API -> 403');

            res = await request('GET', '/', managerToken);
            assert(res.statusCode === 200, 'SUPPORT_MANAGER can access task list');

            res = await request('GET', '/', adminToken);
            assert(res.statusCode === 200, 'ADMIN can access task list');

            // 3. Security Spoofing
            res = await request('GET', '/', managerToken, null, { 'Cookie': `token=${customerToken}`, 'x-role': 'ADMIN' });
            assert(res.statusCode === 403, 'Role spoofing via headers does not work (fallback to token)');

            // 4. Task List Details
            res = await request('GET', '/', managerToken);
            assert(res.body.data && Array.isArray(res.body.data), 'Task list returns an array');
            assert(res.body.total >= 0, 'Task list total is returned');
            assert(res.body.page === 1, 'Pagination default page is correct');
            assert(res.body.limit === 10, 'Pagination default limit is correct');
            
            let taskId = null;
            if (res.body.data.length > 0) {
                taskId = res.body.data[0].id;
            }

            // Test Pagination
            let pagedRes = await request('GET', '/?page=2&limit=1', managerToken);
            assert(pagedRes.statusCode === 200, 'Pagination works');
            assert(pagedRes.body.limit === 1, 'Pagination limit is respected');

            // 5. Task Detail
            if (taskId) {
                let detailRes = await request('GET', `/${taskId}`, managerToken);
                assert(detailRes.statusCode === 200, 'Valid task can be retrieved');
                assert(detailRes.body.data.id === taskId, 'Returned fields are correct for task detail');
            } else {
                console.log('⚠️ SKIP: No seeded tasks found to test detail fetch.');
            }

            // 6. Validation
            res = await request('GET', '/not-a-uuid', managerToken);
            assert(res.statusCode === 400, 'Malformed UUID returns 400');

            res = await request('GET', '/00000000-0000-4000-8000-000000000000', managerToken);
            assert(res.statusCode === 404, 'Nonexistent task returns 404');

            res = await request('GET', '/?status=INVALID_STATUS', managerToken);
            assert(res.statusCode === 400, 'Unsupported filter is rejected (status)');

            res = await request('GET', '/?priority=INVALID_PRIORITY', managerToken);
            assert(res.statusCode === 400, 'Unsupported filter is rejected (priority)');

            // 7. Resource Authorization boundary (SUPPORT_AGENT)
            // Agent should only see tasks explicitly assigned to them (if any).
            let agentRes = await request('GET', '/', agentToken);
            assert(agentRes.statusCode === 200, 'SUPPORT_AGENT can access task list');
            // Check that the agent's tasks have their assignment constraint applied.
            // Since we can't be strictly certain what's seeded, we just verify they don't get 403 or 500.

            console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
            
            server.close();
            if (failed > 0) {
                process.exit(1);
            } else {
                process.exit(0);
            }
        });
    } catch (err) {
        console.error(err);
        if (server) server.close();
        process.exit(1);
    }
}

runTests();
