const http = require('http');
const app = require('../src/app');

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
                try { parsed = JSON.parse(data); } catch(e) {}
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: parsed
                });
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function testRole(email, expectedRole, port) {
    console.log(`\nTesting ${email} -> Expecting role: ${expectedRole}`);
    const loginData = JSON.stringify({ email, password: 'password123' });
    const resLogin = await makeRequest({
        hostname: 'localhost',
        port,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    }, loginData);

    if (resLogin.statusCode !== 200) {
        console.error('Login failed:', resLogin.body);
        throw new Error(`Login failed for ${email}`);
    }

    const setCookie = resLogin.headers['set-cookie'];
    if (!setCookie) throw new Error('No cookie received');
    const tokenCookie = setCookie[0].split(';')[0];

    const resSession = await makeRequest({
        hostname: 'localhost',
        port,
        path: '/api/v1/auth/session',
        method: 'GET'
    }, null, tokenCookie);

    const actualRole = resSession.body.principal.role;
    if (actualRole !== expectedRole) {
        throw new Error(`Role mismatch. Expected ${expectedRole}, got ${actualRole}`);
    }
    console.log(`✅ PASS: ${email} -> ${actualRole}`);
}

async function runTests() {
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;

    try {
        await testRole('demo.admin@shopsphere.local', 'ADMIN', port);
        await testRole('demo.manager@shopsphere.local', 'SUPPORT_MANAGER', port);
        await testRole('demo.agent@shopsphere.local', 'SUPPORT_AGENT', port);
        await testRole('demo.operations@shopsphere.local', 'OPERATIONS', port);
        console.log('\nAll role tests passed!');
    } catch (e) {
        console.error('\nFAILED:', e.message);
        process.exit(1);
    } finally {
        server.close();
    }
}

runTests();
