import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map, Observable } from 'rxjs';
import { CartModel } from '../../models/cart.model';
import { ProductModel } from '../../models/product.model';
import { OrderService } from '../../services/order.service';

@Component({
    selector: 'app-cart',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './cart.component.html',
    styleUrl: './cart.component.scss',
})
export class CartComponent {
    @Input() products$: Observable<ProductModel[]> = new Observable<ProductModel[]>();
    cartItems$: Observable<CartModel[]> = new Observable<CartModel[]>();
    totalPrice = 0;

    orderService = inject(OrderService);

    constructor() {
        this.cartItems$ = this.orderService.getLastNotCheckedOrder('213c8e05-c675-455d-9560-91ceab35d04e').pipe(
            map(order => {
                if (order) {
                    this.totalPrice = order.totalPrice;
                    return order.products.map(item => {
                        console.log('item', item);
                        console.log('quantity', item.quantity);
                        return {
                            product: item.product,
                            quantity: item.quantity,
                            totalPrice: item.quantity * item.product.price,
                        };
                    });
                } else {
                    return [];
                }
            }),
        );

        this.cartItems$.subscribe(items => {
            console.log('Cart items:', items);
        });
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
