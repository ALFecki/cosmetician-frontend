import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import { once } from 'node:events';
import { test } from 'node:test';
import { createPreviewServer } from './server.mjs';

const originalRequest = http.request;
const origin = 'http://localhost:4300';
function request(server, path, method = 'GET', body, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = originalRequest(
            {
                hostname: '127.0.0.1',
                port: server.address().port,
                path,
                method,
                agent: false,
                headers: {
                    Origin: origin,
                    ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(JSON.stringify(body)) } : {}),
                    ...headers,
                },
            },
            res => {
                let text = '';
                res.on('data', chunk => (text += chunk));
                res.on('end', () =>
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        text,
                        data: res.headers['content-type']?.includes('application/json') ? JSON.parse(text) : null,
                    }),
                );
            },
        );
        req.on('error', reject);
        req.end(body ? JSON.stringify(body) : undefined);
    });
}
async function serverFor(t) {
    const server = createPreviewServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    return server;
}
async function login(server) {
    const response = await request(server, '/api/login', 'POST', {
        email: 'preview@example.test',
        password: createHash('md5').update('Preview123!').digest('hex'),
    });
    assert.equal(response.status, 200);
    assert.equal(response.data.claims.is_admin, false);
    return { Cookie: response.headers['set-cookie'][0].split(';')[0], 'X-CSRF-Token': response.data.claims.csrf_token };
}

