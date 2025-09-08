import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, debounceTime, map, Observable, Subject } from 'rxjs';
import { CartModel } from '../models/cart.model';
import { AuthService } from './auth.service';
import { OrderService } from './order.service';
import { OrderModel } from '../models/order.model';
import { LoginResponse } from '../models/login.interface';

@Injectable({
    providedIn: 'root',
})
export class CartService implements OnDestroy {
    private cartItemsSubject = new BehaviorSubject<CartModel[]>([]);
    private totalPriceSubject = new BehaviorSubject<number>(0);
    private quantitySubject = new Subject<CartModel[]>();
    private pendingUpdates: CartModel[] = [];

    constructor(
        private authService: AuthService,
        private orderService: OrderService,
    ) {
        this.authService.getLoginStatus().subscribe(isLoggedIn => {
            if (isLoggedIn) {
                this.loadInitialCart();
            }
        });

        this.loadInitialCart();

        this.quantitySubject.pipe(debounceTime(3000)).subscribe(async cartItems => {
            await this.processBatchQuantityChanges(cartItems);
        });
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

            if (order) {
                const updatedItems = order.products.map(item => ({
                    product: item.product,
                    variant: item.variant,
                    quantity: item.quantity,
                    totalPrice: item.quantity * item.variant.price,
                }));
                this.cartItemsSubject.next(updatedItems);
                this.totalPriceSubject.next(Number(order.totalPrice.toFixed(2)));
            }

            this.pendingUpdates = [];
        } catch (error) {
            console.error('Error processing batch quantity changes:', error);
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
                            totalPrice: item.quantity * item.variant.price,
                        }));
                        this.cartItemsSubject.next(items);
                        this.totalPriceSubject.next(Number(order.totalPrice.toFixed(2)));
                    }
                }
            },
            error: (error) => {
                console.error('Error loading initial cart: ', error);
                return [];
            },
            complete: () => {
                // this.loadInitialCart();
            }
        });
    }

    getCartItems(): Observable<CartModel[]> {
        return this.cartItemsSubject.asObservable();
    }

    getProductCount(): Observable<number> {
        return this.cartItemsSubject.pipe(map(items => items.reduce((sum, item) => sum + item.quantity, 0)));
    }

    getTotalPrice(): Observable<number> {
        return this.totalPriceSubject.asObservable();
    }

    async addProductToCart(variantId: string): Promise<void> {
        const order = await this.orderService.addProductToOrder(variantId);
        if (order) {
            const updatedItems = order.products.map(item => ({
                product: item.product,
                variant: item.variant,
                quantity: item.quantity,
                totalPrice: item.quantity * item.variant.price,
            }));
            this.cartItemsSubject.next(updatedItems);
            this.totalPriceSubject.next(Number(order.totalPrice.toFixed(2)));
            this.updateTotalPrice(updatedItems);
        } else {
            console.error('Error adding product to cart');
        }
    }

    increaseQuantity(cartItem: CartModel): void {
        const currentItems = this.cartItemsSubject.value;
        const updatedItems = currentItems.map(item => {
            if (item.variant.id === cartItem.variant.id) {
                return {
                    ...item,
                    quantity: item.quantity + 1,
                    totalPrice: (item.quantity + 1) * item.variant.price,
                };
            }
            return item;
        });

        cartItem.quantity += 1;
        cartItem.totalPrice = cartItem.quantity * cartItem.variant.price;

        this.cartItemsSubject.next(updatedItems);
        this.updateTotalPrice(updatedItems);
        this.addToPendingUpdates(cartItem);
    }

    decreaseQuantity(cartItem: CartModel): void {
        if (cartItem.quantity <= 1) return;

        const currentItems = this.cartItemsSubject.value;
        const updatedItems = currentItems.map(item => {
            if (item.variant.id === cartItem.variant.id) {
                return {
                    ...item,
                    quantity: item.quantity - 1,
                    totalPrice: (item.quantity - 1) * item.variant.price,
                };
            }
            return item;
        });

        cartItem.quantity -= 1;
        cartItem.totalPrice = cartItem.quantity * cartItem.variant.price;

        this.cartItemsSubject.next(updatedItems);
        this.updateTotalPrice(updatedItems);
        this.addToPendingUpdates(cartItem);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async updateQuantity(productId: string, quantity: number): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async removeProduct(cartItem: CartModel): Promise<void> {
        const order = await this.orderService.removeProduct(cartItem.variant.id);
        if (order) {
            const updatedItems = order.products.map(item => ({
                product: item.product,
                variant: item.variant,
                quantity: item.quantity,
                totalPrice: item.quantity * item.variant.price,
            }));
            this.cartItemsSubject.next(updatedItems);
            this.totalPriceSubject.next(Number(order.totalPrice.toFixed(2)));
        }
    }

    private updateTotalPrice(items: CartModel[]): void {
        const total = Number(items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));
        this.totalPriceSubject.next(total);
    }

    async syncOrder(): Promise<void> {
        await this.orderService.syncOrder();
        this.cartItemsSubject.next([]);
        this.totalPriceSubject.next(0);
    }

    async checkout(): Promise<OrderModel | null> {
        const order = await this.orderService.checkout();
        if (order) {
            this.cartItemsSubject.next([]);
            this.totalPriceSubject.next(0);
            this.pendingUpdates = [];
        } else {
            console.error('Error during checkout');
        }
        return order;
    }

    ngOnDestroy(): void {
        this.quantitySubject.complete();
        this.cartItemsSubject.complete();
        this.totalPriceSubject.complete();
    }
}
