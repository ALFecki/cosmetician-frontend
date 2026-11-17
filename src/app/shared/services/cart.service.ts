import { GuestCheckoutService } from './guest-checkout.service';
import { CartItemInput, CartQuote, CheckoutRequest } from '../models/checkout.model';
import { apiMessage } from '../utils/api-message';
import { ToastService } from './toast.service';
import { Injectable, OnDestroy, signal } from '@angular/core';
import { BehaviorSubject, debounceTime, firstValueFrom, map, Observable, Subject, Subscription } from 'rxjs';
import { CartModel } from '../models/cart.model';
import { LoginResponse } from '../models/login.interface';
import { OrderModel } from '../models/order.model';
import { calculateDiscountedPrice } from '../utils/promotion.utils';
import { AuthService } from './auth.service';
import { OrderService } from './order.service';

@Injectable({
    providedIn: 'root',
})
export class CartService implements OnDestroy {
    private cartItemsSubject = new BehaviorSubject<CartModel[]>([]);
    private totalPriceSubject = new BehaviorSubject<number>(0);
    private discountAmountSubject = new BehaviorSubject<number>(0);
    private quantitySubject = new Subject<CartModel[]>();
    private pendingUpdates: CartModel[] = [];
    private readonly pendingAddition = signal<string | null>(null);
    readonly addingVariantId = this.pendingAddition.asReadonly();
    readonly quote$ = new BehaviorSubject<CartQuote | null>(null);
    readonly error$ = new BehaviorSubject<string | null>(null);
    readonly ready: Promise<void>;
    private operations: Promise<unknown> = Promise.resolve();
    private operationError: unknown = null;
    private generation = 0;
    private subscriptions = new Subscription();
    private guestPromo: string | null = null;
    private readonly guestKey = 'skviderm.guest-cart.v1';
    get enabled(): boolean {
        return this.authService.phoneCheckoutEnabled;
    }
    get currentQuote(): CartQuote | null {
        return this.quote$.value;
    }
    get hasUnavailableItems(): boolean {
        return !!this.currentQuote?.unavailableItems.length;
    }
    private storageChanged = (event: StorageEvent): void => {
        if (event.key === this.guestKey || event.key === 'isAuthenticated') {
            if (event.key === 'isAuthenticated' && !event.newValue) this.clearPrivateCart();
            void this.refresh().catch(() => undefined);
        }
    };

    constructor(
        private authService: AuthService,
        private orderService: OrderService,
        private toastService: ToastService,
        private guestCheckout: GuestCheckoutService,
    ) {
        this.ready = this.initialize();
        this.subscriptions.add(
            this.authService.getLoginStatus().subscribe(loggedIn => {
                if (loggedIn) {
                    this.generation++;
                    void this.refresh().catch(() => undefined);
                }
            }),
        );
        this.subscriptions.add(
            this.authService.getLogoutStatus().subscribe(loggedOut => {
                if (loggedOut) this.clearPrivateCart();
            }),
        );
        if (typeof window !== 'undefined') window.addEventListener('storage', this.storageChanged);
        this.subscriptions.add(
            this.quantitySubject.pipe(debounceTime(3000)).subscribe(cartItems => {
                void this.processBatchQuantityChanges(cartItems).catch(error => this.reportError(error));
            }),
        );
    }

    private async initialize(): Promise<void> {
        await this.authService.ready;
        try {
            await firstValueFrom(this.authService.checkAuth());
            if (this.enabled) await this.withGuestLock(() => this.loadPhoneCart());
            else await this.loadInitialCart();
        } catch (error) {
            this.reportError(error);
        }
    }

    private reportError(error: unknown): void {
        this.operationError = error;
        const message = apiMessage(error);
        this.error$.next(message);
        this.toastService.show(message, 'error');
    }

