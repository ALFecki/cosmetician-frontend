import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

export const PREVIEW_ORIGIN = 'http://localhost:4300';
export const PREVIEW_ACCOUNT = { email: 'preview@example.test', password: 'Preview123!' };
const passwordHash = createHash('md5').update(PREVIEW_ACCOUNT.password).digest('hex');
const names = ['product', 'brand', 'category', 'banner', 'post_placements'];
const fixtures = Object.fromEntries(
    names.map(name => [name, JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)))]),
);

function publicImages(value) {
    if (Array.isArray(value)) return value.map(publicImages);
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, publicImages(item)]));
    if (typeof value === 'string' && value.startsWith('/images/')) return `https://skviderm.by/api${value}`;
    return value;
}
const catalog = publicImages(fixtures);
const ok = data => ({ status: 'success', data });
const list = data => ({ ...ok(data), length: data.length });
function fail(status, message) {
    return Object.assign(new Error(message), { status });
}
function now() {
    return new Date().toISOString();
}

function productList(params) {
    let products = catalog.product.data.filter(p => !p.isDeleted);
    const title = params.get('title')?.toLocaleLowerCase();
    if (title) products = products.filter(p => `${p.title} ${p.fullTitle}`.toLocaleLowerCase().includes(title));
    for (const [filter, field] of [
        ['brandId', 'brandId'],
        ['productTypeId', 'productTypeId'],
    ]) {
        const ids = params.getAll(filter).flatMap(value => value.split(','));
        if (ids.length) products = products.filter(p => ids.includes(p[field]));
    }
    for (const [filter, field] of [
        ['categoryId', 'categories'],
        ['productScopeId', 'productScopes'],
        ['countryId', 'countries'],
    ]) {
        const ids = params.getAll(filter).flatMap(value => value.split(','));
        if (ids.length) products = products.filter(p => p[field]?.some(item => ids.includes(item.id)));
    }
    for (const [filter, field, minimum] of [
        ['minPrice', 'price', true],
        ['maxPrice', 'price', false],
        ['minVolume', 'volume', true],
        ['maxVolume', 'volume', false],
    ]) {
        if (params.has(filter))
            products = products.filter(p =>
                p.variants.some(
                    v => !v.isDeleted && (minimum ? v[field] >= Number(params.get(filter)) : v[field] <= Number(params.get(filter))),
                ),
            );
    }
    if (['true', '1'].includes(params.get('hasPromotion')))
        products = products.filter(p => p.promotions?.some(promotion => promotion.isActive));
    const sort = params.get('sort') || '';
    if (sort.includes('price'))
        products.sort((a, b) => Math.min(...a.variants.map(v => v.price)) - Math.min(...b.variants.map(v => v.price)));
    if (sort.includes('title')) products.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    if (sort.includes('createdAt')) products.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (sort.includes('desc') || sort.startsWith('-')) products.reverse();
    const length = products.length;
    const limit = Math.max(1, Math.min(1000, Number(params.get('limit')) || 1000));
    const page = Math.max(1, Number(params.get('page')) || 1);
    return { ...list(products.slice((page - 1) * limit, page * limit)), length, page, limit };
}

async function bodyOf(req) {
    let body = '';
    for await (const chunk of req) {
        body += chunk;
        if (body.length > 65536) throw fail(413, 'Preview request too large');
    }
    try {
        return body ? JSON.parse(body) : {};
    } catch {
        throw fail(400, 'Invalid JSON');
    }
}

