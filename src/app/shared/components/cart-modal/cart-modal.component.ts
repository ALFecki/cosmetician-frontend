import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NgbActiveModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { IconsModule } from '../../base/icons/icons.module';
import { CartModel } from '../../models/cart.model';
import { PromotionModel } from '../../models/promotion.model';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { LoginModalService } from '../../services/login-modal.service';
import { PromotionService } from '../../services/promotion.service';
import { ToastService } from '../../services/toast.service';
import { VerifyEmailModalService } from '../../services/verify-email-modal.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';
import { calculateDiscountedPrice, PriceInfo } from '../../utils/promotion.utils';

@Component({
    selector: 'app-cart-modal',
    templateUrl: './cart-modal.component.html',
    styleUrls: ['./cart-modal.component.scss'],
    imports: [CommonModule, RouterModule, NgbModalModule, IconsModule, ImageUrlPipe],
})
export class CartModalComponent implements OnInit {
    cartItems$: Observable<CartModel[]> = new Observable<CartModel[]>();
    totalPrice$: Observable<number> = new Observable<number>();
    discountAmount$: Observable<number> = new Observable<number>();
    private productPromotions: Record<string, PromotionModel[]> = {};

    constructor(
        public cartService: CartService,
        private router: Router,
        public activeModal: NgbActiveModal,
        private authService: AuthService,
        private loginModalService: LoginModalService,
        private toastService: ToastService,
        private verifyEmailModalService: VerifyEmailModalService,
        private promotionService: PromotionService,
    ) {}

    ngOnInit(): void {
        this.cartItems$ = this.cartService.getCartItems();
        this.totalPrice$ = this.cartService.getTotalPrice();
        this.discountAmount$ = this.cartService.getDiscountAmount();

        // Load promotions for cart items
        this.cartItems$.subscribe(items => {
            items.forEach(item => {
                this.loadProductPromotions(item.product.id);
            });
        });
    }

    retryCart(): void {
        void this.cartService.refresh().catch(() => undefined);
    }
    removeUnavailable(variantId: string): void {
        void this.cartService.removeUnavailable(variantId).catch(() => undefined);
    }

    increaseQuantity(item: CartModel): void {
        this.cartService.increaseQuantity(item);
    }

    decreaseQuantity(item: CartModel): void {
        if (item.quantity > 1) {
            this.cartService.decreaseQuantity(item);
        }
    }

    removeProduct(item: CartModel): void {
        void this.cartService.removeProduct(item).catch(() => undefined);
    }

    getTotalItemsCount(): Observable<number> {
        return this.cartService.getProductCount();
    }

    goToCart(): void {
        this.activeModal.close();
        this.router.navigate(['/cart']);
    }

    goToOrderConfirmation(): void {
        if (!this.authService.phoneCheckoutEnabled && !this.authService.isLoggedIn()) {
            this.activeModal.close();
            this.loginModalService.openLoginModal();
            return;
        }

        const user = this.authService.getCurrentUserSync();

        if (!this.authService.phoneCheckoutEnabled && user && !user.isEmailVerified) {
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

    loadProductPromotions(productId: string): void {
        this.promotionService.getProductPromotions(productId).subscribe({
            next: promotions => {
                this.productPromotions[productId] = promotions.data.filter(p => p.isActive);
            },
            error: () => {
                this.productPromotions[productId] = [];
            },
        });
    }

    getItemPriceInfo(item: CartModel): PriceInfo {
        const promotions = this.productPromotions[item.product.id] || [];
        return calculateDiscountedPrice(item.variant.price, promotions);
    }

    getItemTotal(item: CartModel): number {
        const priceInfo = this.getItemPriceInfo(item);
        const price = priceInfo.hasDiscount ? priceInfo.discountedPrice! : priceInfo.originalPrice;
        return price * item.quantity;
    }

    getTotalWithoutDiscount(): Observable<number> {
        return this.cartService.getTotalWithoutDiscount();
    }
}
