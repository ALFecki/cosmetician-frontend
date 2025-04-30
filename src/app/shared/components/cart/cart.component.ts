import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { CartModel } from '../../models/cart.model';
import { CartService } from '../../services/cart.service';

@Component({
    selector: 'app-cart',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './cart.component.html',
    styleUrl: './cart.component.scss',
})
export class CartComponent {
    cartItems$: Observable<CartModel[]> = new Observable<CartModel[]>();
    totalPrice$: Observable<number> = of(0);

    constructor(private cartService: CartService) {
        this.cartItems$ = this.cartService.getCartItems();
        this.totalPrice$ = this.cartService.getTotalPrice();
    }

    increaseQuantity(cartItem: CartModel): void {
        this.cartService.increaseQuantity(cartItem);
    }

    decreaseQuantity(cartItem: CartModel): void {
        this.cartService.decreaseQuantity(cartItem);
    }

    removeProduct(cartItem: CartModel): void {
        this.cartService.removeProduct(cartItem);
    }

    async checkout(): Promise<void> {
        await this.cartService.checkout();
    }
}