    private enqueue<T>(operation: () => Promise<T>): Promise<T> {
        const result = this.operations.then(async () => {
            await this.ready;
            this.operationError = null;
            try {
                return await operation();
            } catch (error) {
                this.reportError(error);
                throw error;
            }
        });
        this.operations = result.catch(() => undefined);
        return result;
    }

    private async withGuestLock<T>(operation: () => Promise<T>): Promise<T> {
        if (typeof navigator !== 'undefined' && navigator.locks) return await navigator.locks.request('skviderm-guest-cart', operation);
        return operation();
    }

    private readGuest(): { mergeId: string; items: CartItemInput[] } | null {
        if (typeof window === 'undefined') return null;
        const raw = localStorage.getItem(this.guestKey);
        if (!raw) return null;
        const value: unknown = JSON.parse(raw);
        const saved = value as { mergeId?: unknown; items?: unknown };
        if (typeof saved.mergeId !== 'string' || !Array.isArray(saved.items) || saved.items.length > 100)
            throw new Error('Invalid guest cart');
        const items = saved.items.map(item => {
            if (
                typeof item.variantId !== 'string' ||
                !/^[0-9a-f-]{36}$/i.test(item.variantId) ||
                !Number.isInteger(item.quantity) ||
                item.quantity < 1 ||
                item.quantity > 99
            )
                throw new Error('Invalid guest cart item');
            return { variantId: item.variantId as string, quantity: item.quantity as number };
        });
        return { mergeId: saved.mergeId, items };
    }

    private applyQuote(quote: CartQuote): void {
        this.quote$.next(quote);
        this.orderService.currentOrder = quote.order;
        this.cartItemsSubject.next(
            quote.order.products.map(item => ({
                product: item.product,
                variant: item.variant,
                quantity: item.quantity,
                totalPrice: this.getRowTotal(item.product, item.variant.price, item.quantity),
            })),
        );
        this.totalPriceSubject.next(quote.totalCents / 100);
        this.discountAmountSubject.next((quote.promotionDiscountCents + quote.promoCodeDiscountCents) / 100);
        this.error$.next(quote.promoCodeError);
    }

    private async loadPhoneCart(): Promise<void> {
        const generation = this.generation;
        await this.guestCheckout.ready;
        let guest = this.readGuest();
        if (guest?.items.length) await this.guestCheckout.restore();
        if (guest?.items.length && this.guestCheckout.session) {
            const completed = await this.guestCheckout.findAttempt(guest.mergeId);
            if (generation !== this.generation) return;
            if (completed) {
                this.removePurchasedGuest(
                    guest.mergeId,
                    completed.products.map(item => ({ variantId: item.variant.id, quantity: item.quantity })),
                );
                guest = this.readGuest();
            }
        }
        let quote: CartQuote;
        if (this.authService.isLoggedIn()) {
            if (guest?.items.length) {
                try {
                    quote = await this.orderService.mergeCheckoutCart(guest.mergeId, guest.items);
                } catch (error) {
                    if (generation !== this.generation) return;
                    if ((error as { status: number }).status === 400) {
                        const pending = await this.orderService.quoteCart({ items: guest.items, promoCode: this.guestPromo });
                        if (generation === this.generation) this.applyQuote(pending);
                    }
                    throw error;
                }
                if (generation !== this.generation) return;
                if (this.readGuest()?.mergeId === guest.mergeId) localStorage.removeItem(this.guestKey);
                if (this.guestPromo)
                    quote = await this.orderService.replaceCheckoutCart(
                        quote.order.id,
                        quote.order.cartRevision!,
                        quote.items,
                        this.guestPromo,
                    );
            } else quote = await this.orderService.getCheckoutCart();
        } else quote = await this.orderService.quoteCart({ items: guest?.items || [], promoCode: this.guestPromo });
        if (generation === this.generation) this.applyQuote(quote);
    }

    refresh(): Promise<void> {
        return this.enqueue(async () => {
            await firstValueFrom(this.authService.checkAuth());
            if (this.enabled) await this.withGuestLock(() => this.loadPhoneCart());
            else await this.loadInitialCart();
        });
    }

