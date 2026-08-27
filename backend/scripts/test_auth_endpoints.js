const http = require('http');

async function makeRequest(options, postData = null, cookie = null) {
    return new Promise((resolve, reject) => {
        if (cookie) {
            options.headers = options.headers || {};
            options.headers['Cookie'] = cookie;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try {
                    parsed = JSON.parse(data);
                } catch(e) {}
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: parsed
                });
            });
        });

        req.on('error', reject);

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function runTests() {
    console.log('--- TESTING NEW AUTH ENDPOINTS ---');
    
    // Start the app internally or require it
    const app = require('../src/app');
    const server = http.createServer(app);
    
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;

    try {
        // 1. Session without cookie -> 401
        let res = await makeRequest({
            hostname: 'localhost',
            port,
            path: '/api/v1/auth/session',
            method: 'GET'
        });
        console.log('1. No cookie GET /session: Status', res.statusCode);
        if (res.statusCode !== 401) throw new Error('Expected 401');

        // 2. Login
        const loginData = JSON.stringify({ email: 'admin@shopsphere.local', password: 'password123' });
        res = await makeRequest({
            hostname: 'localhost',
            port,
            path: '/api/v1/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        }, loginData);
        
        console.log('2. Login: Status', res.statusCode);
        const setCookie = res.headers['set-cookie'];
        if (!setCookie) throw new Error('No cookie received');
        const tokenCookie = setCookie[0].split(';')[0];
        
        // 3. Session with cookie -> 200
        res = await makeRequest({
            hostname: 'localhost',
            port,
            path: '/api/v1/auth/session',
            method: 'GET'
        }, null, tokenCookie);
        console.log('3. Valid cookie GET /session: Status', res.statusCode, 'Authenticated:', res.body.authenticated);
        if (res.statusCode !== 200 || !res.body.authenticated) throw new Error('Expected 200 authenticated');

        // 4. Logout
        res = await makeRequest({
            hostname: 'localhost',
            port,
            path: '/api/v1/auth/logout',
            method: 'POST'
        }, null, tokenCookie);
        console.log('4. Logout: Status', res.statusCode);
        const clearCookie = res.headers['set-cookie'];
        if (!clearCookie || !clearCookie[0].includes('Expires')) {
            console.log(clearCookie);
            throw new Error('Did not receive expire cookie header');
        }

        console.log('\n--- ALL AUTH TESTS PASSED ---');
    } catch (e) {
        console.error('TEST FAILED:', e);
        process.exit(1);
    } finally {
        server.close();
    }
}

runTests();
