import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { map, Observable } from 'rxjs';
import { CartModel } from '../../models/cart.model';
import { ProductModel } from '../../models/product.model';

@Component({
    selector: 'app-cart',
    standalone: true,
    imports: [CommonModule, BrowserModule, FormsModule],
    templateUrl: './cart.component.html',
    styleUrl: './cart.component.scss',
})
export class CartComponent {
    @Input() products$: Observable<ProductModel[]> = new Observable<ProductModel[]>();
    cartItems$: Observable<CartModel[]> = new Observable<CartModel[]>();
    totalPrice = 0;

    constructor() {
        this.cartItems$ = this.products$.pipe(
            map((products: ProductModel[]) => {
                const cartItems: CartModel[] = [];
                products.forEach((product: ProductModel) => {
                    const existingItem = cartItems.find(item => item.product.id === product.id);
                    if (existingItem) {
                        existingItem.quantity++;
                        existingItem.totalPrice += product.price;
                    } else {
                        cartItems.push({
                            product: product,
                            quantity: 1,
                            totalPrice: product.price,
                        });
                    }
                    this.totalPrice += product.price;
                });
                return cartItems;
            }),
        );
    }

    increaseQuantity(cartItem: CartModel): void {
        cartItem.quantity++;
        cartItem.totalPrice += cartItem.product.price;
        this.totalPrice += cartItem.product.price;
    }

    decreaseQuantity(cartItem: CartModel): void {
        if (cartItem.quantity > 1) {
            cartItem.quantity--;
            cartItem.totalPrice -= cartItem.product.price;
            this.totalPrice -= cartItem.product.price;
        } else {
            this.removeItem(cartItem);
        }
    }

    removeItem(cartItem: CartModel): void {
        this.cartItems$ = this.cartItems$.pipe(map((items: CartModel[]) => items.filter(item => item.product.id !== cartItem.product.id)));
        this.totalPrice -= cartItem.totalPrice;
    }

    checkout(): void {
        // Implement checkout logic here
        console.log('Checkout process initiated');
        throw new Error('Method not implemented.');
    }
}