    private async addCheckoutItem(cartId: string, variantId: string, generation: number): Promise<void> {
        const operationId = crypto.randomUUID();
        try {
            const quote = await this.orderService.addCheckoutCartItem(cartId, variantId, operationId).catch(error => {
                const status = (error as { status?: number } | null)?.status;
                if (generation === this.generation && status !== undefined && [0, 502, 503, 504].includes(status)) {
                    return this.orderService.addCheckoutCartItem(cartId, variantId, operationId);
                }
                throw error;
            });
            if (generation === this.generation) this.applyQuote(quote);
        } catch (error) {
            if (generation !== this.generation) return;
            if ((error as { status?: number } | null)?.status === 409) {
                const quote = await this.orderService.getCheckoutCart();
                if (generation !== this.generation) return;
                this.applyQuote(quote);
            }
            throw error;
        }
    }

    private changePhoneCart(variantId: string, delta: number | null): Promise<void> {
        const generation = this.generation;
        const cartId = this.currentQuote?.itemAddAvailable === true ? this.currentQuote.order.id : undefined;
        return this.enqueue(() =>
            this.withGuestLock(async () => {
                if (generation !== this.generation) return;
                if (
                    this.authService.isLoggedIn() &&
                    (this.readGuest()?.items.length ||
                        !this.currentQuote ||
                        this.currentQuote.order.personId !== this.authService.getCurrentUserSync()?.id)
                ) {
                    try {
                        await this.loadPhoneCart();
                    } catch (error) {
                        if (generation !== this.generation) return;
                        const pending = this.readGuest();
                        if ((error as { status: number }).status !== 400 || delta !== null || !pending) throw error;
                        localStorage.setItem(
                            this.guestKey,
                            JSON.stringify({ mergeId: pending.mergeId, items: pending.items.filter(item => item.variantId !== variantId) }),
                        );
                        await this.loadPhoneCart();
                        return;
                    }
                }
                if (generation !== this.generation) return;
                const current = this.currentQuote;
                if (delta === 1 && this.authService.isLoggedIn() && current?.itemAddAvailable === true) {
                    await this.addCheckoutItem(cartId ?? current.order.id, variantId, generation);
                    return;
                }
                const guest = this.readGuest();
                const items = (this.authService.isLoggedIn() ? current?.items || [] : guest?.items || []).map(item => ({
                    ...item,
                }));
                const index = items.findIndex(item => item.variantId === variantId);
                if (delta === null) {
                    if (index >= 0) items.splice(index, 1);
                } else if (index >= 0) items[index].quantity = Math.max(1, Math.min(99, items[index].quantity + delta));
                else if (delta > 0) items.push({ variantId, quantity: delta });
                if (items.length > 100) throw new Error('Too many cart items');
                let quote: CartQuote;
                if (this.authService.isLoggedIn()) {
                    quote = await this.orderService.replaceCheckoutCart(
                        current!.order.id,
                        current!.order.cartRevision!,
                        items,
                        current!.promoCode,
                    );
                } else {
                    localStorage.setItem(this.guestKey, JSON.stringify({ mergeId: guest?.mergeId || crypto.randomUUID(), items }));
                    quote = await this.orderService.quoteCart({ items, promoCode: this.guestPromo });
                }
                if (generation === this.generation) this.applyQuote(quote);
            }),
        );
    }

    removeUnavailable(variantId: string): Promise<void> {
        return this.changePhoneCart(variantId, null);
    }