test('serves sanitized public catalog, absolute public images and 340 genuine placements', async t => {
    const server = await serverFor(t);
    const products = await request(server, '/api/product?limit=1000');
    assert.equal(products.status, 200);
    assert.equal(products.data.data.length, 191);
    assert.match(products.data.data[0].image, /^https:\/\/skviderm.by\/api\/images\//);
    assert.doesNotMatch(products.text, /cost_?price|password|csrf_token/i);
    const placements = await request(server, '/api/post_placements');
    assert.equal(placements.data.data.length, 340);
    assert.equal(placements.data.data[0].number, 1);
    assert.match(placements.data.data[0].address, /Монтажников/);
    const id = products.data.data[0].brandId;
    const filtered = await request(server, `/api/product?brandId=${id}&limit=1000`);
    assert.ok(filtered.data.data.length > 0);
    assert.ok(filtered.data.data.every(p => p.brandId === id));
});

test('unknown writes and dangerous GET routes fail closed without outgoing production forwarding', async t => {
    const server = await serverFor(t);
    let forwarded = 0;
    const deny = () => {
        forwarded++;
        throw new Error('Outbound request forbidden');
    };
    t.mock.method(globalThis, 'fetch', deny);
    t.mock.method(http, 'request', deny);
    t.mock.method(https, 'request', deny);
    for (const [method, path] of [
        ['POST', '/api/product'],
        ['PATCH', '/api/brand/1'],
        ['DELETE', '/api/person/real-user'],
        ['GET', '/api/email/send_status_update?to=real@example.com'],
        ['GET', '/api/maintenance/enable'],
        ['GET', '/api/unknown?url=https://skviderm.by/api/order'],
        ['GET', 'https://skviderm.by/api/order'],
    ]) {
        assert.equal((await request(server, path, method, method === 'GET' ? undefined : {})).status, 404, `${method} ${path}`);
    }
    assert.equal(forwarded, 0);
});

test('derived public routes accept only explicit API paths and reject inherited property names', async t => {
    const server = await serverFor(t);
    for (const path of ['/foo/country', '/foo/product_scope', '/foo/product_type', '/api/toString', '/api/constructor', '/api/__proto__']) {
        assert.equal((await request(server, path)).status, 404, path);
    }
    for (const path of ['/api/country', '/api/product_scope', '/api/product_type']) {
        const response = await request(server, path);
        assert.equal(response.status, 200, path);
        assert.ok(response.data.data.length > 0, path);
    }
});

test('requires local origin, authentication and CSRF before changing account or order', async t => {
    const server = await serverFor(t);
    assert.equal((await request(server, '/api/product', 'GET', undefined, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await request(server, '/api/order/person/checkout')).status, 401);
    assert.equal((await request(server, '/api/check_auth')).status, 401);
    assert.equal((await request(server, '/api/login', 'POST', { email: 'real@example.com', password: 'wrong' })).status, 401);
    const headers = await login(server);
    assert.equal(
        (await request(server, '/api/person/preview-person', 'PATCH', { firstName: 'Test' }, { Cookie: headers.Cookie })).status,
        403,
    );
    assert.equal((await request(server, '/api/product')).headers['access-control-allow-origin'], origin);
});

test('complete local cart to EuroPost order preserves exact number/address and history', async t => {
    const server = await serverFor(t);
    const headers = await login(server);
    const product = (await request(server, '/api/product?limit=1')).data.data[0];
    const variant = product.variants.find(v => !v.isDeleted);
    const added = await request(server, `/api/order/attach_product/${variant.id}`, 'POST', {}, headers);
    assert.equal(added.status, 200);
    assert.equal(added.data.products[0].quantity, 1);
    const quantity = await request(server, '/api/order/batch-quantity', 'PUT', { variants: { [variant.id]: 2 } }, headers);
    assert.equal(quantity.data.data.products[0].quantity, 2);
    assert.equal(quantity.data.data.totalPrice, Math.round(variant.price * 2 * 100) / 100);
    const placement = (await request(server, '/api/post_placements')).data.data[3];
    const deliveryPostAddress = `Отделение №${placement.number} - ${placement.address}`;
    const update = await request(
        server,
        `/api/order/${added.data.id}`,
        'PATCH',
        { deliveryMethod: 'post', deliveryPostAddress, paymentMethod: 'card', isCourierDelivery: false, deliveryCost: 0 },
        headers,
    );
    assert.equal(update.status, 200);
    const checked = await request(server, '/api/order/person/checkout?withPayment=false', 'GET', undefined, headers);
    assert.equal(checked.status, 200);
    assert.equal(checked.data.status, 'Checked');
    assert.equal(checked.data.deliveryPostAddress, deliveryPostAddress);
    const history = await request(server, '/api/order_minimal?personId=preview-person', 'GET', undefined, headers);
    assert.equal(history.data.data.length, 1);
    const detail = await request(server, `/api/order/${checked.data.id}`, 'GET', undefined, headers);
    assert.equal(detail.data.data.deliveryPostAddress, deliveryPostAddress);
    assert.equal((await request(server, `/api/order_minimal/${checked.data.id}`, 'PATCH', { status: 'Completed' }, headers)).status, 404);
    assert.equal((await request(server, '/api/order/person/last_non_checked', 'GET', undefined, headers)).data.data, null);
    assert.equal((await request(server, '/api/order/person/checkout', 'GET', undefined, headers)).status, 400);
    const freshServer = await serverFor(t);
    const freshHeaders = await login(freshServer);
    assert.deepEqual((await request(freshServer, '/api/order_minimal', 'GET', undefined, freshHeaders)).data.data, []);
});

test('sandbox payment never returns a gateway URL and email routes remain local', async t => {
    const server = await serverFor(t);
    const headers = await login(server);
    const product = (await request(server, '/api/product?limit=1')).data.data[0];
    const added = await request(server, `/api/order/attach_product/${product.variants[0].id}`, 'POST', {}, headers);
    await request(server, '/api/order/person/checkout?withPayment=true', 'GET', undefined, headers);
    const paid = await request(server, '/api/payments/process', 'POST', { id: added.data.id }, headers);
    assert.equal(paid.status, 200);
    assert.match(paid.data.formUrl, /^http:\/\/localhost:4301\/sandbox-payment$/);
    assert.match((await request(server, '/sandbox-payment')).text, /Тестовая оплата/);
    assert.equal((await request(server, '/api/forgot_password?email=real@example.com')).status, 400);
    assert.equal((await request(server, '/api/verify_email', 'GET', undefined, headers)).data.code, '123456');
});
