import { GuestCheckoutService } from '../../shared/services/guest-checkout.service';
import { LoginModalService } from '../../shared/services/login-modal.service';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { CartService } from '../../shared/services/cart.service';
import { OrderService } from '../../shared/services/order.service';
import { PaymentService } from '../../shared/services/payment.service';
import { PostService } from '../../shared/services/post.service';
import { PromocodeService } from '../../shared/services/promocode.service';
import { PromotionService } from '../../shared/services/promotion.service';
import { ToastService } from '../../shared/services/toast.service';
import { FormBuilder } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { OrderConfirmationComponent } from './order-confirmation.component';
import { OrderModel, OrderProductModel } from '../../shared/models/order.model';
import { CartQuote } from '../../shared/models/checkout.model';
import { ListResponse } from '../../shared/base/schemas/base_schema';
import { PostPlacement } from '../../shared/models/utils.interface';

describe('Checkout delivery contract', () => {
    const placements = [
        { id: 907, number: 12, address: 'Минск, Ульяновская 4', longitude: 0, latitude: 0 },
        { id: 911, number: 46, address: 'Брест, Советская 9', longitude: 0, latitude: 0 },
    ];
    let component: OrderConfirmationComponent;
    let post: jasmine.Spy;
    let update: jasmine.Spy;
    let checkout: jasmine.Spy;
    let response: Subject<ListResponse<PostPlacement>>;
    beforeEach(() => {
        response = new Subject();
        post = jasmine.createSpy().and.returnValue(response);
        update = jasmine.createSpy().and.resolveTo({});
        checkout = jasmine.createSpy().and.resolveTo(null);
        component = new OrderConfirmationComponent(
            new FormBuilder(),
            {
                getLastNotCheckedOrder: () => of({ id: 'cart', totalPrice: 102, products: [] }),
                update,
            } as unknown as OrderService,
            { checkout, flushPendingUpdates: () => Promise.resolve() } as unknown as CartService,
            {
                getCurrentUser: () => of(null),
                getCurrentUserSync: () => null,
                isLoggedIn: () => true,
            } as unknown as AuthService,
            { show: jasmine.createSpy() } as unknown as ToastService,
            { navigate: jasmine.createSpy() } as unknown as Router,
            { getPostPlacements: post } as unknown as PostService,
            {} as unknown as PaymentService,
            {} as unknown as PromocodeService,
            { getProductPromotions: () => of({ data: [] }) } as unknown as PromotionService,
            {} as unknown as LoginModalService,
            {} as GuestCheckoutService,
        );
        component.loadCartItems();
        response.next({ status: 'success', data: placements } as ListResponse<PostPlacement>);
        response.complete();
    });
    function validForm() {
        component.confirmationForm.patchValue({
            firstName: 'Анна',
            lastName: 'Иванова',
            email: 'a@example.test',
            phone: '+375 (29) 123-45-67',
            offerConsent: true,
        });
    }
    it('shows the contact form without SMS when temporary guest checkout is enabled', () => {
        const auth = (component as unknown as { authService: AuthService }).authService;
        Object.assign(auth, { guestCheckoutAvailable: true, getCurrentUserSync: () => null });
        component.phoneCheckout = true;
        expect(component.needsPhone).toBeFalse();
    });
    it('loads actual locations through PostService and searches address and number', () => {
        expect(post).toHaveBeenCalledTimes(1);
        component.filterPostPlacements('брест');
        expect(component.filteredPostPlacements$.value).toEqual([placements[1]]);
        component.filterPostPlacements('12');
        expect(component.filteredPostPlacements$.value).toEqual([placements[0]]);
    });
    it('retains real internal ID and sends number/address in existing order payload', async () => {
        validForm();
        component.confirmationForm.get('deliveryMethod')!.setValue('post');
        component.selectPostPlacement(placements[0]);
        expect(component.confirmationForm.get('postPlacement')!.value).toBe(907);
        await component.confirmOrder();
        expect(update.calls.mostRecent().args[1].deliveryPostAddress).toBe('Отделение №12 - Минск, Ульяновская 4');
        expect(update.calls.mostRecent().args[1].postPlacement).toBeUndefined();
    });
    it('preserves courier address fields and includes delivery in the final total', async () => {
        validForm();
        component.confirmationForm.get('deliveryMethod')!.setValue('standart');
        component.confirmationForm.patchValue({ city: 'Минск', street: 'Ленина', house: '4', building: '2', apartment: '15' });
        component.cartItems$.next([{ product: { id: 'product' }, variant: { price: 102 }, quantity: 1 }] as unknown as OrderProductModel[]);
        expect(component.getTotalWithDeliveryAndPromotions()).toBe(112);
        await component.confirmOrder();
        expect(update.calls.mostRecent().args[1].deliveryAddress).toBe('Минск, Ленина, 4, корпус 2, кв. 15');
        expect(update.calls.mostRecent().args[1].deliveryCost).toBe(10);
        component.promocodeDiscount = 20;
        expect(component.getTotalWithDeliveryAndPromotions()).toBe(92);
    });
    it('immediately invalidates a selected ID when its text is edited', () => {
        component.confirmationForm.get('deliveryMethod')!.setValue('post');
        component.selectPostPlacement(placements[0]);
        component.confirmationForm.get('postPlacementFilter')!.setValue('Брест');
        expect(component.confirmationForm.get('postPlacement')!.value).toBe('');
        expect(component.confirmationForm.invalid).toBeTrue();
    });
    it('requires an actual selection instead of free text', () => {
        validForm();
        component.confirmationForm.get('deliveryMethod')!.setValue('post');
        component.confirmationForm.get('postPlacementFilter')!.setValue('Отделение №12 - Минск, Ульяновская 4');
        expect(component.confirmationForm.invalid).toBeTrue();
    });
    it('keeps courier address validation and pre-coupon delivery threshold', () => {
        validForm();
        component.confirmationForm.get('deliveryMethod')!.setValue('post');
        component.selectPostPlacement(placements[0]);
        component.confirmationForm.get('courierDelivery')!.setValue(true);
        expect(component.confirmationForm.get('city')!.invalid).toBeTrue();
        expect(component.confirmationForm.get('street')!.invalid).toBeTrue();
        expect(component.confirmationForm.get('house')!.invalid).toBeTrue();
        expect(component.getDeliveryPrice()).toBe(10);
        component.currentOrder = { totalPrice: 250 } as OrderModel;
        component.promocodeDiscount = 100;
        expect(component.getDeliveryPrice()).toBe(0);
        component.currentOrder = { totalPrice: 249.99 } as OrderModel;
        expect(component.getDeliveryPrice()).toBe(10);
        component.confirmationForm.get('deliveryMethod')!.setValue('pickup');
        expect(component.getDeliveryPrice()).toBe(0);
    });
});

