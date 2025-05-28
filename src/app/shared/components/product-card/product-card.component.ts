import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthGuard } from '../../guards/auth.guard';
import { ProductModel } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { ProductCarouselComponent } from '../product-carousel/product-carousel.component';
import { IconsModule } from '../../base/icons/icons.module';

@Component({
    selector: 'app-product-card',
    standalone: true,
    imports: [CommonModule, RouterModule, ProductCarouselComponent, IconsModule],
    templateUrl: './product-card.component.html',
    styleUrl: './product-card.component.scss',
})
export class ProductCardComponent implements OnInit {
    product!: ProductModel;
    loading = true;
    error = '';
    selectedVariantId?: string;

    activeTab = 'desc';

    allCharacteristics: { label: string; value: string }[] = [];
    visibleCharacteristics: { label: string; value: string }[] = [];
    hiddenCharacteristics: { label: string; value: string }[] = [];
    showAllCharacteristics = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productService: ProductService,
        private cartService: CartService,
        private authGuard: AuthGuard,
    ) {}

    ngOnInit() {
        let productId = '';
        this.route.params.subscribe(params => {
            productId = params['id'];
        });

        this.productService.getById(productId).subscribe({
            next: data => {
                this.product = data.data;
                // Set default variant
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
    }

    getSelectedVariant() {
        if (!this.product?.variants) return null;
        return this.product.variants.find(v => v.id === this.selectedVariantId) || this.product.variants[0];
    }

    getSelectedVariantPrice(): number {
        const variant = this.getSelectedVariant();
        return variant?.price || 0;
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
            { label: 'Тип продукта', value: this.product.productType || '—' },
            { label: 'Назначение', value: this.product.productScope || '—' },
        ].filter(c => c.value && c.value !== '—');
        this.visibleCharacteristics = this.allCharacteristics.slice(0, 4);
        this.hiddenCharacteristics = this.allCharacteristics.slice(4);
    }

    async addToCart(product: ProductModel) {
        this.authGuard.canActivate(this.route.snapshot, this.router.routerState.snapshot).subscribe(async canActivate => {
            if (canActivate) {
                const variant = this.getSelectedVariant();
                if (variant) {
                    await this.cartService.addProductToCart(variant.id);
                }
            }
        });
    }
}