    applyPhonePromocode(code: string | null): Promise<void> {
        const generation = this.generation;
        return this.enqueue(() =>
            this.withGuestLock(async () => {
                if (generation !== this.generation) return;
                if (!this.currentQuote) await this.loadPhoneCart();
                if (generation !== this.generation) return;
                const current = this.currentQuote!;
                const promo = code?.trim() || null;
                const quote = this.authService.isLoggedIn()
                    ? await this.orderService.replaceCheckoutCart(current.order.id, current.order.cartRevision!, current.items, promo)
                    : await this.orderService.quoteCart({ items: this.readGuest()?.items || [], promoCode: promo });
                if (generation !== this.generation) return;
                this.guestPromo = promo;
                this.applyQuote(quote);
            }),
        );
    }

    async flushPendingUpdates(): Promise<void> {
        await this.ready;
        await this.operations;
        if (this.operationError) throw this.operationError;
        if (!this.enabled && this.pendingUpdates.length) await this.processBatchQuantityChanges([...this.pendingUpdates]);
    }

    get guestCartId(): string | null {
        return this.readGuest()?.mergeId || null;
    }

    private removePurchasedGuest(cartId: string, ordered: CartItemInput[]): void {
        const guest = this.readGuest();
        if (!guest || guest.mergeId !== cartId) return;
        const items = guest.items
            .map(item => ({
                ...item,
                quantity: item.quantity - (ordered.find(row => row.variantId === item.variantId)?.quantity || 0),
            }))
            .filter(item => item.quantity > 0);
        if (items.length) localStorage.setItem(this.guestKey, JSON.stringify({ mergeId: crypto.randomUUID(), items }));
        else localStorage.removeItem(this.guestKey);
    }

    async clearAfterCheckout(purchased?: { cartId: string; items: CartItemInput[] }): Promise<void> {
        if (purchased || !this.authService.isLoggedIn()) {
            await this.enqueue(() =>
                this.withGuestLock(async () => {
                    const guest = this.readGuest();
                    if (guest) this.removePurchasedGuest(purchased?.cartId || guest.mergeId, purchased?.items || guest.items);
                    this.clearPrivateCart();
                    await this.loadPhoneCart();
                }),
            );
        } else this.clearPrivateCart();
    }

    confirmGuestCheckout(request: CheckoutRequest): Promise<OrderModel> {
        return this.enqueue(() =>
            this.withGuestLock(async () => {
                let order = await this.guestCheckout.findAttempt(request.checkoutKey);
                if (!order) {
                    if (this.readGuest()?.mergeId !== request.cartId)
                        throw new Error('Корзина изменилась. Обновите страницу перед оформлением.');
                    order = await this.guestCheckout.checkout(request);
                }
                this.removePurchasedGuest(
                    request.cartId,
                    order.products.map(item => ({ variantId: item.variant.id, quantity: item.quantity })),
                );
                this.clearPrivateCart();
                // The order is already committed; refreshing the remaining cart may be retried independently.
                void this.refresh().catch(() => undefined);
                return order;
            }),
        );
    }

    claimGuestOrders(): Promise<{ claimed: number }> {
        return this.enqueue(() =>
            this.withGuestLock(async () => {
                await this.loadPhoneCart();
                return this.guestCheckout.claim();
            }),
        );
    }

    private clearPrivateCart(): void {
        this.generation++;
        this.quote$.next(null);
        this.orderService.currentOrder = null;
        this.cartItemsSubject.next([]);
        this.totalPriceSubject.next(0);
        this.discountAmountSubject.next(0);
        this.pendingUpdates = [];
        this.guestPromo = null;
        this.operationError = null;
        this.error$.next(null);
    }

    private async processBatchQuantityChanges(cartItems: CartModel[]): Promise<void> {
        try {
            const changes = cartItems.reduce(
                (acc, item) => {
                    acc[item.variant.id] = item.quantity;
                    return acc;
                },
                {} as Record<string, number>,
            );

            const order = await this.orderService.changeBatchQuantities(changes);

            if (!order) throw new Error('Не удалось сохранить количество товаров');
            if (order) {
                const updatedItems = order.products.map(item => ({
                    product: item.product,
                    variant: item.variant,
                    quantity: item.quantity,
                    totalPrice: this.getRowTotal(item.product, item.variant.price, item.quantity),
                }));
                this.cartItemsSubject.next(updatedItems);
                this.totalPriceSubject.next(Number(order.totalPrice.toFixed(2)));
                this.discountAmountSubject.next(Number((order.discountAmount || 0).toFixed(2)));
            }

            this.pendingUpdates = [];
        } catch (error) {
            this.reportError(error);
            throw error;
        }
    }

