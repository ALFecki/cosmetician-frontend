import { Injectable, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, firstValueFrom, map, Observable, Subject } from 'rxjs';
import { debounceTime } from 'rxjs';
import { CartModel } from '../models/cart.model';
import { OrderService } from './order.service';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root',
})
export class CartService implements OnDestroy {
    private cartItemsSubject = new BehaviorSubject<CartModel[]>([]);
    private totalPriceSubject = new BehaviorSubject<number>(0);
    private quantitySubject = new Subject<CartModel>();
    
    constructor(private authService: AuthService, private orderService: OrderService) {
        this.loadInitialCart();

        this.quantitySubject.pipe(debounceTime(3000)).subscribe(async cartItem => {
            await this.processQuantityChange(cartItem);
        });
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
        return this.cartItemsSubject.pipe(
            map(items => items.reduce((sum, item) => sum + item.quantity, 0))
        );
    }

    getTotalPrice(): Observable<number> {
        return this.totalPriceSubject.asObservable();
    }

    private async processQuantityChange(cartItem: CartModel): Promise<void> {
        const order = await this.orderService.changeQuantity(cartItem.product.id, cartItem.quantity);
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
        
        this.cartItemsSubject.next(updatedItems);
        this.updateTotalPrice(updatedItems);
        this.quantitySubject.next(cartItem);
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

        this.cartItemsSubject.next(updatedItems);
        this.updateTotalPrice(updatedItems);
        this.quantitySubject.next(cartItem);
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