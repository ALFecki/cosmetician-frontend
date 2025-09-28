import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgbActiveModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { IconsModule } from '../../base/icons/icons.module';
import { CartModel } from '../../models/cart.model';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { LoginModalService } from '../../services/login-modal.service';
import { ToastService } from '../../services/toast.service';
import { VerifyEmailModalService } from '../../services/verify-email-modal.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';

@Component({
    selector: 'app-cart-modal',
    templateUrl: './cart-modal.component.html',
    styleUrls: ['./cart-modal.component.scss'],
    imports: [CommonModule, RouterModule, NgbModalModule, FormsModule, IconsModule, ImageUrlPipe],
})
export class CartModalComponent implements OnInit {
    cartItems$: Observable<CartModel[]> = new Observable<CartModel[]>();
    totalPrice$: Observable<number> = new Observable<number>();

    constructor(
        private cartService: CartService,
        private router: Router,
        public activeModal: NgbActiveModal,
        private authService: AuthService,
        private loginModalService: LoginModalService,
        private toastService: ToastService,
        private verifyEmailModalService: VerifyEmailModalService,
    ) {}

    ngOnInit(): void {
        this.cartItems$ = this.cartService.getCartItems();
        this.totalPrice$ = this.cartService.getTotalPrice();
    }

    increaseQuantity(item: CartModel): void {
        this.cartService.increaseQuantity(item);
    }

    decreaseQuantity(item: CartModel): void {
        if (item.quantity > 1) {
            this.cartService.decreaseQuantity(item);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateQuantity(item: CartModel, event: any): void {
        const quantity = parseInt(event.target.value);
        if (quantity > 0) {
            this.cartService.updateQuantity(item.product.id, quantity);
        }
    }

    removeProduct(item: CartModel): void {
        this.cartService.removeProduct(item);
    }

    getTotalItemsCount(): Observable<number> {
        return this.cartService.getProductCount();
    }

    goToCart(): void {
        this.activeModal.close();
        this.router.navigate(['/cart']);
    }

    goToOrderConfirmation(): void {
        if (!this.authService.isLoggedIn()) {
            this.activeModal.close();
            this.loginModalService.openLoginModal();
            return;
        }

        const user = this.authService.getCurrentUserSync();

        if (user && !user.isEmailVerified) {
            this.toastService.show('Для оформления заказа необходимо подтвердить email', 'warning');
            this.activeModal.close();
            this.verifyEmailModalService.openVerifyEmailModal().subscribe(verified => {
                if (verified) {
                    this.router.navigate(['/order-confirmation']);
                }
            });
            return;
        }

        this.activeModal.close();
        this.router.navigate(['/order-confirmation']);
    }

    continueShopping(): void {
        this.activeModal.close();
        this.router.navigate(['/products']);
    }

    trackByProductId(index: number, item: CartModel): string {
        return item.product.id;
    }
}