    private addToPendingUpdates(cartItem: CartModel): void {
        const existingIndex = this.pendingUpdates.findIndex(item => item.variant.id === cartItem.variant.id);

        if (existingIndex !== -1) {
            this.pendingUpdates[existingIndex] = cartItem;
        } else {
            this.pendingUpdates.push(cartItem);
        }

        this.quantitySubject.next(this.pendingUpdates);
    }

    private async loadInitialCart(): Promise<void> {
        this.authService.checkAuth().subscribe({
            next: async (isAuthenticated: LoginResponse | null) => {
                if (isAuthenticated) {
                    const order = await this.orderService.getLastNotCheckedOrder().toPromise();
                    if (order) {
                        const items = order.products.map(item => ({
                            product: item.product,
                            variant: item.variant,
                            quantity: item.quantity,
                            totalPrice: this.getRowTotal(item.product, item.variant.price, item.quantity),
                        }));
                        this.cartItemsSubject.next(items);
                        this.totalPriceSubject.next(Number(order.totalPrice.toFixed(2)));
                        this.discountAmountSubject.next(Number((order.discountAmount || 0).toFixed(2)));
                    }
                }
            },
            error: error => {
                console.error('Error loading initial cart: ', error);
                return [];
            },
            complete: () => {
                // this.loadInitialCart();
            },
        });
    }

    getCartItems(): Observable<CartModel[]> {
        return this.cartItemsSubject.asObservable();
    }

    getProductCount(): Observable<number> {
        return this.cartItemsSubject.pipe(
            map(items =>
                this.enabled
                    ? (this.currentQuote?.items || []).reduce((sum, item) => sum + item.quantity, 0)
                    : items.reduce((sum, item) => sum + item.quantity, 0),
            ),
        );
    }

    getTotalPrice(): Observable<number> {
        return this.totalPriceSubject.asObservable();
    }

    getDiscountAmount(): Observable<number> {
        return this.discountAmountSubject.asObservable();
    }

    getTotalWithoutDiscount(): Observable<number> {
        return new Observable<number>(observer => {
            observer.next(this.totalPriceSubject.value + this.discountAmountSubject.value);
            observer.complete();
        });
    }

    async addProductToCart(variantId: string, showSuccess = true): Promise<void> {
        if (this.pendingAddition() !== null) return;
        this.pendingAddition.set(variantId);
        const generation = this.generation;
        try {
            await this.ready;
            if (generation !== this.generation) return;
            if (this.enabled) {
                await this.changePhoneCart(variantId, 1);
                if (showSuccess && generation === this.generation) this.toastService.show('Товар добавлен в корзину', 'success');
                return;
            }
            const order = await this.orderService.addProductToOrder(variantId);
            if (order) {
                const updatedItems = order.products.map(item => ({
                    product: item.product,
                    variant: item.variant,
                    quantity: item.quantity,
                    totalPrice: this.getRowTotal(item.product, item.variant.price, item.quantity),
                }));
                this.cartItemsSubject.next(updatedItems);
                this.totalPriceSubject.next(Number(order.totalPrice.toFixed(2)));
                this.discountAmountSubject.next(Number((order.discountAmount || 0).toFixed(2)));
            } else {
                console.error('Error adding product to cart');
            }
        } finally {
            this.pendingAddition.set(null);
        }
    }

