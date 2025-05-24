import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { CartModel } from '../../models/cart.model';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-cart',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './cart.component.html',
    styleUrl: './cart.component.scss',
})
export class CartComponent {
    cartItems$: Observable<CartModel[]> = new Observable<CartModel[]>();
    totalPrice$: Observable<number> = of(0);

    constructor(
        private cartService: CartService,
        private authService: AuthService,
        private toastService: ToastService,
        private modalService: NgbModal,
        private router: Router,
    ) {
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

    getCartItemsCount(): Observable<number> {
        return this.cartService.getProductCount();
    }

    async checkout(): Promise<void> {
        await this.cartService.checkout();
    }

    goToOrderConfirmation(): void {
        if (!this.authService.isLoggedIn()) {
            this.toastService.show('Для оформления заказа необходимо войти в аккаунт', 'warning');
            return;
        }

        // const items = this.cartItems$.value;
        // if (!items || items.length === 0) {
        //     this.toastService.show('Корзина пуста', 'warning');
        //     return;
        // }

        this.modalService.dismissAll();

        this.router.navigate(['/order-confirmation']);
    }
}
