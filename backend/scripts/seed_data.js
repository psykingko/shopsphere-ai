const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { DeterministicSeeder } = require('./seed/utils');
const dicts = require('./seed/dictionaries');

// Ensure environment variables are loaded via --env-file in Node 20+

// Configuration
const DB_NAME = process.env.DB_NAME;
const SEED = process.env.SEED || '12345';
const CUSTOMERS_COUNT = parseInt(process.env.CUSTOMERS || '1000', 10);
const PRODUCTS_COUNT = parseInt(process.env.PRODUCTS || '200', 10);
const ORDERS_COUNT = parseInt(process.env.ORDERS || '3000', 10);
const TICKETS_COUNT = parseInt(process.env.TICKETS || '500', 10);

const isReset = process.argv.includes('--reset') || process.env.RESET_DB === 'true';

async function seedData() {
    console.log(`Starting Seed Data Process...`);
    console.log(`Database: ${DB_NAME}`);
    console.log(`Seed Value: ${SEED}`);
    
    if (isReset) {
        if (DB_NAME !== 'shopsphere_dev') {
            console.error(`ERROR: Destructive reset requested but DB_NAME is '${DB_NAME}', not 'shopsphere_dev'. Aborting.`);
            process.exit(1);
        }
        console.warn(`WARNING: --reset flag detected. Will clear synthetic data from ${DB_NAME}.`);
    }

    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: DB_NAME || 'shopsphere_dev',
        user: process.env.DB_USER || 'shopsphere_app',
        password: process.env.DB_PASSWORD || '0000',
    });

    const client = await pool.connect();
    const seeder = new DeterministicSeeder(SEED);

    // Track generated IDs for relationships
    const ids = {
        roles: [],
        users: [],
        customers: [],
        categories: [],
        products: [],
        orders: [],
        tickets: [],
        tasks: [],
        workflows: [],
        documents: [],
        documentVersions: [],
        conversations: []
    };

    // Date range for synthetic data
    const START_DATE = new Date('2023-01-01T00:00:00Z');
    const END_DATE = new Date('2024-01-01T00:00:00Z');

    try {
        await client.query('BEGIN');

        if (isReset) {
            console.log('Resetting synthetic data (TRUNCATE CASCADE)...');
            // Safe application-level truncation
            const tables = [
                'ai_messages', 'ai_conversations',
                'knowledge_chunk_metadata', 'knowledge_document_versions', 'knowledge_documents',
                'audit_events', 'workflow_executions', 'workflows',
                'approval_requests', 'task_assignments', 'tasks',
                'ticket_messages', 'support_tickets',
                'shipments', 'payments', 'order_items', 'orders',
                'products', 'product_categories',
                'customer_addresses', 'customers',
                'users', 'roles'
            ];
            await client.query(`TRUNCATE TABLE ${tables.join(', ')} CASCADE`);
        }

        // ==========================================
        // 1. Roles & Users
        // ==========================================
        console.log('Seeding roles and users...');
        const roles = ['ADMIN', 'SUPPORT_AGENT', 'SUPPORT_MANAGER', 'OPERATIONS'];
        for (const roleName of roles) {
            const id = seeder.uuid();
            await client.query('INSERT INTO roles (id, name) VALUES ($1, $2)', [id, roleName]);
            ids.roles.push({ id, name: roleName });
        }

        // Create 4 explicit demo users for Quick Login
        const demoUsers = [
            { email: 'demo.admin@shopsphere.local', roleName: 'ADMIN' },
            { email: 'demo.manager@shopsphere.local', roleName: 'SUPPORT_MANAGER' },
            { email: 'demo.agent@shopsphere.local', roleName: 'SUPPORT_AGENT' },
            { email: 'demo.operations@shopsphere.local', roleName: 'OPERATIONS' }
        ];

        const validHash = '$2b$10$lOUx/RZLMKScJ37i1Be7yekwsg50f4mUPdwZ49fM2F8RCyYODAcAy'; // password123

        for (const demoUser of demoUsers) {
            const id = seeder.uuid();
            const role = ids.roles.find(r => r.name === demoUser.roleName);
            await client.query(
                'INSERT INTO users (id, email, password_hash, role_id, active) VALUES ($1, $2, $3, $4, $5)',
                [id, demoUser.email, validHash, role.id, true]
            );
            ids.users.push(id);
        }

        // Create 6 additional deterministic test users
        for (let i = 0; i < 6; i++) {
            const id = seeder.uuid();
            const role = seeder.choice(ids.roles);
            const email = `user${i}@shop.internal`;
            await client.query(
                'INSERT INTO users (id, email, password_hash, role_id, active) VALUES ($1, $2, $3, $4, $5)',
                [id, email, validHash, role.id, true]
            );
            ids.users.push(id);
        }

        // ==========================================
        // 2. Customers & Addresses
        // ==========================================
        console.log(`Seeding ${CUSTOMERS_COUNT} customers and their addresses...`);
        let customerBatch = [];
        let addressBatch = [];
        for (let i = 0; i < CUSTOMERS_COUNT; i++) {
            const id = seeder.uuid();
            const firstName = seeder.choice(dicts.firstNames);
            const lastName = seeder.choice(dicts.lastNames);
            const email = `customer_${i}_${firstName.toLowerCase()}@example.test`;
            
            customerBatch.push([id, firstName, lastName, email, null, null]);
            ids.customers.push(id);

            // 0 to 2 addresses
            const numAddresses = seeder.randInt(0, 2);
            for (let j = 0; j < numAddresses; j++) {
                const addrId = seeder.uuid();
                const street = `${seeder.randInt(100, 9999)} ${seeder.choice(dicts.streets)}`;
                const city = seeder.choice(dicts.cities);
                const zip = seeder.randInt(10000, 99999).toString();
                const country = seeder.choice(dicts.countries);
                addressBatch.push([addrId, id, street, city, zip, country, null]);
            }
        }
        await batchInsert(client, 'customers', ['id', 'first_name', 'last_name', 'email', 'phone', 'deleted_at'], customerBatch);
        await batchInsert(client, 'customer_addresses', ['id', 'customer_id', 'street', 'city', 'zip', 'country', 'deleted_at'], addressBatch);

        // ==========================================
        // 3. Product Categories & Products
        // ==========================================
        console.log(`Seeding categories and ${PRODUCTS_COUNT} products...`);
        const catNames = ['Electronics', 'Home & Office', 'Accessories', 'Audio', 'Computing'];
        for (const cat of catNames) {
            const id = seeder.uuid();
            await client.query('INSERT INTO product_categories (id, name, description, active) VALUES ($1, $2, $3, $4)', [id, cat, `Synthetic category for ${cat}`, true]);
            ids.categories.push(id);
        }

        let productBatch = [];
        for (let i = 0; i < PRODUCTS_COUNT; i++) {
            const id = seeder.uuid();
            const sku = `SKU-${i}-${seeder.randInt(1000, 9999)}`;
            const adj = seeder.choice(dicts.productAdjectives);
            const noun = seeder.choice(dicts.productNouns);
            const name = `${adj} ${noun}`;
            const price = Math.round(seeder.randFloat(10, 500) * 100) / 100;
            const stock = seeder.randInt(0, 1000);
            const catId = seeder.choice(ids.categories);
            
            productBatch.push([id, sku, name, `Synthetic description for ${name}`, price, stock, catId, true]);
            ids.products.push({ id, price });
        }
        await batchInsert(client, 'products', ['id', 'sku', 'name', 'description', 'price', 'stock_quantity', 'category_id', 'active'], productBatch);

        // ==========================================
        // 4. Orders, Items, Payments, Shipments
        // ==========================================
        console.log(`Seeding ${ORDERS_COUNT} orders (and related items/payments/shipments)...`);
        let orderBatch = [];
        let orderItemBatch = [];
        let paymentBatch = [];
        let shipmentBatch = [];
        const orderStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'REFUNDED'];

        for (let i = 0; i < ORDERS_COUNT; i++) {
            const orderId = seeder.uuid();
            const customerId = seeder.choice(ids.customers);
            const businessId = `ORD-${100000 + i}`;
            const status = seeder.choice(orderStatuses);
            const createdAt = seeder.date(START_DATE, END_DATE);

            const numItems = seeder.randInt(1, 5);
            let totalAmount = 0;

            for (let j = 0; j < numItems; j++) {
                const itemId = seeder.uuid();
                const product = seeder.choice(ids.products);
                const qty = seeder.randInt(1, 3);
                totalAmount += (product.price * qty);
                orderItemBatch.push([itemId, orderId, product.id, qty, product.price]);
            }
            // fix float precision issues
            totalAmount = Math.round(totalAmount * 100) / 100;

            orderBatch.push([orderId, businessId, customerId, totalAmount, status, createdAt]);
            ids.orders.push(orderId);

            // Seed Payments realistically based on status
            let paymentStatus = 'PENDING';
            if (['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status)) paymentStatus = 'COMPLETED';
            if (['CANCELLED', 'REFUNDED', 'RETURN_REQUESTED'].includes(status)) paymentStatus = seeder.choice(['REFUNDED', 'FAILED']);
            
            const paymentId = seeder.uuid();
            paymentBatch.push([paymentId, orderId, totalAmount, paymentStatus, `txn_${paymentId.substring(0,8)}`]);

            // Seed shipments if past PENDING
            if (['SHIPPED', 'DELIVERED', 'RETURN_REQUESTED'].includes(status)) {
                const shipmentId = seeder.uuid();
                let shipStatus = status === 'DELIVERED' ? 'DELIVERED' : seeder.choice(['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'EXCEPTION']);
                shipmentBatch.push([shipmentId, orderId, 'SyntheticCarrier', `TRK-${seeder.randInt(10000, 99999)}`, shipStatus, null]);
            }
        }
        await batchInsert(client, 'orders', ['id', 'business_id', 'customer_id', 'total_amount', 'status', 'created_at'], orderBatch);
        await batchInsert(client, 'order_items', ['id', 'order_id', 'product_id', 'quantity', 'unit_price'], orderItemBatch);
        await batchInsert(client, 'payments', ['id', 'order_id', 'amount', 'status', 'gateway_reference'], paymentBatch);
        await batchInsert(client, 'shipments', ['id', 'order_id', 'carrier', 'tracking_number', 'status', 'estimated_delivery'], shipmentBatch);

        // ==========================================
        // 5. Support Tickets & Messages
        // ==========================================
        console.log(`Seeding ${TICKETS_COUNT} support tickets...`);
        let ticketBatch = [];
        let messageBatch = [];
        const ticketStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED'];
        const ticketPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        const categories = ['Shipping', 'Billing', 'Product Issue', 'General Inquiry'];

        for (let i = 0; i < TICKETS_COUNT; i++) {
            const ticketId = seeder.uuid();
            const businessId = `TKT-${10000 + i}`;
            const customerId = seeder.choice(ids.customers);
            const hasOrder = seeder.randInt(0, 1) === 1;
            const orderId = hasOrder ? seeder.choice(ids.orders) : null;
            const isAssigned = seeder.randInt(0, 1) === 1;
            const assigneeId = isAssigned ? seeder.choice(ids.users) : null;
            const status = seeder.choice(ticketStatuses);
            
            ticketBatch.push([
                ticketId, businessId, customerId, orderId, assigneeId,
                `Synthetic Issue ${i}`, seeder.choice(categories), seeder.choice(ticketPriorities), status
            ]);
            ids.tickets.push(ticketId);

            const numMsgs = seeder.randInt(1, 4);
            let msgTime = seeder.date(START_DATE, END_DATE);
            for (let j = 0; j < numMsgs; j++) {
                const msgId = seeder.uuid();
                const sender = seeder.choice(['CUSTOMER', 'AGENT', 'AI']);
                messageBatch.push([msgId, ticketId, sender, `Synthetic ticket content ${j}`, msgTime]);
                msgTime = new Date(msgTime.getTime() + seeder.randInt(10000, 86400000));
            }
        }
        await batchInsert(client, 'support_tickets', ['id', 'business_id', 'customer_id', 'order_id', 'assigned_user_id', 'subject', 'category', 'priority', 'status'], ticketBatch);
        await batchInsert(client, 'ticket_messages', ['id', 'ticket_id', 'sender_type', 'content', 'created_at'], messageBatch);

        // ==========================================
        // 6. Tasks, Workflows, Knowledge, AI
        // ==========================================
        console.log(`Seeding auxiliary operations data (tasks, workflows, knowledge, ai)...`);
        
        let taskBatch = [];
        let taskAssignBatch = [];
        for (let i = 0; i < 50; i++) {
            const taskId = seeder.uuid();
            taskBatch.push([taskId, `TSK-${i}`, `Task ${i}`, `Desc ${i}`, 'MEDIUM', 'TODO', 'SYSTEM', null, null]);
            taskAssignBatch.push([seeder.uuid(), taskId, seeder.choice(ids.users), seeder.date(START_DATE, END_DATE), null, true]);
        }
        await batchInsert(client, 'tasks', ['id', 'business_id', 'title', 'description', 'priority', 'status', 'creator_type', 'related_entity_type', 'related_entity_id'], taskBatch);
        await batchInsert(client, 'task_assignments', ['id', 'task_id', 'user_id', 'assigned_at', 'unassigned_at', 'active_flag'], taskAssignBatch);

        let wfBatch = [];
        let wfExecBatch = [];
        for (let i = 0; i < 5; i++) {
            const wfId = seeder.uuid();
            wfBatch.push([wfId, `Synthetic Workflow ${i}`, 'Desc', 'ACTIVE']);
            wfExecBatch.push([seeder.uuid(), wfId, 'COMPLETED', seeder.date(START_DATE, END_DATE), null, null]);
        }
        await batchInsert(client, 'workflows', ['id', 'name', 'description', 'status'], wfBatch);
        await batchInsert(client, 'workflow_executions', ['id', 'workflow_id', 'status', 'started_at', 'completed_at', 'execution_log'], wfExecBatch);

        let docBatch = [];
        let docVerBatch = [];
        let chunkBatch = [];
        for (let i = 1; i <= 3; i++) {
            const docId = seeder.uuid();
            docBatch.push([docId, `Synthetic Policy ${i}`, 'Policy', 'Legal', 'PUBLISHED']);
            ids.documents.push(docId);
            
            // Generate multiple actual versions
            const numVersions = seeder.randInt(1, 3);
            for (let v = 1; v <= numVersions; v++) {
                const verId = seeder.uuid();
                const ts = seeder.date(START_DATE, END_DATE);
                docVerBatch.push([
                    verId, docId, v, 
                    `hash_${docId.substring(0,6)}_${v}`, 
                    ts, null, 
                    v === numVersions ? 'PUBLISHED' : 'ARCHIVED', 
                    `/docs/policy_${i}_v${v}.md`, ts
                ]);
                
                // chunks
                for(let c = 0; c < 2; c++) {
                    chunkBatch.push([seeder.uuid(), verId, c, seeder.uuid()]); // deterministic UUID for qdrant_point_id
                }
            }
        }
        await batchInsert(client, 'knowledge_documents', ['id', 'title', 'document_type', 'department', 'status'], docBatch);
        await batchInsert(client, 'knowledge_document_versions', ['id', 'document_id', 'version_number', 'content_hash', 'effective_date', 'expiration_date', 'status', 'source_path', 'created_at'], docVerBatch);
        await batchInsert(client, 'knowledge_chunk_metadata', ['id', 'version_id', 'chunk_index', 'qdrant_point_id'], chunkBatch);

        let aiConvBatch = [];
        let aiMsgBatch = [];
        for(let i=0; i < 10; i++) {
            const convId = seeder.uuid();
            aiConvBatch.push([convId, seeder.choice(ids.customers), seeder.date(START_DATE, END_DATE), 'CLOSED']);
            aiMsgBatch.push([seeder.uuid(), convId, 'user', 'Hello']);
            aiMsgBatch.push([seeder.uuid(), convId, 'ai', 'Synthetic reply']);
        }
        await batchInsert(client, 'ai_conversations', ['id', 'customer_id', 'started_at', 'status'], aiConvBatch);
        await batchInsert(client, 'ai_messages', ['id', 'conversation_id', 'role', 'content'], aiMsgBatch);

        // Audits / Approvals
        let approvalBatch = [];
        let auditBatch = [];
        for (let i = 0; i < 20; i++) {
            const appId = seeder.uuid();
            approvalBatch.push([appId, 'Synthetic Action', seeder.choice(ids.users), 'USER', 'order', seeder.choice(ids.orders), 'LOW', null, 'APPROVED', seeder.choice(ids.users), seeder.date(START_DATE, END_DATE), null, null, null, null]);
            
            const auditId = seeder.uuid();
            auditBatch.push([auditId, `req_${i}`, 'USER', seeder.choice(ids.users), 'Action', 'order', seeder.choice(ids.orders), '{"key":"value"}', null, seeder.date(START_DATE, END_DATE), appId]);
        }
        await batchInsert(client, 'approval_requests', ['id', 'requested_action', 'requesting_user_id', 'requesting_actor_type', 'target_entity_type', 'target_entity_id', 'risk_level', 'decision_rationale', 'status', 'reviewer_id', 'created_at', 'reviewed_at', 'expiration_timestamp', 'rejection_reason', 'execution_result_summary'], approvalBatch);
        await batchInsert(client, 'audit_events', ['id', 'request_id', 'actor_type', 'actor_id', 'action', 'entity_type', 'entity_id', 'sanitized_input', 'result_summary', 'timestamp', 'approval_request_id'], auditBatch);

        // ==========================================
        // Commit
        // ==========================================
        await client.query('COMMIT');
        console.log(`Seed Data successfully inserted.`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Seed Data failed! Rolling back transaction.');
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

/**
 * Batch insert helper to avoid parameter limits (chunks of 1000 rows).
 */
async function batchInsert(client, table, columns, rows) {
    if (rows.length === 0) return;
    
    const CHUNK_SIZE = 1000; 
    
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        
        let valuesStr = [];
        let params = [];
        let paramIndex = 1;
        
        for (const row of chunk) {
            let rowIdxs = [];
            for (const val of row) {
                rowIdxs.push(`$${paramIndex++}`);
                params.push(val);
            }
            valuesStr.push(`(${rowIdxs.join(', ')})`);
        }
        
        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuesStr.join(', ')}`;
        await client.query(sql, params);
    }
}

seedData();
