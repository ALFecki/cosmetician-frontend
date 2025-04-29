import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, debounceTime, firstValueFrom, map, Observable, Subject } from 'rxjs';
import { CartModel } from '../models/cart.model';
import { AuthService } from './auth.service';
import { OrderService } from './order.service';

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
        this.loadInitialCart();

        this.quantitySubject.pipe(debounceTime(3000)).subscribe(async cartItems => {
            await this.processBatchQuantityChanges(cartItems);
        });
    }

    private async processBatchQuantityChanges(cartItems: CartModel[]): Promise<void> {
        try {
            const changes = cartItems.reduce(
                (acc, item) => {
                    acc[item.product.id] = item.quantity;
                    return acc;
                },
                {} as Record<string, number>,
            );

            const order = await this.orderService.changeBatchQuantities(changes);

            if (order) {
                const updatedItems = order.products.map(item => ({
                    product: item.product,
                    quantity: item.quantity,
                    totalPrice: item.quantity * item.product.price,
                }));
                this.cartItemsSubject.next(updatedItems);
                this.totalPriceSubject.next(order.totalPrice);
            }

            this.pendingUpdates = [];
        } catch (error) {
            console.error('Error processing batch quantity changes:', error);
        }
    }

    private addToPendingUpdates(cartItem: CartModel): void {
        const existingIndex = this.pendingUpdates.findIndex(item => item.product.id === cartItem.product.id);

        if (existingIndex !== -1) {
            this.pendingUpdates[existingIndex] = cartItem;
        } else {
            this.pendingUpdates.push(cartItem);
        }

        this.quantitySubject.next(this.pendingUpdates);
    }

    private async loadInitialCart(): Promise<void> {
        await firstValueFrom(this.authService.checkAuth());
        const order = await this.orderService.getLastNotCheckedOrder().toPromise();
        if (order) {
            const items = order.products.map(item => ({
                product: item.product,
                quantity: item.quantity,
                totalPrice: item.quantity * item.product.price,
            }));
            this.cartItemsSubject.next(items);
            this.totalPriceSubject.next(order.totalPrice);
        }
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

    async addProductToCart(productId: string): Promise<void> {
        const order = await this.orderService.addProductToOrder(productId);
        if (order) {
            const updatedItems = order.products.map(item => ({
                product: item.product,
                quantity: item.quantity,
                totalPrice: item.quantity * item.product.price,
            }));
            this.cartItemsSubject.next(updatedItems);
            this.totalPriceSubject.next(order.totalPrice);
            this.updateTotalPrice(updatedItems);
        } else {
            console.error('Error adding product to cart');
        }
    }

    increaseQuantity(cartItem: CartModel): void {
        const currentItems = this.cartItemsSubject.value;
        const updatedItems = currentItems.map(item => {
            if (item.product.id === cartItem.product.id) {
                return {
                    ...item,
                    quantity: item.quantity + 1,
                    totalPrice: (item.quantity + 1) * item.product.price,
                };
            }
            return item;
        });

        cartItem.quantity += 1;
        cartItem.totalPrice = cartItem.quantity * cartItem.product.price;

        this.cartItemsSubject.next(updatedItems);
        this.updateTotalPrice(updatedItems);
        this.addToPendingUpdates(cartItem);
    }

    decreaseQuantity(cartItem: CartModel): void {
        if (cartItem.quantity <= 1) return;

        const currentItems = this.cartItemsSubject.value;
        const updatedItems = currentItems.map(item => {
            if (item.product.id === cartItem.product.id) {
                return {
                    ...item,
                    quantity: item.quantity - 1,
                    totalPrice: (item.quantity - 1) * item.product.price,
                };
            }
            return item;
        });

        cartItem.quantity -= 1;
        cartItem.totalPrice = cartItem.quantity * cartItem.product.price;

        this.cartItemsSubject.next(updatedItems);
        this.updateTotalPrice(updatedItems);
        this.addToPendingUpdates(cartItem);
    }

    async removeProduct(cartItem: CartModel): Promise<void> {
        const order = await this.orderService.removeProduct(cartItem.product.id);
        if (order) {
            const updatedItems = order.products.map(item => ({
                product: item.product,
                quantity: item.quantity,
                totalPrice: item.quantity * item.product.price,
            }));
            this.cartItemsSubject.next(updatedItems);
            this.totalPriceSubject.next(order.totalPrice);
        }
    }

    private updateTotalPrice(items: CartModel[]): void {
        const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
        this.totalPriceSubject.next(total);
    }

    ngOnDestroy(): void {
        this.quantitySubject.complete();
        this.cartItemsSubject.complete();
        this.totalPriceSubject.complete();
    }
}
