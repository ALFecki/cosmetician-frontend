import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IconsModule } from '../../base/icons/icons.module';
import { ProductModel } from '../../models/product.model';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { LoginModalService } from '../../services/login-modal.service';
import { ProductService } from '../../services/product.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';
import { calculateDiscountedPrice, PriceInfo } from '../../utils/promotion.utils';
import { ProductCarouselComponent } from '../product-carousel/product-carousel.component';
import { PromotionBadgeComponent } from '../promotion-badge/promotion-badge.component';

@Component({
    selector: 'app-product-card',
    imports: [CommonModule, RouterModule, ProductCarouselComponent, PromotionBadgeComponent, IconsModule, ImageUrlPipe],
    templateUrl: './product-card.component.html',
    styleUrl: './product-card.component.scss',
})
export class ProductCardComponent implements OnInit, OnDestroy {
    product!: ProductModel;
    loading = true;
    error = '';
    selectedVariantId?: string;

    activeTab = 'desc';

    allCharacteristics: { label: string; value: string }[] = [];
    visibleCharacteristics: { label: string; value: string }[] = [];
    hiddenCharacteristics: { label: string; value: string }[] = [];
    showAllCharacteristics = false;
    isPriceRevealed = false;
    private priceTimeout: NodeJS.Timeout | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productService: ProductService,
        protected cartService: CartService,
        private authService: AuthService,
        private loginModalService: LoginModalService,
    ) {}

    ngOnInit() {
        let productId = '';
        this.route.params.subscribe(params => {
            productId = params['id'];
        });

        this.productService.getById(productId).subscribe({
            next: data => {
                this.product = data.data;
                this.product.variants = this.product.variants.filter(v => !v.isDeleted);
                if (this.product.variants && this.product.variants.length > 0) {
                    this.selectedVariantId = this.product.variants[0].id;
                }
                this.prepareCharacteristics();
                this.loading = false;
            },
            error: () => {
                this.error = 'Ошибка при загрузке продукта';
                this.loading = false;
            },
        });
    }

    selectVariant(variantId: string) {
        this.selectedVariantId = variantId;
        this.prepareCharacteristics();
    }

    getSelectedVariant() {
        if (!this.product?.variants) return null;
        return this.product.variants.find(v => v.id === this.selectedVariantId) || this.product.variants[0];
    }

    getSelectedVariantPrice(): number {
        const variant = this.getSelectedVariant();
        return variant?.price || 0;
    }

    getSelectedVariantPriceInfo(): PriceInfo {
        const variant = this.getSelectedVariant();
        const basePrice = variant?.price || 0;
        return calculateDiscountedPrice(basePrice, this.product.promotions || []);
    }

    getVariantPriceInfo(price: number): PriceInfo {
        return calculateDiscountedPrice(price, this.product.promotions || []);
    }

    getSelectedVariantVolume(): number {
        const variant = this.getSelectedVariant();
        return variant?.volume || 0;
    }

    prepareCharacteristics() {
        if (!this.product) return;
        this.allCharacteristics = [
            { label: 'Бренд', value: this.product.brand?.title || '—' },
            { label: 'Категория', value: this.product.categories?.map(category => category.title).join(', ') || '—' },
            { label: 'Объем', value: this.getSelectedVariantVolume() + ' мл' },
            { label: 'Страна', value: this.product.countries.map(country => country.name).join(', ') || '—' },
            { label: 'Тип продукта', value: this.product.productType.title || '—' },
            { label: 'Назначение', value: this.product.productScopes?.map(scope => scope.title).join(', ') || '—' },
        ].filter(c => c.value && c.value !== '—');
        this.visibleCharacteristics = this.allCharacteristics.slice(0, 4);
        this.hiddenCharacteristics = this.allCharacteristics.slice(4);
    }

    async addToCart() {
        if (this.authService.phoneCheckoutEnabled || this.authService.isLoggedIn()) {
            const variant = this.getSelectedVariant();
            if (variant) {
                await this.cartService.addProductToCart(variant.id);
            }
        } else {
            this.loginModalService.openLoginModal();
        }
    }

    revealPrice(): void {
        this.isPriceRevealed = true;

        if (this.priceTimeout) {
            clearTimeout(this.priceTimeout);
        }

        this.priceTimeout = setTimeout(() => {
            const priceElement = document.querySelector('.h3.price-revealed');
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
        this.priceTimeout = null;
    }
}
