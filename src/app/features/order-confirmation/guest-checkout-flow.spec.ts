import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { OrderConfirmationComponent } from './order-confirmation.component';
import { AuthService } from '../../shared/services/auth.service';
import { CartService } from '../../shared/services/cart.service';
import { GuestCheckoutService, GuestSession } from '../../shared/services/guest-checkout.service';
import { OrderService } from '../../shared/services/order.service';
import { PaymentService } from '../../shared/services/payment.service';
import { PostService } from '../../shared/services/post.service';
import { PromocodeService } from '../../shared/services/promocode.service';
import { PromotionService } from '../../shared/services/promotion.service';
import { ToastService } from '../../shared/services/toast.service';
import { LoginModalService } from '../../shared/services/login-modal.service';
import { CartQuote } from '../../shared/models/checkout.model';
import { OrderModel } from '../../shared/models/order.model';

const cartId = '11111111-1111-4111-8111-111111111111';
const variantId = '22222222-2222-4222-8222-222222222222';
const saved = { id: 'saved-order', paymentMethod: 'cash', products: [{ variant: { id: variantId }, quantity: 1 }] } as OrderModel;
const quote = {
    order: { id: 'temporary-quote-id', products: [] },
    items: [{ variantId, quantity: 1 }],
    totalCents: 10000,
    unavailableItems: [],
    promoCode: null,
} as unknown as CartQuote;

describe('Guest checkout submission and recovery', () => {
    let component: OrderConfirmationComponent;
    let cart: jasmine.SpyObj<CartService>;
    let guest: jasmine.SpyObj<GuestCheckoutService>;
    let router: jasmine.SpyObj<Router>;
    beforeEach(async () => {
        sessionStorage.removeItem('skviderm.checkout.guest');
        cart = jasmine.createSpyObj<CartService>('cart', ['confirmGuestCheckout', 'clearAfterCheckout', 'flushPendingUpdates', 'refresh'], {
            currentQuote: quote,
            ready: Promise.resolve(),
            quote$: new BehaviorSubject<CartQuote | null>(quote),
            guestCartId: cartId,
        });
        cart.confirmGuestCheckout.and.resolveTo(saved);
        cart.clearAfterCheckout.and.resolveTo();
        guest = jasmine.createSpyObj<GuestCheckoutService>('guest', ['ensureSession', 'findAttempt'], {
            ready: Promise.resolve(null),
            session: { csrfToken: 'test', expiresAt: Date.now() / 1000 + 3600, customer: { id: 'guest' } } as GuestSession,
        });
        guest.findAttempt.and.resolveTo(null);
        router = jasmine.createSpyObj<Router>('router', ['navigate']);
        router.navigate.and.resolveTo(true);
        component = new OrderConfirmationComponent(
            new FormBuilder(),
            { quoteCart: async () => quote } as unknown as OrderService,
            cart,
            {
                ready: Promise.resolve(),
                phoneCheckoutEnabled: true,
                guestCheckoutAvailable: true,
                isLoggedIn: () => false,
                getCurrentUser: () => of(null),
                getCurrentUserSync: () => null,
            } as unknown as AuthService,
            { show: () => undefined } as unknown as ToastService,
            router,
            { getPostPlacements: () => of({ data: [] }) } as unknown as PostService,
            {} as PaymentService,
            {} as PromocodeService,
            {} as PromotionService,
            {} as LoginModalService,
            guest,
        );
        await component.ngOnInit();
        component.confirmationForm.patchValue({
            firstName: 'Анна',
            lastName: 'Тестовая',
            phone: '+375 (29) 000-00-07',
            paymentMethod: 'cash',
            offerConsent: true,
        });
    });
    afterEach(() => {
        component.ngOnDestroy();
        sessionStorage.removeItem('skviderm.checkout.guest');
    });
    it('uses the shared cart ID as the idempotency key without requiring email or SMS', async () => {
        expect(component.confirmationForm.valid).toBeTrue();
        expect(component.needsPhone).toBeFalse();
        await component.confirmOrder();
        const request = cart.confirmGuestCheckout.calls.mostRecent().args[0];
        expect(request.checkoutKey).toBe(cartId);
        expect(request.cartId).toBe(cartId);
        expect(request.details.email).toBeNull();
        expect(router.navigate).toHaveBeenCalledWith(['/guest-order', saved.id]);
    });
    it('recovers the server order without deleting additional items from a conflicting attempt', async () => {
        sessionStorage.setItem('skviderm.checkout.guest', JSON.stringify({ key: cartId, cartId, items: [{ variantId, quantity: 2 }] }));
        guest.findAttempt.and.resolveTo(saved);
        await component.retryPreviousOrder();
        expect(cart.clearAfterCheckout).toHaveBeenCalledWith({ cartId, items: [{ variantId, quantity: 1 }] });
        expect(cart.confirmGuestCheckout).not.toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/guest-order', saved.id]);
    });
});
