import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of } from 'rxjs';
import { IconsModule } from '../../base/icons/icons.module';
import { CartModel } from '../../models/cart.model';
import { ProductModel } from '../../models/product.model';
import { PromocodeModel } from '../../models/promocode.model';
import { PromotionModel } from '../../models/promotion.model';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { LoginModalService } from '../../services/login-modal.service';
import { OrderService } from '../../services/order.service';
import { PromocodeService } from '../../services/promocode.service';
import { PromotionService } from '../../services/promotion.service';
import { ToastService } from '../../services/toast.service';
import { VerifyEmailModalService } from '../../services/verify-email-modal.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';
import { calculateDiscountedPrice, PriceInfo } from '../../utils/promotion.utils';
import { ProductModalComponent } from '../product-modal/product-modal.component';

@Component({
    selector: 'app-cart',
    imports: [CommonModule, FormsModule, RouterModule, IconsModule, ImageUrlPipe],
    templateUrl: './cart.component.html',
    styleUrl: './cart.component.scss',
})
export class CartComponent {
    cartItems$: Observable<CartModel[]> = new Observable<CartModel[]>();
    totalPrice$: Observable<number> = of(0);

    promocode = '';
    appliedPromocode: PromocodeModel | null = null;
    promocodeDiscount = 0;
    applyingPromocode = false;
    private productPromotions: Record<string, PromotionModel[]> = {};

    constructor(
        public cartService: CartService,
        private orderService: OrderService,
        private authService: AuthService,
        private toastService: ToastService,
        private modalService: NgbModal,
        private router: Router,
        private loginModalService: LoginModalService,
        private verifyEmailModalService: VerifyEmailModalService,
        private promocodeService: PromocodeService,
        private promotionService: PromotionService,
    ) {
        this.cartItems$ = this.cartService.getCartItems();
        this.totalPrice$ = this.cartService.getTotalPrice();

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

    increaseQuantity(cartItem: CartModel): void {
        this.cartService.increaseQuantity(cartItem);
    }

    decreaseQuantity(cartItem: CartModel): void {
        this.cartService.decreaseQuantity(cartItem);
    }

    removeProduct(cartItem: CartModel): void {
        void this.cartService.removeProduct(cartItem).catch(() => undefined);
    }

    getCartItemsCount(): Observable<number> {
        return this.cartService.getProductCount();
    }

    goToOrderConfirmation(): void {
        if (!this.authService.phoneCheckoutEnabled && !this.authService.isLoggedIn()) {
            this.loginModalService.openLoginModal();
            return;
        }

        const user = this.authService.getCurrentUserSync();
        if (!this.authService.phoneCheckoutEnabled && user && !user.isEmailVerified) {
            this.toastService.show('Для оформления заказа необходимо подтвердить email', 'warning');
            this.verifyEmailModalService.openVerifyEmailModal().subscribe(verified => {
                if (verified) {
                    this.modalService.dismissAll();
                    this.router.navigate(['/order-confirmation']);
                }
            });
            return;
        }
        this.modalService.dismissAll();
        this.router.navigate(['/order-confirmation']);
    }

    openProductDetails(product: ProductModel) {
        // Проверяем ширину экрана
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            // На мобильных устройствах переходим на страницу продукта
            this.router.navigate([`/product/${product.id}`]);
        } else {
            // На десктопе открываем модальное окно
            this.modalService.dismissAll();
            const activeModal = this.modalService.open(ProductModalComponent, {
                size: 'lg',
                centered: true,
                scrollable: true,
            });
            activeModal.componentInstance.selectedProduct = product;
        }
    }

    async applyPromocode(): Promise<void> {
        if (this.cartService.enabled) {
            await this.cartService.applyPhonePromocode(this.promocode).catch(() => undefined);
            return;
        }
        if (!this.promocode.trim()) {
            this.toastService.show('Введите промокод', 'warning');
            return;
        }

        this.applyingPromocode = true;

        try {
            const response = await this.orderService.applyPromocode(this.promocode.trim()).toPromise();

            if (response) {
                // this.appliedPromocode = this.promocode;
                this.promocodeDiscount = response.discountAmount!;
                this.toastService.show(`Промокод применён! Скидка: ${response.discountAmount} р.`, 'success');
            }
        } catch (error: unknown) {
            console.error('Error applying promocode:', error);
            const errorMessage = (error as { error?: { message?: string } })?.error?.message || 'Промокод недействителен';
            this.toastService.show(errorMessage, 'error');
        } finally {
            this.applyingPromocode = false;
        }
    }

    removePromocode(): void {
        if (this.cartService.enabled) {
            this.promocode = '';
            void this.cartService.applyPhonePromocode(null).catch(() => undefined);
            return;
        }
        this.promocode = '';
        this.appliedPromocode = null;
        this.promocodeDiscount = 0;
        this.toastService.show('Промокод удалён', 'info');
    }

    getTotalWithDiscount(): number {
        let total = 0;
        this.totalPrice$.subscribe(price => (total = price)).unsubscribe();
        return Math.max(0, total - this.promocodeDiscount);
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

    getDiscount(): Observable<number> {
        return this.cartService.getDiscountAmount();
    }

    getCartTotal(): number {
        let total = 0;
        this.cartItems$
            .subscribe(items => {
                total = items.reduce((sum, item) => sum + this.getItemTotal(item), 0);
            })
            .unsubscribe();
        return total;
    }

    getCartTotalWithDiscount(): number {
        if (this.cartService.enabled) return (this.cartService.currentQuote?.totalCents || 0) / 100;
        const total = this.getCartTotal();
        return Math.max(0, total - this.promocodeDiscount);
    }
}
