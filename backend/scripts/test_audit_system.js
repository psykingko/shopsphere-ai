const http = require('http');
const crypto = require('crypto');
const { pool } = require('../src/config/database');
const auditRepository = require('../src/repositories/auditRepository');
const app = require('../src/app');

const PORT = 3006;

let customerToken;
let CUSTOMER_ID;

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';

function generateToken(principalId, role, principalType = 'USER') {
    return jwt.sign(
        { principal_id: principalId, role, principal_type: principalType },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}

async function setupTestContext() {
    const customerRes = await pool.query(`SELECT id, email FROM customers LIMIT 1`);
    CUSTOMER_ID = customerRes.rows[0].id;
    customerToken = generateToken(CUSTOMER_ID, 'CUSTOMER', 'CUSTOMER');
}

async function request(method, path, token, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: `/api/v1${path}`,
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
                resolve({ statusCode: res.statusCode, body: parsed, headers: res.headers });
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
        await setupTestContext();
        
        server = app.listen(PORT, async () => {
            console.log(`Test server running on port ${PORT}`);

            // -----------------------------------------------------
            // 1. Successful Ticket Creation -> Audit Event
            // -----------------------------------------------------
            const key1 = crypto.randomUUID();
            const payload1 = {
                subject: "Test Audit 1",
                category: "GENERAL",
                priority: "LOW",
                content: "Testing audit trail",
                // Attempting to spoof actor in body
                actor_id: "00000000-0000-0000-0000-000000000000",
                actor_type: "SYSTEM",
                // Sensitive field to test sanitization
                password: "my-super-secret-password",
                card: { pan: "1234567812345678" }
            };

            const res1 = await request('POST', '/tickets', customerToken, payload1, {
                'idempotency-key': key1,
                'x-user-id': '00000000-0000-0000-0000-000000000000', // spoof header
                'x-role': 'ADMIN'
            });

            assert(res1.statusCode === 201, 'Ticket created successfully');
            const ticketId1 = res1.body.data.id;
            const reqId1 = res1.body.correlation_id;

            // Check database for audit event
            const auditRes1 = await pool.query(`SELECT * FROM audit_events WHERE entity_id = $1`, [ticketId1]);
            assert(auditRes1.rowCount === 1, 'Audit event was created for the ticket');
            
            const audit1 = auditRes1.rows[0];
            assert(audit1.action === 'TICKET_CREATED', 'Action is TICKET_CREATED');
            assert(audit1.actor_type === 'USER', 'Actor type is derived from token (USER)');
            assert(audit1.actor_id === CUSTOMER_ID, 'Actor ID is derived from token');
            assert(audit1.entity_type === 'support_ticket', 'Entity type is correct');
            assert(audit1.request_id === reqId1, 'Correlation ID matches');
            
            // Check sanitization (controller strips them or auditService redacts them)
            const sanitized = audit1.sanitized_input;
            assert(sanitized.password === undefined || sanitized.password === '[REDACTED]', 'Password was not persisted');
            assert(sanitized.card === undefined || sanitized.card.pan === '[REDACTED]', 'Nested card pan was not persisted');
            assert(sanitized.actor_id === undefined || sanitized.actor_id !== '00000000-0000-0000-0000-000000000000', 'Spoof attempt was not used for actual actor_id');

            // -----------------------------------------------------
            // 2. Idempotent Replay -> No duplicate audit event
            // -----------------------------------------------------
            const res1_replay = await request('POST', '/tickets', customerToken, payload1, {
                'idempotency-key': key1
            });
            assert(res1_replay.statusCode === 201, 'Idempotent replay successful');
            assert(res1_replay.body.data.id === ticketId1, 'Replay returned original ticket');
            
            const auditRes1_replay = await pool.query(`SELECT * FROM audit_events WHERE entity_id = $1`, [ticketId1]);
            assert(auditRes1_replay.rowCount === 1, 'No duplicate audit event created for replay');

            // -----------------------------------------------------
            // 3. Transaction Integrity (Failure Scenario)
            // -----------------------------------------------------
            const originalRecordAuditEvent = auditRepository.recordAuditEvent;
            
            // Mock the repository to throw an error
            auditRepository.recordAuditEvent = async () => {
                throw new Error("Simulated audit persistence failure");
            };

            const key2 = crypto.randomUUID();
            const payload2 = {
                subject: "Test Audit Failure",
                category: "GENERAL",
                priority: "LOW",
                content: "Should rollback"
            };

            const res2 = await request('POST', '/tickets', customerToken, payload2, {
                'idempotency-key': key2
            });

            // Restore original method immediately
            auditRepository.recordAuditEvent = originalRecordAuditEvent;

            assert(res2.statusCode === 500, 'Creation fails with 500 when audit fails');
            
            // Verify NOTHING was persisted
            const ticketRes2 = await pool.query(`SELECT * FROM support_tickets WHERE subject = 'Test Audit Failure'`);
            assert(ticketRes2.rowCount === 0, 'Ticket was rolled back');
            
            const idempotencyRes2 = await pool.query(`SELECT * FROM idempotency_keys WHERE idempotency_key = $1`, [key2]);
            assert(idempotencyRes2.rowCount === 0, 'Idempotency key was rolled back');

            console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
            
            server.close();
            await pool.end();
            process.exit(failed > 0 ? 1 : 0);
        });
    } catch (err) {
        console.error(err);
        if (server) server.close();
        process.exit(1);
    }
}

runTests();
