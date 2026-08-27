const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const jwt = require('jsonwebtoken');

// Test utilities
const PORT = 3002;
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
        console.log("=== Starting Product & Catalog API E2E Tests ===");
        
        await new Promise(resolve => {
            server = app.listen(PORT, resolve);
        });

        const activeCatId = 'd0000000-0000-4000-8000-111111111111';
        const inactiveCatId = 'd0000000-0000-4000-8000-222222222222';
        
        const activeProdId = 'e0000000-0000-4000-8000-111111111111';
        const inactiveProdId = 'e0000000-0000-4000-8000-222222222222';
        
        await pool.query(`INSERT INTO product_categories (id, name, description, active) VALUES ($1, 'Active Cat', 'Desc', true) ON CONFLICT DO NOTHING`, [activeCatId]);
        await pool.query(`INSERT INTO product_categories (id, name, description, active) VALUES ($1, 'Inactive Cat', 'Desc', false) ON CONFLICT DO NOTHING`, [inactiveCatId]);
        
        await pool.query(`INSERT INTO products (id, sku, name, description, price, stock_quantity, category_id, active) VALUES ($1, 'SKU-ACT', 'Active Prod', 'Desc', 10.99, 100, $2, true) ON CONFLICT DO NOTHING`, [activeProdId, activeCatId]);
        await pool.query(`INSERT INTO products (id, sku, name, description, price, stock_quantity, category_id, active) VALUES ($1, 'SKU-INA', 'Inactive Prod', 'Desc', 5.99, 0, $2, false) ON CONFLICT DO NOTHING`, [inactiveProdId, activeCatId]);

        const customerCookie = generateCookie('CUSTOMER', 'c0000000-0000-4000-8000-111111111111', 'CUSTOMER');
        const agentCookie = generateCookie('USER', 'u0000000-0000-4000-8000-111111111111', 'SUPPORT_AGENT');

        // 1. Unauthenticated requests -> 401
        let resUnauth = await request('/products');
        assert(resUnauth.status === 401, 'Unauthenticated product list -> 401');
        assert((await request(`/products/${activeProdId}`)).status === 401, 'Unauthenticated product detail -> 401');
        assert((await request('/product-categories')).status === 401, 'Unauthenticated category list -> 401');
        assert((await request(`/product-categories/${activeCatId}`)).status === 401, 'Unauthenticated category detail -> 401');

        // 2. Authenticated CUSTOMER and USER reads -> 200 (No ownership check)
        let resCustProd = await request('/products', { headers: { 'Cookie': customerCookie } });
        assert(resCustProd.status === 200, 'Authenticated CUSTOMER can read products');
        let resUserProd = await request('/products', { headers: { 'Cookie': agentCookie } });
        assert(resUserProd.status === 200, 'Authenticated internal USER can read products');

        let resCustCat = await request('/product-categories', { headers: { 'Cookie': customerCookie } });
        assert(resCustCat.status === 200, 'Authenticated CUSTOMER can read categories');

        // 3. Product List fields & pagination & lifecycle
        assert(resCustProd.data.data.some(p => p.id === activeProdId), 'Product list includes active product');
        assert(!resCustProd.data.data.some(p => p.id === inactiveProdId), 'Product list EXCLUDES inactive product');
        assert(resCustProd.data.total !== undefined, 'Pagination metadata: total exists');
        assert(resCustProd.data.page === 1, 'Pagination metadata: page is 1');
        assert(resCustProd.data.limit === 50, 'Pagination metadata: limit is 50');
        
        let p1 = resCustProd.data.data.find(p => p.id === activeProdId);
        assert(p1.sku === 'SKU-ACT', 'Product response has expected fields (sku)');
        assert(p1.category_id === activeCatId, 'Product response has expected fields (category_id)');

        // 4. Filtering
        let filterRes = await request(`/products?category_id=${activeCatId}`, { headers: { 'Cookie': agentCookie } });
        assert(filterRes.data.data.every(p => p.category_id === activeCatId), 'Category filter works');
        
        let filterInvalid = await request(`/products?category_id=not-a-uuid`, { headers: { 'Cookie': agentCookie } });
        assert(filterInvalid.status === 400, 'Invalid category_id filter rejected');

        // 5. Product Detail
        let pd1 = await request(`/products/${activeProdId}`, { headers: { 'Cookie': agentCookie } });
        assert(pd1.status === 200, 'Existing product returns 200');
        assert(pd1.data.data.sku === 'SKU-ACT', 'Correct product data returned');
        
        let pdInvalid = await request(`/products/not-a-uuid`, { headers: { 'Cookie': agentCookie } });
        assert(pdInvalid.status === 400, 'Malformed UUID returns 400');
        
        let pdInactive = await request(`/products/${inactiveProdId}`, { headers: { 'Cookie': agentCookie } });
        assert(pdInactive.status === 404, 'Inactive product returns 404');
        
        let pdMissing = await request(`/products/c0000000-0000-4000-8000-999999999999`, { headers: { 'Cookie': agentCookie } });
        assert(pdMissing.status === 404, 'Missing product returns 404');

        // 6. Category Detail
        let cd1 = await request(`/product-categories/${activeCatId}`, { headers: { 'Cookie': agentCookie } });
        assert(cd1.status === 200, 'Existing category returns 200');
        
        let cdInactive = await request(`/product-categories/${inactiveCatId}`, { headers: { 'Cookie': agentCookie } });
        assert(cdInactive.status === 404, 'Inactive category returns 404');

        // 7. Security (Spoofing)
        let spoofRes = await request(`/products`, { headers: { 'Cookie': customerCookie, 'x-role': 'ADMIN' } });
        assert(spoofRes.status === 200, 'Spoofing headers ignored, request succeeds purely on trusted cookie');

    } catch (e) {
        console.error(e);
        failed++;
    } finally {
        if (server) server.close();
        await pool.end();
    }

    if (failed === 0) {
        console.log("\n[SUCCESS] All Product API tests passed.");
    } else {
        console.log(`\n[FAILED] ${failed} tests failed.`);
        process.exit(1);
    }
}

runTests();