describe('Checkout placement keyboard and request states', () => {
    let component: OrderConfirmationComponent;
    let response: Subject<ListResponse<PostPlacement>>;
    beforeEach(() => {
        response = new Subject();
        component = new OrderConfirmationComponent(
            new FormBuilder(),
            { getLastNotCheckedOrder: () => of(null) } as unknown as OrderService,
            {} as unknown as CartService,
            { getCurrentUser: () => of(null) } as unknown as AuthService,
            {} as unknown as ToastService,
            {} as unknown as Router,
            { getPostPlacements: () => response } as unknown as PostService,
            {} as unknown as PaymentService,
            {} as unknown as PromocodeService,
            {} as unknown as PromotionService,
            {} as unknown as LoginModalService,
            {} as GuestCheckoutService,
        );
    });
    it('shows loading then an error without inventing selectable locations', () => {
        expect(component.postPlacementsLoading).toBeTrue();
        response.error(new Error('Unavailable'));
        expect(component.postPlacementsLoading).toBeFalse();
        expect(component.postPlacementsError).toBeTrue();
        expect(component.filteredPostPlacements$.value).toEqual([]);
    });
    it('supports opening, moving, selecting and closing using the keyboard', () => {
        const placement = { id: 807, number: 23, address: 'Минск, тестовый адрес', longitude: 0, latitude: 0 };
        response.next({ status: 'success', data: [placement] } as ListResponse<PostPlacement>);
        component.confirmationForm.get('deliveryMethod')!.setValue('post');
        component.onPlacementKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        expect(component.showDropdown).toBeTrue();
        expect(component.activePlacementIndex).toBe(0);
        component.onPlacementKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(component.confirmationForm.get('postPlacement')!.value).toBe(807);
        expect(component.showDropdown).toBeFalse();
        component.onFilterFocus();
        component.onPlacementKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(component.showDropdown).toBeFalse();
        expect(component.confirmationForm.get('postPlacement')!.value).toBe(807);
    });
});

