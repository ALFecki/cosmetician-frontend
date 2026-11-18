import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IconsModule } from '../../base/icons/icons.module';
import { CountryModel } from '../../models/country.model';
import { ProductModel, ProductVariantModel } from '../../models/product.model';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { LoginModalService } from '../../services/login-modal.service';
import { ToastService } from '../../services/toast.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';
import { getVariantPriceInfo, PriceInfo } from '../../utils/promotion.utils';

@Component({
    selector: 'app-product-modal',
    imports: [CommonModule, IconsModule, ImageUrlPipe],
    templateUrl: './product-modal.component.html',
    styleUrl: './product-modal.component.scss',
    host: { '[class.storefront-presentation]': 'isStorefront' },
})
export class ProductModalComponent implements OnDestroy {
    selectedProduct: ProductModel | null = null;
    selectedVariantId: string | null = null;
    activeTab = 'description';
    isPriceRevealed = false;
    private priceTimeout: NodeJS.Timeout | null = null;

    constructor(
        private modalService: NgbModal,
        private router: Router,
        private authService: AuthService,
        protected cartService: CartService,
        private toastService: ToastService,
        private loginModalService: LoginModalService,
    ) {}

    get isStorefront(): boolean {
        return !/^\/admin(?:[/?#]|$)/.test(this.router.url);
    }

    moreInfo() {
        this.modalService.dismissAll();
        this.router.navigate(['/product', this.selectedProduct?.id]);
    }

    async addToCart(product: ProductModel | null) {
        if (product) {
            if (this.authService.phoneCheckoutEnabled || this.authService.isLoggedIn()) {
                if (this.selectedVariantId) {
                    await this.cartService.addProductToCart(this.getSelectedVariant()!.id);
                } else {
                    this.toastService.show('Пожалуйста, выберите вариант продукта перед добавлением в корзину.', 'error');
                    return;
                }
            } else {
                this.loginModalService.openLoginModal();
            }
        }
    }

    getCountryNames(product: ProductModel | null): string {
        return product?.countries?.map((country: CountryModel) => country.name).join(', ') || '';
    }

    getProductScopeNames(product: ProductModel | null): string {
        return product?.productScopes?.map(scope => scope.title).join(', ') || '';
    }

    closeModal() {
        this.modalService.dismissAll();
    }

    selectVariant(variantId: string) {
        this.selectedVariantId = variantId;
    }

    getSelectedVariant() {
        if (!this.selectedProduct?.variants) return null;
        return this.selectedProduct.variants.find(v => v.id === this.selectedVariantId) || this.selectedProduct.variants[0];
    }

    getSelectedVariantVolume(): number {
        const variant = this.getSelectedVariant();
        return variant?.volume || 0;
    }

    revealPrice(): void {
        this.isPriceRevealed = true;

        if (this.priceTimeout) {
            clearTimeout(this.priceTimeout);
        }

        this.priceTimeout = setTimeout(() => {
            const priceElement = document.querySelector('.modal-price.price-revealed');
            if (priceElement) {
                priceElement.classList.remove('animate-reveal');
                priceElement.classList.add('animate-hide');

                setTimeout(() => {
                    this.isPriceRevealed = false;
                    this.priceTimeout = null;
                }, 400);
            } else {
                this.isPriceRevealed = false;
                this.priceTimeout = null;
            }
        }, 5000);
    }

    ngOnDestroy(): void {
        if (this.priceTimeout) {
            clearTimeout(this.priceTimeout);
        }
    }

    getSelectedVariantPriceInfo(): PriceInfo {
        return getVariantPriceInfo(this.getSelectedVariant(), this.selectedProduct?.promotions);
    }

    getVariantPriceInfo(variant: ProductVariantModel): PriceInfo {
        return getVariantPriceInfo(variant, this.selectedProduct?.promotions);
    }
}
