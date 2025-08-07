import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthGuard } from '../../guards/auth.guard';
import { CountryModel } from '../../models/country.model';
import { ProductModel } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';
import { IconsModule } from '../../base/icons/icons.module';
import { ImageUrlPipe } from '../../utils/image-url.pipe';

@Component({
    selector: 'app-product-modal',
    standalone: true,
    imports: [CommonModule, IconsModule, ImageUrlPipe],
    templateUrl: './product-modal.component.html',
    styleUrl: './product-modal.component.scss',
})
export class ProductModalComponent {
    selectedProduct: ProductModel | null = null;
    selectedVariantId: string | null = null;
    activeTab = 'description';

    constructor(
        private modalService: NgbModal,
        private router: Router,
        private route: ActivatedRoute,
        private authGuard: AuthGuard,
        private cartService: CartService,
        private toastService: ToastService,
    ) {}

    moreInfo() {
        this.modalService.dismissAll();
        this.router.navigate(['/product', this.selectedProduct?.id]);
    }

    async addToCart(product: ProductModel | null) {
        if (product) {
            this.authGuard.canActivate(this.route.snapshot, this.router.routerState.snapshot).subscribe(async isAuthenticated => {
                if (isAuthenticated) {
                    if (this.selectedVariantId) {
                        await this.cartService.addProductToCart(this.getSelectedVariant()!.id);
                    } else {
                        this.toastService.show('Пожалуйста, выберите вариант продукта перед добавлением в корзину.', 'error');
                        return;
                    }
                }
            });
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

    getSelectedVariantPrice(): number {
        const variant = this.getSelectedVariant();
        return variant?.price || 0;
    }

    getSelectedVariantVolume(): number {
        const variant = this.getSelectedVariant();
        return variant?.volume || 0;
    }
}