export function createPreviewServer() {
    let person = {
        id: 'preview-person',
        firstName: 'Тестовая',
        secondName: 'Покупательница',
        surname: null,
        email: PREVIEW_ACCOUNT.email,
        phone: '+375290000000',
        is_admin: false,
        is_moderator: false,
        isEmailVerified: true,
        createdAt: now(),
        updatedAt: now(),
    };
    const sessions = new Map();
    const orders = [];
    let draft = null;
    function auth(req, mutate = false) {
        const cookie = req.headers.cookie
            ?.split(';')
            .map(item => item.trim())
            .find(item => item.startsWith('storefront_preview='))
            ?.split('=')[1];
        const session = sessions.get(cookie);
        if (!session) throw fail(401, 'Use the local preview account');
        if (mutate && req.headers['x-csrf-token'] !== session.csrf_token) throw fail(403, 'Preview CSRF token required');
        return session;
    }
    function login(res) {
        const session = {
            csrf_token: randomUUID(),
            email: person.email,
            expires: Math.floor(Date.now() / 1000) + 86400,
            is_admin: false,
            is_moderator: false,
        };
        const id = randomUUID();
        sessions.set(id, session);
        res.setHeader('Set-Cookie', `storefront_preview=${id}; HttpOnly; SameSite=Strict; Path=/`);
        return { claims: session, user: person };
    }
    function getDraft() {
        if (!draft)
            draft = {
                id: randomUUID(),
                orderId: null,
                personId: person.id,
                products: [],
                status: 'NotChecked',
                paymentStatus: 'NotPaid',
                paymentId: null,
                paymentFormUrl: null,
                totalPrice: 0,
                discountAmount: 0,
                promoCodeId: null,
                deliveryMethod: 'pickup',
                deliveryDate: null,
                deliveryAddress: null,
                deliveryPostAddress: null,
                deliveryCost: 0,
                isCourierDelivery: false,
                paymentMethod: 'card',
                comment: '',
                createdAt: now(),
                updatedAt: now(),
            };
        return draft;
    }
    function recalculate() {
        draft.totalPrice = Math.round(draft.products.reduce((sum, item) => sum + item.quantity * item.variant.price, 0) * 100) / 100;
        draft.updatedAt = now();
        return draft;
    }
    function quantity(value) {
        if (!Number.isSafeInteger(value) || value < 1 || value > 99) throw fail(400, 'Quantity must be between 1 and 99');
        return value;
    }
    async function route(req, res, path, params) {
        const method = req.method;
        if (method === 'GET' && path === '/sandbox-payment') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Тестовая оплата</title><body><h1>Тестовая оплата</h1><p>Заказ сохранён только в памяти локальной песочницы. Деньги не списываются, платёжные данные не запрашиваются, письма не отправляются.</p><a href="http://localhost:4300/orders">Вернуться к тестовым заказам</a></body></html>';
        }
        if (method === 'GET' && path === '/api/maintenance/status') return { status: 'success', enabled: false };
        if (method === 'GET' && path === '/api/product') return productList(params);
        if (method === 'GET' && names.includes(path.slice(5)) && path.startsWith('/api/')) return catalog[path.slice(5)];
        const publicItem = path.match(/^\/api\/(product|brand|category)\/([^/]+)$/);
        if (method === 'GET' && publicItem) {
            const item = catalog[publicItem[1]].data.find(item => item.id === publicItem[2]);
            if (!item) throw fail(404, 'Public fixture not found');
            return ok(item);
        }
        const promotions = path.match(/^\/api\/product\/([^/]+)\/(promotions|promo-codes)$/);
        if (method === 'GET' && promotions) {
            const product = catalog.product.data.find(p => p.id === promotions[1]);
            if (!product) throw fail(404, 'Product fixture not found');
            return list(product[promotions[2] === 'promotions' ? 'promotions' : 'promoCodes'] || []);
        }
        const derived = new Map([
            ['/api/country', 'countries'],
            ['/api/product_scope', 'productScopes'],
            ['/api/product_type', 'productType'],
        ]).get(path);
        if (method === 'GET' && derived) {
            const items = catalog.product.data.flatMap(p => p[derived] || []);
            return list([...new Map(items.map(item => [item.id, item])).values()]);
        }
        if (method === 'POST' && path === '/api/login') {
            const body = await bodyOf(req);
            if (body.email !== PREVIEW_ACCOUNT.email || body.password !== passwordHash)
                throw fail(401, 'Use preview@example.test / Preview123!');
            return login(res);
        }
        if (method === 'POST' && path === '/api/register') {
            const body = await bodyOf(req);
            if (!body.email?.endsWith('@example.test') || !body.firstName || !body.secondName || !body.password)
                throw fail(400, 'Sandbox registration accepts invented @example.test addresses only');
            person = {
                ...person,
                firstName: body.firstName,
                secondName: body.secondName,
                surname: body.surname || null,
                email: body.email,
                phone: body.phone || '',
                updatedAt: now(),
            };
            return login(res);
        }
        if (method === 'GET' && path === '/api/check_auth') return { claims: auth(req), user: person };
        if (method === 'POST' && path === '/api/logout') {
            const session = auth(req, true);
            for (const [key, value] of sessions) if (value === session) sessions.delete(key);
            res.setHeader('Set-Cookie', 'storefront_preview=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
            return ok(null);
        }
        if (method === 'GET' && path === '/api/forgot_password') {
            if (!params.get('email')?.endsWith('@example.test')) throw fail(400, 'Use a fictional @example.test address; no email is sent');
            return { status: 'success', link: `${PREVIEW_ORIGIN}/reset-password?email=preview@example.test&token=preview-reset` };
        }
        if (method === 'GET' && path === '/api/verify_reset_token') return { valid: params.get('token') === 'preview-reset' };
        if (method === 'POST' && path === '/api/reset_password') {
            const body = await bodyOf(req);
            if (body.token !== 'preview-reset' || !body.email?.endsWith('@example.test')) throw fail(400, 'Invalid preview reset');
            return person;
        }
        if (method === 'GET' && path === '/api/verify_email') {
            auth(req, true);
            return { result: 'success', code: '123456' };
        }
        if (method === 'GET' && path === '/api/email_verification') {
            auth(req, true);
            if (params.get('code') !== '123456') throw fail(400, 'Sandbox code is 123456');
            person.isEmailVerified = true;
            return person;
        }
        if (method === 'PATCH' && path === '/api/person/preview-person') {
            auth(req, true);
            const body = await bodyOf(req);
            if (body.email && !body.email.endsWith('@example.test')) throw fail(400, 'Use fictional @example.test profile data');
            for (const key of ['firstName', 'secondName', 'surname', 'email', 'phone']) if (key in body) person[key] = body[key];
            person.updatedAt = now();
            return ok(person);
        }
        if (method === 'GET' && path === '/api/order/person/last_non_checked') {
            auth(req);
            return ok(draft);
        }
        const attach = path.match(/^\/api\/order\/attach_product\/([^/]+)$/);
        if (method === 'POST' && attach) {
            auth(req, true);
            const product = catalog.product.data.find(p => !p.isDeleted && p.variants.some(v => v.id === attach[1] && !v.isDeleted));
            if (!product) throw fail(404, 'Variant fixture not found');
            const order = getDraft();
            const item = order.products.find(item => item.variant.id === attach[1]);
            if (item) item.quantity = quantity(item.quantity + 1);
            else {
                const variant = product.variants.find(v => v.id === attach[1]);
                order.products.push({ product, variant, quantity: 1, historicalPrice: variant.price });
            }
            return recalculate();
        }
        if (method === 'PUT' && path === '/api/order/batch-quantity') {
            auth(req, true);
            if (!draft) throw fail(400, 'Cart is empty');
            const body = await bodyOf(req);
            for (const [id, value] of Object.entries(body.variants || {})) {
                quantity(value);
                if (!draft.products.some(item => item.variant.id === id)) throw fail(400, 'Unknown cart variant');
            }
            for (const item of draft.products) if (item.variant.id in (body.variants || {})) item.quantity = body.variants[item.variant.id];
            return ok(recalculate());
        }
        const change = path.match(/^\/api\/order\/product\/([^/]+)(?:\/quantity\/(\d+))?$/);
        if (change && ((method === 'PATCH' && change[2]) || (method === 'DELETE' && !change[2]))) {
            auth(req, true);
            if (!draft) throw fail(400, 'Cart is empty');
            if (method === 'DELETE') draft.products = draft.products.filter(item => item.variant.id !== change[1]);
            else {
                const item = draft.products.find(item => item.variant.id === change[1]);
                if (!item) throw fail(404, 'Unknown cart variant');
                item.quantity = quantity(Number(change[2]));
            }
            return recalculate();
        }
        if (method === 'GET' && path === '/api/order/products/sync') {
            auth(req, true);
            draft = null;
            return ok(null);
        }
        if (method === 'POST' && path === '/api/order/apply-promo-code') {
            auth(req, true);
            throw fail(400, 'В песочнице нет активных тестовых промокодов');
        }
        if (method === 'GET' && path === '/api/order/person/checkout') {
            auth(req, true);
            if (!draft?.products.length) throw fail(400, 'Cart is empty');
            if (
                draft.deliveryMethod === 'post' &&
                !catalog.post_placements.data.some(p => draft.deliveryPostAddress === `Отделение №${p.number} - ${p.address}`)
            )
                throw fail(400, 'Choose a real fixture placement');
            draft.status = 'Checked';
            draft.orderId = `PREVIEW-${orders.length + 1}`;
            draft.updatedAt = now();
            const order = structuredClone(draft);
            orders.push(order);
            draft = null;
            return order;
        }
        if (method === 'GET' && ['/api/order_minimal', '/api/order'].includes(path)) {
            auth(req);
            return list(orders);
        }
        const orderPath = path.match(/^\/api\/(order|order_minimal)\/([^/]+)$/);
        if (orderPath && (method === 'GET' || (method === 'PATCH' && orderPath[1] === 'order'))) {
            auth(req, method === 'PATCH');
            const order = [draft, ...orders].find(item => item?.id === orderPath[2]);
            if (!order) throw fail(404, 'Local order not found');
            if (method === 'PATCH' && orderPath[1] === 'order') {
                const body = await bodyOf(req);
                const fields =
                    order.status === 'NotChecked'
                        ? [
                              'firstName',
                              'secondName',
                              'email',
                              'phone',
                              'deliveryMethod',
                              'isCourierDelivery',
                              'paymentMethod',
                              'deliveryAddress',
                              'deliveryPostAddress',
                              'deliveryCost',
                              'comment',
                          ]
                        : ['paymentStatus'];
                for (const key of fields) if (key in body) order[key] = body[key];
                order.updatedAt = now();
            }
            return ok(order);
        }
        if (method === 'POST' && path === '/api/payments/process') {
            auth(req, true);
            const body = await bodyOf(req);
            const order = orders.find(item => item.id === body.id);
            if (!order) throw fail(404, 'Local completed order required');
            return { formUrl: 'http://localhost:4301/sandbox-payment', orderId: order.orderId };
        }
        throw fail(404, 'Endpoint unavailable in isolated storefront preview');
    }
    return createServer(async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        try {
            if (!['localhost', '127.0.0.1'].includes(req.headers.host?.split(':')[0])) throw fail(403, 'Local host required');
            if (req.headers.origin && req.headers.origin !== PREVIEW_ORIGIN) throw fail(403, 'Local preview origin required');
            if (req.headers.origin === PREVIEW_ORIGIN) {
                res.setHeader('Access-Control-Allow-Origin', PREVIEW_ORIGIN);
                res.setHeader('Access-Control-Allow-Credentials', 'true');
                res.setHeader('Vary', 'Origin');
            }
            if (req.method === 'OPTIONS') {
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
                res.writeHead(204);
                res.end();
                return;
            }
            if (!req.url.startsWith('/') || req.url.startsWith('//')) throw fail(404, 'Proxy requests are unsupported');
            const url = new URL(req.url, 'http://localhost:4301');
            const result = await route(req, res, url.pathname, url.searchParams);
            req.resume();
            res.end(typeof result === 'string' ? result : JSON.stringify(result));
        } catch (error) {
            req.resume();
            res.statusCode = error.status || 500;
            res.end(JSON.stringify({ status: 'error', message: error.status ? error.message : 'Local preview error' }));
        }
    });
}
