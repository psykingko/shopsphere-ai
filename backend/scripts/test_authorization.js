
const { requirePermission } = require('../src/middleware/authorization');
const { hasPermission } = require('../src/policies/rbacPolicy');
const { canAccessOrder, canAccessTask } = require('../src/policies/resourcePolicy');
const { canActOnApproval } = require('../src/validators/businessValidation');
const { pool } = require('../src/config/database');

async function runTests() {
    console.log("=== ShopSphere Authorization Tests ===");
    let failed = 0;

    const assert = (condition, msg) => {
        if (condition) {
            console.log(`[PASS] ${msg}`);
        } else {
            console.error(`[FAIL] ${msg}`);
            failed++;
        }
    };

    // 1. Missing principal -> 401
    const mockRes401 = {
        status: (code) => {
            assert(code === 401, "Missing principal returns 401");
            return { json: () => {} };
        }
    };
    requirePermission('ticket.read')({ principal: null }, mockRes401, () => {
        assert(false, "Should not call next() when missing principal");
    });

    // 2. SUPPORT_AGENT cannot approve -> 403
    const mockRes403 = {
        status: (code) => {
            assert(code === 403, "SUPPORT_AGENT without approval.approve returns 403");
            return { json: () => {} };
        }
    };
    requirePermission('approval.approve')({
        principal: { role: 'SUPPORT_AGENT', principal_type: 'USER' }
    }, mockRes403, () => {
        assert(false, "Should not call next() for unauthorized role");
    });

    // 3. SUPPORT_MANAGER can approve -> RBAC PASS
    let calledNext = false;
    requirePermission('approval.approve')({
        principal: { role: 'SUPPORT_MANAGER', principal_type: 'USER' }
    }, {}, () => {
        calledNext = true;
    });
    assert(calledNext, "SUPPORT_MANAGER can access approval.approve route (RBAC pass)");

    // 4. Client spoofing ignored (because middleware only reads req.principal, not req.body)
    const spoofedReq = {
        body: { role: 'ADMIN' }, // Spoofed
        principal: { role: 'SUPPORT_AGENT', principal_type: 'USER' } // Trusted
    };
    requirePermission('approval.approve')(spoofedReq, mockRes403, () => {
        assert(false, "Spoofed req.body.role should not bypass authz");
    });
    assert(true, "Client role spoofing does not modify principal (Middleware strictly uses req.principal)");

    // Resource Authorization Tests (Needs Database)
    console.log("\n=== Resource Authorization Tests ===");
    
    // Seed test data for resource ownership and assignment
    const customerId1 = 'c0000000-0000-4000-8000-000000000001';
    const customerId2 = 'c0000000-0000-4000-8000-000000000002';
    const orderId1 = 'e0000000-0000-4000-8000-000000000001';
    
    const agentId1 = 'a0000000-0000-4000-8000-000000000001';
    const agentId2 = 'a0000000-0000-4000-8000-000000000002';
    const taskId1 = 'f0000000-0000-4000-8000-000000000001';
    
    const approvalId_expired = 'b0000000-0000-4000-8000-000000000001';
    const approvalId_pending = 'b0000000-0000-4000-8000-000000000002';

    // Insert dummy data
    try {
        await pool.query(`INSERT INTO customers (id, first_name, last_name, email) VALUES ($1, 'Test', '1', 'auth_test_c1@shop.com') ON CONFLICT DO NOTHING`, [customerId1]);
        await pool.query(`INSERT INTO customers (id, first_name, last_name, email) VALUES ($1, 'Test', '2', 'auth_test_c2@shop.com') ON CONFLICT DO NOTHING`, [customerId2]);
        await pool.query(`INSERT INTO orders (id, business_id, customer_id, total_amount, status, created_at) VALUES ($1, 'ORD-TEST1', $2, 100, 'PENDING', NOW()) ON CONFLICT DO NOTHING`, [orderId1, customerId1]);
        
        await pool.query(`INSERT INTO tasks (id, business_id, title, status, creator_type, priority) VALUES ($1, 'TSK-TEST1', 'Task', 'TODO', 'USER', 'MEDIUM') ON CONFLICT DO NOTHING`, [taskId1]);
        
        let r_agent = await pool.query(`SELECT id FROM roles WHERE name = 'SUPPORT_AGENT'`);
        let roleId = r_agent.rows[0].id;
        await pool.query(`INSERT INTO users (id, email, password_hash, role_id, active) VALUES ($1, 'a1@shop.internal', 'hash', $2, true) ON CONFLICT DO NOTHING`, [agentId1, roleId]);
        await pool.query(`INSERT INTO users (id, email, password_hash, role_id, active) VALUES ($1, 'a2@shop.internal', 'hash', $2, true) ON CONFLICT DO NOTHING`, [agentId2, roleId]);
        
        const assignmentId = 'd0000000-0000-4000-8000-000000000001';
        await pool.query(`INSERT INTO task_assignments (id, task_id, user_id, assigned_at, active_flag) VALUES ($1, $2, $3, NOW(), true) ON CONFLICT DO NOTHING`, [assignmentId, taskId1, agentId1]);

        await pool.query(`INSERT INTO approval_requests (id, requested_action, requesting_actor_type, target_entity_type, target_entity_id, status, expiration_timestamp, created_at) VALUES ($1, 'REFUND', 'USER', 'ORDER', $2, 'PENDING', NOW() - INTERVAL '1 day', NOW()) ON CONFLICT (id) DO UPDATE SET expiration_timestamp = NOW() - INTERVAL '1 day'`, [approvalId_expired, orderId1]);
        
        await pool.query(`INSERT INTO approval_requests (id, requested_action, requesting_actor_type, target_entity_type, target_entity_id, status, expiration_timestamp, created_at) VALUES ($1, 'REFUND', 'USER', 'ORDER', $2, 'PENDING', NOW() + INTERVAL '1 day', NOW()) ON CONFLICT (id) DO UPDATE SET expiration_timestamp = NOW() + INTERVAL '1 day'`, [approvalId_pending, orderId1]);

        // 5. Customer owns their order
        const pCust1 = { principal_type: 'CUSTOMER', principal_id: customerId1 };
        const pCust2 = { principal_type: 'CUSTOMER', principal_id: customerId2 };
        
        let cust1Access = await canAccessOrder(pCust1, orderId1);
        let cust2Access = await canAccessOrder(pCust2, orderId1);
        assert(cust1Access === true, "Customer 1 can access Order 1 (Ownership)");
        assert(cust2Access === false, "Customer 2 CANNOT access Order 1 (Ownership prevention)");

        // 6. Assignment-based task access
        const pAgent1 = { principal_type: 'USER', principal_id: agentId1, role: 'SUPPORT_AGENT' };
        const pAgent2 = { principal_type: 'USER', principal_id: agentId2, role: 'SUPPORT_AGENT' };

        let agent1Access = await canAccessTask(pAgent1, taskId1);
        let agent2Access = await canAccessTask(pAgent2, taskId1);
        assert(agent1Access === true, "Agent 1 can access Task 1 (Assigned)");
        assert(agent2Access === false, "Agent 2 CANNOT access Task 1 (Not assigned)");

        // 7. Business Invariant check (Separation from RBAC/Resource Auth)
        // Even if ADMIN wants to approve, if it's expired, business validation fails.
        let expiredResult = await canActOnApproval(approvalId_expired);
        let pendingResult = await canActOnApproval(approvalId_pending);
        
        assert(expiredResult.valid === false && expiredResult.reason === 'EXPIRED', "Expired approval is rejected by business validation (even for ADMIN)");
        assert(pendingResult.valid === true, "Pending unexpired approval passes business validation");

        // 8. No CUSTOMER role check
        let rRoles = await pool.query(`SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'role_name' AND e.enumlabel = 'CUSTOMER'`);
        assert(rRoles.rowCount === 0, "No CUSTOMER role exists in the PostgreSQL schema");

    } catch(err) {
        console.error("Test Error:", err);
        failed++;
    } finally {
        await pool.end();
    }

    if (failed === 0) {
        console.log("\n[SUCCESS] All authorization tests passed.");
    } else {
        console.log(`\n[FAILED] ${failed} tests failed.`);
        process.exit(1);
    }
}

runTests();