    increaseQuantity(cartItem: CartModel): void {
        if (this.enabled) {
            void this.addProductToCart(cartItem.variant.id, false).catch(() => undefined);
            return;
        }
        const currentItems = this.cartItemsSubject.value;
        const updatedItems = currentItems.map(item => {
            if (item.variant.id === cartItem.variant.id) {
                return {
                    ...item,
                    quantity: item.quantity + 1,
                    totalPrice: this.getRowTotal(item.product, item.variant.price, item.quantity + 1),
                };
            }
            return item;
        });

        cartItem.quantity += 1;
        cartItem.totalPrice = this.getRowTotal(cartItem.product, cartItem.variant.price, cartItem.quantity);

        this.totalPriceSubject.next(
            Number((this.totalPriceSubject.value + this.getRowTotal(cartItem.product, cartItem.variant.price, 1)).toFixed(2)),
        );
        this.cartItemsSubject.next(updatedItems);
        this.addToPendingUpdates(cartItem);
    }

    decreaseQuantity(cartItem: CartModel): void {
        if (this.enabled) {
            void this.changePhoneCart(cartItem.variant.id, -1).catch(() => undefined);
            return;
        }
        if (cartItem.quantity <= 1) return;

        const currentItems = this.cartItemsSubject.value;
        const updatedItems = currentItems.map(item => {
            if (item.variant.id === cartItem.variant.id) {
                return {
                    ...item,
                    quantity: item.quantity - 1,
                    totalPrice: this.getRowTotal(item.product, item.variant.price, item.quantity - 1),
                };
            }
            return item;
        });

        cartItem.quantity -= 1;
        cartItem.totalPrice = this.getRowTotal(cartItem.product, cartItem.variant.price, cartItem.quantity);

        this.totalPriceSubject.next(
            Number((this.totalPriceSubject.value - this.getRowTotal(cartItem.product, cartItem.variant.price, 1)).toFixed(2)),
        );
        this.cartItemsSubject.next(updatedItems);
        this.addToPendingUpdates(cartItem);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async updateQuantity(productId: string, quantity: number): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async removeProduct(cartItem: CartModel): Promise<void> {
        if (this.enabled) {
            await this.changePhoneCart(cartItem.variant.id, null);
            return;
        }
        const order = await this.orderService.removeProduct(cartItem.variant.id);
        if (order) {
            const updatedItems = order.products.map(item => ({
                product: item.product,
                variant: item.variant,
                quantity: item.quantity,
                totalPrice: this.getRowTotal(item.product, item.variant.price, item.quantity),
            }));
            this.cartItemsSubject.next(updatedItems);
            this.totalPriceSubject.next(Number(order.totalPrice.toFixed(2)));
            this.discountAmountSubject.next(Number((order.discountAmount || 0).toFixed(2)));
        }
    }

    private getRowTotal(product: CartModel['product'], price: number, quantity: number): number {
        const priceInfo = calculateDiscountedPrice(price, product.promotions);
        return Number(((priceInfo.discountedPrice ?? priceInfo.originalPrice) * quantity).toFixed(2));
    }

    async syncOrder(): Promise<void> {
        await this.orderService.syncOrder();
        this.cartItemsSubject.next([]);
        this.totalPriceSubject.next(0);
        this.discountAmountSubject.next(0);
    }

    async checkout(withPayment = false): Promise<OrderModel | null> {
        const order = await this.orderService.checkout(withPayment);
        if (order) {
            this.cartItemsSubject.next([]);
            this.totalPriceSubject.next(0);
            this.discountAmountSubject.next(0);
            this.pendingUpdates = [];
        } else {
            console.error('Error during checkout');
        }
        return order;
    }

    ngOnDestroy(): void {
        this.generation++;
        this.subscriptions.unsubscribe();
        if (typeof window !== 'undefined') window.removeEventListener('storage', this.storageChanged);
        this.quote$.complete();
        this.error$.complete();
        this.quantitySubject.complete();
        this.cartItemsSubject.complete();
        this.totalPriceSubject.complete();
        this.discountAmountSubject.complete();
    }
}
