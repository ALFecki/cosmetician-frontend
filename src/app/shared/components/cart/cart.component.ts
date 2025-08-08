import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of } from 'rxjs';
import { IconsModule } from '../../base/icons/icons.module';
import { CartModel } from '../../models/cart.model';
import { ProductModel } from '../../models/product.model';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { LoginModalService } from '../../services/login-modal.service';
import { ToastService } from '../../services/toast.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';
import { ProductModalComponent } from '../product-modal/product-modal.component';

@Component({
    selector: 'app-cart',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, IconsModule, ImageUrlPipe],
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
        private loginModalService: LoginModalService,
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
            this.loginModalService.openLoginModal();
            return;
        }

        this.modalService.dismissAll();
        this.router.navigate(['/order-confirmation']);
    }

    openProductDetails(product: ProductModel) {
        this.modalService.dismissAll();
        const activeModal = this.modalService.open(ProductModalComponent, {
            size: 'lg',
            centered: true,
            scrollable: true,
        });
        activeModal.componentInstance.selectedProduct = product;
    }
}
