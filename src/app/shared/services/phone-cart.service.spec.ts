import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { CartService } from './cart.service';
import { AuthService } from './auth.service';
import { OrderService } from './order.service';
import { ToastService } from './toast.service';
import { CartItemInput, CartQuote } from '../models/checkout.model';
import { OrderModel } from '../models/order.model';

const variant = '11111111-1111-4111-8111-111111111111';
function quote(items: CartItemInput[]): CartQuote {
    return {
        order: {
            id: 'cart-one',
            personId: 'customer',
            cartRevision: 1,
            totalPrice: items.reduce((sum, item) => sum + item.quantity * 100, 0),
            discountAmount: 0,
            products: items.map(item => ({
                product: { id: 'product', promotions: [] },
                variant: { id: item.variantId, price: 100 },
                quantity: item.quantity,
            })),
        } as unknown as OrderModel,
        items,
        unavailableItems: [],
        subtotalCents: items.reduce((sum, item) => sum + item.quantity * 10000, 0),
        totalCents: items.reduce((sum, item) => sum + item.quantity * 10000, 0),
        promotionDiscountCents: 0,
        promoCodeDiscountCents: 0,
        promoCode: null,
        promoCodeError: null,
    };
}
describe('Phone checkout guest cart', () => {
    let service: CartService;
    let login: BehaviorSubject<boolean>;
    let logout: BehaviorSubject<boolean>;
    let signedIn: boolean;
    let remote: CartQuote;
    let orders: jasmine.SpyObj<OrderService>;
    function create(): CartService {
        return new CartService(
            {
                ready: Promise.resolve(),
                phoneCheckoutEnabled: true,
                checkAuth: () => of(null),
                isLoggedIn: () => signedIn,
                getCurrentUserSync: () => (signedIn ? { id: 'customer' } : null),
                getLoginStatus: () => login,
                getLogoutStatus: () => logout,
            } as unknown as AuthService,
            orders,
            { show: jasmine.createSpy('show') } as unknown as ToastService,
        );
    }
    beforeEach(() => {
        localStorage.removeItem('skviderm.guest-cart.v1');
        login = new BehaviorSubject(false);
        logout = new BehaviorSubject(false);
        signedIn = false;
        remote = quote([]);
        orders = jasmine.createSpyObj<OrderService>('orders', ['quoteCart', 'getCheckoutCart', 'mergeCheckoutCart', 'replaceCheckoutCart']);
        orders.quoteCart.and.callFake(async request => quote(request.items));
        orders.getCheckoutCart.and.callFake(async () => remote);
        orders.mergeCheckoutCart.and.callFake(async (_id, items) => {
            remote = quote(items);
            return remote;
        });
        service = create();
    });
    afterEach(() => {
        service.ngOnDestroy();
        localStorage.removeItem('skviderm.guest-cart.v1');
    });
    it('keeps anonymous quantities on reload and stores no product prices or contact data', async () => {
        await service.ready;
        await service.addProductToCart(variant);
        await service.addProductToCart(variant);
        const saved = JSON.parse(localStorage.getItem('skviderm.guest-cart.v1')!);
        expect(Object.keys(saved).sort()).toEqual(['items', 'mergeId']);
        expect(saved.items).toEqual([{ variantId: variant, quantity: 2 }]);
        service.ngOnDestroy();
        service = create();
        await service.ready;
        expect(await firstValueFrom(service.getProductCount())).toBe(2);
        expect(await firstValueFrom(service.getTotalPrice())).toBe(200);
    });
    it('retries a lost merge acknowledgement using the same key and keeps guest cart until confirmed', async () => {
        await service.ready;
        await service.addProductToCart(variant);
        const key = JSON.parse(localStorage.getItem('skviderm.guest-cart.v1')!).mergeId;
        orders.mergeCheckoutCart.and.callFake(async () => {
            throw new Error('Lost response');
        });
        signedIn = true;
        await expectAsync(service.refresh()).toBeRejected();
        expect(JSON.parse(localStorage.getItem('skviderm.guest-cart.v1')!).mergeId).toBe(key);
        orders.mergeCheckoutCart.and.callFake(async (_id, items) => quote(items));
        await service.refresh();
        expect(orders.mergeCheckoutCart.calls.allArgs().map(args => args[0])).toEqual([key, key]);
        expect(localStorage.getItem('skviderm.guest-cart.v1')).toBeNull();
        expect(await firstValueFrom(service.getProductCount())).toBe(1);
    });
    it('does not replace a visible cart with empty data when refresh fails, and clears private data at logout', async () => {
        await service.ready;
        await service.addProductToCart(variant);
        signedIn = true;
        await service.refresh();
        orders.getCheckoutCart.and.callFake(async () => {
            throw new Error('Offline');
        });
        await expectAsync(service.refresh()).toBeRejected();
        expect(await firstValueFrom(service.getProductCount())).toBe(1);
        signedIn = false;
        logout.next(true);
        expect(await firstValueFrom(service.getProductCount())).toBe(0);
        expect(service.currentQuote).toBeNull();
    });
    it('discards an old promo response and queued additions after logout', async () => {
        await service.ready;
        signedIn = true;
        remote = quote([{ variantId: variant, quantity: 1 }]);
        await service.refresh();
        let finish!: (result: CartQuote) => void;
        let started!: () => void;
        const requestStarted = new Promise<void>(resolve => {
            started = resolve;
        });
        orders.replaceCheckoutCart.and.callFake(() => {
            started();
            return new Promise<CartQuote>(resolve => {
                finish = resolve;
            });
        });
        const promo = service.applyPhonePromocode('SALE');
        await requestStarted;
        const queued = service.addProductToCart(variant);
        await Promise.resolve();
        signedIn = false;
        logout.next(true);
        finish(remote);
        await Promise.all([promo, queued]);
        expect(service.currentQuote).toBeNull();
        expect(localStorage.getItem('skviderm.guest-cart.v1')).toBeNull();
        expect(orders.replaceCheckoutCart).toHaveBeenCalledTimes(1);
    });
    it('shows a vanished guest item after signed-in reload so it can be removed', async () => {
        await service.ready;
        service.ngOnDestroy();
        signedIn = true;
        localStorage.setItem(
            'skviderm.guest-cart.v1',
            JSON.stringify({ mergeId: crypto.randomUUID(), items: [{ variantId: variant, quantity: 1 }] }),
        );
        orders.mergeCheckoutCart.and.callFake(async () => {
            throw { status: 400 };
        });
        orders.quoteCart.and.callFake(async request => ({ ...quote([]), items: request.items, unavailableItems: request.items }));
        service = create();
        await service.ready;
        expect(service.hasUnavailableItems).toBeTrue();
        expect(service.currentQuote?.unavailableItems[0].variantId).toBe(variant);
        await service.removeUnavailable(variant);
        expect(service.hasUnavailableItems).toBeFalse();
        expect(JSON.parse(localStorage.getItem('skviderm.guest-cart.v1')!).items).toEqual([]);
    });
});
