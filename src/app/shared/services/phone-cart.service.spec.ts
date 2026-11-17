import { GuestCheckoutService } from './guest-checkout.service';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { CartService } from './cart.service';
import { AuthService } from './auth.service';
import { OrderService } from './order.service';
import { ToastService } from './toast.service';
import { CartItemInput, CartQuote, CheckoutRequest } from '../models/checkout.model';
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
describe('Phone checkout cart', () => {
    let service: CartService;
    let login: BehaviorSubject<boolean>;
    let logout: BehaviorSubject<boolean>;
    let signedIn: boolean;
    let remote: CartQuote;
    let orders: jasmine.SpyObj<OrderService>;
    let guest: GuestCheckoutService;
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
            guest,
        );
    }
    beforeEach(() => {
        localStorage.removeItem('skviderm.guest-cart.v1');
        login = new BehaviorSubject(false);
        logout = new BehaviorSubject(false);
        signedIn = false;
        remote = quote([]);
        orders = jasmine.createSpyObj<OrderService>('orders', [
            'quoteCart',
            'getCheckoutCart',
            'mergeCheckoutCart',
            'replaceCheckoutCart',
            'addCheckoutCartItem',
        ]);
        orders.quoteCart.and.callFake(async request => quote(request.items));
        orders.getCheckoutCart.and.callFake(async () => remote);
        orders.mergeCheckoutCart.and.callFake(async (_id, items) => {
            remote = quote(items);
            return remote;
        });
        guest = {
            ready: Promise.resolve(null),
            session: null,
            findAttempt: jasmine.createSpy().and.resolveTo(null),
            restore: jasmine.createSpy().and.callFake(async () => guest.session),
        } as unknown as GuestCheckoutService;
        service = create();
    });
    afterEach(() => {
        service.ngOnDestroy();
        localStorage.removeItem('skviderm.guest-cart.v1');
    });
    it('retries a transient add failure on the same cart with the same operation ID', async () => {
        await service.ready;
        signedIn = true;
        remote.itemAddAvailable = true;
        await service.refresh();
        orders.addCheckoutCartItem.and.callFake(async () => {
            if (orders.addCheckoutCartItem.calls.count() === 1) throw { status: 503 };
            return { ...quote([{ variantId: variant, quantity: 1 }]), itemAddAvailable: true };
        });

        await service.addProductToCart(variant);

        const attempts = orders.addCheckoutCartItem.calls.allArgs();
        expect(attempts.length).toBe(2);
        expect(attempts[0]).toEqual(['cart-one', variant, jasmine.stringMatching(/^[0-9a-f-]{36}$/)]);
        expect(attempts[1]).toEqual(attempts[0]);
        expect(orders.replaceCheckoutCart).not.toHaveBeenCalled();
        expect(await firstValueFrom(service.getProductCount())).toBe(1);
        expect(service.addingVariantId()).toBeNull();
    });

    it('ignores rapid add and quantity clicks while an authenticated addition is pending', async () => {
        await service.ready;
        signedIn = true;
        remote = { ...quote([{ variantId: variant, quantity: 1 }]), itemAddAvailable: true };
        await service.refresh();
        let finish!: (value: CartQuote) => void;
        let started!: () => void;
        const requestStarted = new Promise<void>(resolve => {
            started = resolve;
        });
        orders.addCheckoutCartItem.and.callFake(() => {
            started();
            return new Promise<CartQuote>(resolve => {
                finish = resolve;
            });
        });

        const addition = service.addProductToCart(variant);
        await requestStarted;
        expect(service.addingVariantId()).toBe(variant);
        service.increaseQuantity((await firstValueFrom(service.getCartItems()))[0]);
        await service.addProductToCart(variant);
        finish({ ...quote([{ variantId: variant, quantity: 2 }]), itemAddAvailable: true });
        await addition;

        expect(orders.addCheckoutCartItem).toHaveBeenCalledTimes(1);
        expect(await firstValueFrom(service.getProductCount())).toBe(2);
        expect(service.addingVariantId()).toBeNull();
        orders.addCheckoutCartItem.and.resolveTo({ ...quote([{ variantId: variant, quantity: 3 }]), itemAddAvailable: true });
        await service.addProductToCart(variant);
        expect(orders.addCheckoutCartItem.calls.mostRecent().args[2]).not.toBe(orders.addCheckoutCartItem.calls.first().args[2]);
    });

    it('refreshes the cart after a 409 without applying the attempted addition to the fresh cart', async () => {
        await service.ready;
        signedIn = true;
        remote.itemAddAvailable = true;
        await service.refresh();
        remote = { ...quote([]), itemAddAvailable: true };
        remote.order.id = 'cart-two';
        const conflict = { status: 409 };
        orders.addCheckoutCartItem.and.callFake(async () => {
            throw conflict;
        });

        await expectAsync(service.addProductToCart(variant)).toBeRejectedWith(conflict);

        expect(orders.addCheckoutCartItem).toHaveBeenCalledOnceWith('cart-one', variant, jasmine.any(String));
        expect(orders.replaceCheckoutCart).not.toHaveBeenCalled();
        expect(service.currentQuote?.order.id).toBe('cart-two');
        expect(service.addingVariantId()).toBeNull();
    });

    it('uses the existing authenticated change when the quote has no item addition capability', async () => {
        await service.ready;
        signedIn = true;
        await service.refresh();
        const items = [{ variantId: variant, quantity: 1 }];
        orders.replaceCheckoutCart.and.resolveTo(quote(items));

        await service.addProductToCart(variant);

        expect(orders.replaceCheckoutCart).toHaveBeenCalledOnceWith('cart-one', 1, items, null);
        expect(orders.addCheckoutCartItem).not.toHaveBeenCalled();
    });

    it('saves one guest item and quotes it once during a burst of clicks', async () => {
        await service.ready;
        orders.quoteCart.calls.reset();

        await Promise.all([service.addProductToCart(variant), service.addProductToCart(variant), service.addProductToCart(variant)]);

        const items = [{ variantId: variant, quantity: 1 }];
        expect(orders.quoteCart).toHaveBeenCalledOnceWith({ items, promoCode: null });
        expect(orders.addCheckoutCartItem).not.toHaveBeenCalled();
        expect(JSON.parse(localStorage.getItem('skviderm.guest-cart.v1')!).items).toEqual(items);
    });

    it('removes purchased guest items from persistent storage so reload cannot restore a completed cart', async () => {
        await service.ready;
        await service.addProductToCart(variant);
        await service.clearAfterCheckout();
        service.ngOnDestroy();
        service = create();
        await service.ready;
        expect(await firstValueFrom(service.getProductCount())).toBe(0);
    });
    it('preserves additions from another tab and does not subtract a recovered checkout twice', async () => {
        await service.ready;
        await service.addProductToCart(variant);
        const purchased = { cartId: service.guestCartId!, items: [{ variantId: variant, quantity: 1 }] };
        await service.addProductToCart(variant);
        await service.clearAfterCheckout(purchased);
        expect(await firstValueFrom(service.getProductCount())).toBe(1);
        expect(service.guestCartId).not.toBe(purchased.cartId);
        await service.clearAfterCheckout(purchased);
        expect(await firstValueFrom(service.getProductCount())).toBe(1);
    });
    it('does not merge a completed guest order into an account after a lost checkout response', async () => {
        await service.ready;
        await service.addProductToCart(variant);
        const cartId = service.guestCartId!;
        guest.session = { csrfToken: 'test', expiresAt: Date.now() / 1000 + 1000, customer: { id: 'guest' } } as typeof guest.session;
        (guest.findAttempt as jasmine.Spy).and.callFake(async (key: string) =>
            key === cartId ? quote([{ variantId: variant, quantity: 1 }]).order : null,
        );
        signedIn = true;
        await service.refresh();
        expect(orders.mergeCheckoutCart).not.toHaveBeenCalled();
        expect(localStorage.getItem('skviderm.guest-cart.v1')).toBeNull();
        expect(await firstValueFrom(service.getProductCount())).toBe(0);
    });
    it('serializes guest checkout with account merge and recovers committed items before merging', async () => {
        await service.ready;
        await service.addProductToCart(variant);
        const cartId = service.guestCartId!;
        guest.session = { csrfToken: 'test', expiresAt: Date.now() / 1000 + 1000, customer: { id: 'guest' } } as typeof guest.session;
        let committed: OrderModel | null = null;
        let complete!: () => void;
        let started!: () => void;
        const waiting = new Promise<void>(resolve => {
            complete = resolve;
        });
        const sending = new Promise<void>(resolve => {
            started = resolve;
        });
        (guest.findAttempt as jasmine.Spy).and.callFake(async () => committed);
        guest.checkout = jasmine.createSpy().and.callFake(async () => {
            started();
            await waiting;
            committed = quote([{ variantId: variant, quantity: 1 }]).order;
            throw { status: 0 };
        });
        const checkout = service.confirmGuestCheckout({ cartId, checkoutKey: cartId } as CheckoutRequest).catch(error => error.status);
        await sending;
        signedIn = true;
        const merging = service.refresh();
        expect(orders.mergeCheckoutCart).not.toHaveBeenCalled();
        complete();
        expect(await checkout).toBe(0);
        await merging;
        expect(orders.mergeCheckoutCart).not.toHaveBeenCalled();
        expect(localStorage.getItem('skviderm.guest-cart.v1')).toBeNull();
    });
    it('restores a guest cookie created in another tab before merging a paid basket', async () => {
        await service.ready;
        await service.addProductToCart(variant);
        const cartId = service.guestCartId!;
        expect(guest.session).toBeNull();
        (guest.restore as jasmine.Spy).and.callFake(async () => {
            guest.session = { customer: { id: 'from-other-tab' } } as typeof guest.session;
            return guest.session;
        });
        (guest.findAttempt as jasmine.Spy).and.callFake(async (key: string) =>
            key === cartId ? quote([{ variantId: variant, quantity: 1 }]).order : null,
        );
        signedIn = true;
        await service.refresh();
        expect(orders.mergeCheckoutCart).not.toHaveBeenCalled();
        expect(localStorage.getItem('skviderm.guest-cart.v1')).toBeNull();
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
