import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GuestCheckoutService, GuestSession } from './guest-checkout.service';
import { CheckoutDetails } from '../models/checkout.model';

const url = `${environment.server_url}/checkout/guest`;
const session = { csrfToken: 'test-guest-proof', expiresAt: Date.now() / 1000 + 3600, customer: { id: 'guest' } } as GuestSession;
const nextTurn = () => new Promise(resolve => setTimeout(resolve, 0));

describe('Guest checkout browser proof', () => {
    let service: GuestCheckoutService;
    let http: HttpTestingController;
    beforeEach(async () => {
        let queue: Promise<unknown> = Promise.resolve();
        spyOn(navigator.locks, 'request').and.callFake(((_name: string, callback: () => Promise<unknown>) => {
            const result = queue.then(callback);
            queue = result.catch(() => undefined);
            return result;
        }) as typeof navigator.locks.request);
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        http = TestBed.inject(HttpTestingController);
        service = TestBed.inject(GuestCheckoutService);
        await Promise.resolve();
    });
    afterEach(() => http.verify());
    it('restores history using the HttpOnly cookie and sends a separate CSRF proof', async () => {
        const restore = http.expectOne(`${url}/session`);
        expect(restore.request.withCredentials).toBeTrue();
        restore.flush(session);
        await service.ready;
        const history = service.getOrders();
        const request = http.expectOne(`${url}/orders?page=1&limit=20`);
        expect(request.request.headers.get('X-Guest-CSRF')).toBe('test-guest-proof');
        request.flush({ status: 'success', length: 0, data: [] });
        expect((await history).data).toEqual([]);
    });
    it('never creates a replacement identity on a transient session lookup failure', async () => {
        http.expectOne(`${url}/session`).flush('', { status: 503, statusText: 'Unavailable' });
        await service.ready;
        const result = service.ensureSession({} as CheckoutDetails).catch(error => error.status);
        await nextTurn();
        http.expectOne(`${url}/session`).flush('', { status: 503, statusText: 'Unavailable' });
        expect(await result).toBe(503);
        http.expectNone(request => request.method === 'POST');
    });
    it('serializes session creation and rechecks the cookie for a second tab', async () => {
        http.expectOne(`${url}/session`).flush('', { status: 401, statusText: 'Unauthorized' });
        await service.ready;
        const first = service.ensureSession({} as CheckoutDetails);
        const second = service.ensureSession({} as CheckoutDetails);
        await nextTurn();
        http.expectOne(`${url}/session`).flush('', { status: 401, statusText: 'Unauthorized' });
        await nextTurn();
        const create = http.expectOne(`${url}/session`);
        expect(create.request.method).toBe('POST');
        create.flush(session);
        await first;
        await nextTurn();
        const reread = http.expectOne(`${url}/session`);
        expect(reread.request.method).toBe('GET');
        reread.flush(session);
        expect((await second).customer.id).toBe('guest');
    });
    it('retries bank registration only through the guest owner endpoint', async () => {
        http.expectOne(`${url}/session`).flush(session);
        await service.ready;
        const result = firstValueFrom(service.pay('order-id'));
        const request = http.expectOne(`${url}/payments/process`);
        expect(request.request.body).toEqual({ id: 'order-id' });
        expect(request.request.headers.get('X-Guest-CSRF')).toBe(session.csrfToken);
        request.flush({ formUrl: 'https://example.test', orderId: 'payment-id' });
        await result;
    });
});