describe('Rendered checkout EuroPost selection', () => {
    let fixture: ComponentFixture<OrderConfirmationComponent>;
    let response: Subject<ListResponse<PostPlacement>>;
    beforeEach(async () => {
        response = new Subject();
        TestBed.configureTestingModule({
            imports: [OrderConfirmationComponent],
            providers: [
                { provide: GuestCheckoutService, useValue: { ready: Promise.resolve(), session: null } },
                provideRouter([]),
                {
                    provide: AuthService,
                    useValue: { getCurrentUser: () => of(null), getCurrentUserSync: () => null, isLoggedIn: () => true },
                },
                { provide: OrderService, useValue: { getLastNotCheckedOrder: () => of({ id: 'cart', totalPrice: 102, products: [] }) } },
                { provide: PostService, useValue: { getPostPlacements: () => response } },
                { provide: CartService, useValue: {} },
                { provide: PaymentService, useValue: {} },
                { provide: PromocodeService, useValue: {} },
                { provide: PromotionService, useValue: {} },
                { provide: ToastService, useValue: {} },
            ],
        });
        fixture = TestBed.createComponent(OrderConfirmationComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });
    it('keeps the selected ID and closes the list after asynchronous loading and keyboard selection', fakeAsync(() => {
        fixture.componentInstance.confirmationForm.get('deliveryMethod')!.setValue('post');
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Загружаем отделения');
        response.next({
            status: 'success',
            data: [{ id: 907, number: 1, address: 'г. Минск, ул. Монтажников, 2', longitude: 0, latitude: 0 }],
        } as ListResponse<PostPlacement>);
        response.complete();
        tick();
        fixture.detectChanges();
        const input: HTMLInputElement = fixture.nativeElement.querySelector('#postPlacement');
        input.dispatchEvent(new FocusEvent('focus'));
        input.value = 'Монтажников';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[role=option]')).not.toBeNull();
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        tick(200);
        fixture.detectChanges();
        expect(input.value).toBe('Отделение №1 - г. Минск, ул. Монтажников, 2');
        expect(input.getAttribute('aria-expanded')).toBe('false');
        expect(fixture.nativeElement.querySelector('.dropdown-list')).toBeNull();
        expect(fixture.componentInstance.confirmationForm.get('postPlacement')!.value).toBe(907);
        expect(fixture.componentInstance.confirmationForm.get('postPlacementFilter')!.valid).toBeTrue();
    }));
});

describe('Phone checkout recovery', () => {
    let component: OrderConfirmationComponent;
    let orders: jasmine.SpyObj<OrderService>;
    let cart: jasmine.SpyObj<CartService>;
    let router: jasmine.SpyObj<Router>;
    const customer = { id: 'customer', firstName: 'Анна', secondName: 'Иванова', verifiedPhone: '+375290000001', contactEmail: null };
    beforeEach(() => {
        sessionStorage.removeItem('skviderm.checkout.customer');
        orders = jasmine.createSpyObj<OrderService>('orders', ['findCheckoutAttempt', 'quoteCart', 'confirmCheckout']);
        cart = jasmine.createSpyObj<CartService>('cart', ['clearAfterCheckout', 'refresh', 'flushPendingUpdates']);
        router = jasmine.createSpyObj<Router>('router', ['navigate']);
        router.navigate.and.resolveTo(true);
        component = new OrderConfirmationComponent(
            new FormBuilder(),
            orders,
            cart,
            {
                ready: Promise.resolve(),
                phoneCheckoutEnabled: true,
                getCurrentUser: () => of(customer),
                getCurrentUserSync: () => customer,
                isLoggedIn: () => true,
            } as unknown as AuthService,
            { show: jasmine.createSpy() } as unknown as ToastService,
            router,
            { getPostPlacements: () => of({ data: [] }) } as unknown as PostService,
            {} as PaymentService,
            {} as PromocodeService,
            {} as PromotionService,
            {} as LoginModalService,
            {} as GuestCheckoutService,
        );
        component.phoneCheckout = true;
    });
    afterEach(() => {
        component.ngOnDestroy();
        sessionStorage.removeItem('skviderm.checkout.customer');
    });
    it('uses fresh quote line prices alongside the checkout total', async () => {
        const oldItem = {
            product: { id: 'product' },
            variant: { id: 'variant', price: 10, promotionPrice: { finalCents: 875, savingCents: 125, promotionId: 'old' } },
            quantity: 2,
        } as OrderProductModel;
        const cartQuote = {
            items: [{ variantId: 'variant', quantity: 2 }],
            order: { products: [oldItem] },
        } as CartQuote;
        Object.defineProperty(cart, 'currentQuote', { value: cartQuote });
        component.cartItems$.next([oldItem]);
        const newItem = {
            ...oldItem,
            variant: { ...oldItem.variant, promotionPrice: { finalCents: 650, savingCents: 350, promotionId: 'new' } },
        };
        orders.quoteCart.and.resolveTo({
            ...cartQuote,
            order: { ...cartQuote.order, products: [newItem] },
            subtotalCents: 2000,
            promotionDiscountCents: 700,
            totalCents: 1300,
        });
        await component.refreshQuote();
        expect(component.getItemTotal(component.cartItems$.value[0])).toBe(13);
        expect(component.getCartTotal()).toBe(13);

        orders.quoteCart.and.resolveTo({
            ...cartQuote,
            order: {
                ...cartQuote.order,
                products: [{ ...newItem, variant: { id: 'variant', price: 10 } as OrderProductModel['variant'] }],
            },
            subtotalCents: 2000,
            promotionDiscountCents: 0,
            totalCents: 2000,
        });
        await component.refreshQuote();
        expect(component.getItemTotal(component.cartItems$.value[0])).toBe(20);
        expect(component.getCartTotal()).toBe(20);
    });
    it('can recover after a transient error despite an empty cart and invalid new-order form', async () => {
        sessionStorage.setItem(
            'skviderm.checkout.customer',
            JSON.stringify({ key: '11111111-1111-4111-8111-111111111111', cartId: '22222222-2222-4222-8222-222222222222' }),
        );
        orders.findCheckoutAttempt.and.callFake(async () => {
            throw { status: 503 };
        });
        await component.retryPreviousOrder();
        expect(component.hasPendingOrder).toBeTrue();
        expect(component.isSubmitting).toBeFalse();
        expect(component.confirmationForm.invalid).toBeTrue();
        orders.findCheckoutAttempt.and.resolveTo({ id: 'saved-order' } as OrderModel);
        await component.retryPreviousOrder();
        expect(router.navigate).toHaveBeenCalledWith(['/order', 'saved-order']);
        expect(cart.clearAfterCheckout).toHaveBeenCalledTimes(1);
        expect(orders.confirmCheckout).not.toHaveBeenCalled();
        expect(component.hasPendingOrder).toBeFalse();
    });
});
