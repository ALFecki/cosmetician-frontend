import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of } from 'rxjs';
import { ProductModel } from '../../models/product.model';
import { FilterProductSchema } from '../../schemas/product.schema';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { LoginModalService } from '../../services/login-modal.service';
import { ProductService } from '../../services/product.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';
import { PaginationComponent } from '../pagination/pagination.component';
import { ProductFilterComponent } from '../product-filter/product-filter.component';
import { ProductModalComponent } from '../product-modal/product-modal.component';

@Component({
    selector: 'app-products',
    providers: [],
    imports: [CommonModule, PaginationComponent, ProductFilterComponent, ImageUrlPipe],
    templateUrl: './products.component.html',
    styleUrl: './products.component.scss',
})
export class ProductsComponent implements OnInit {
    products$!: Observable<ProductModel[]>;
    @Input() categoryId: string | undefined;
    @Input() brandId: string | undefined;
    selectedProduct: ProductModel | null = null;
    itemsPerPage = 10;
    currentPage = 1;
    totalItems$: Observable<number> = of(0);
    filterOptions: FilterProductSchema = {};
    private selectedVariants: Record<string, string> = {};
    private revealedPrices = new Set<string>();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productService: ProductService,
        private cartService: CartService,
        private modalService: NgbModal,
        private authService: AuthService,
        private loginModalService: LoginModalService,
    ) {}

    ngOnInit(): void {
        if (this.categoryId) {
            this.filterOptions.categoryId = [this.categoryId];
        }
        if (this.brandId) {
            this.filterOptions.brandId = [this.brandId];
        }
        this.loadProducts();
    }

    isPriceRevealed(productId: string): boolean {
        return this.revealedPrices.has(productId);
    }

    revealPrice(productId: string): void {
        this.revealedPrices.add(productId);
    }
    resetFilters(): void {
        this.filterOptions = {};
        this.currentPage = 1;
        this.loadProducts();
    }

    loadProducts(): void {
        this.productService
            .getAll({
                ...this.filterOptions,
                page: this.currentPage,
                limit: this.itemsPerPage,
            })
            .subscribe(data => {
                this.products$ = of(data.data);
                this.totalItems$ = of(data.length);
                for (const product of data.data) {
                    product.variants = product.variants.filter(v => !v.isDeleted);
                    if (product.variants && product.variants.length > 0) {
                        this.selectedVariants[product.id] = product.variants[0].id;
                    }
                }
            });
    }

    onFilterChange(filterData: FilterProductSchema): void {
        this.filterOptions = { ...filterData };
        this.currentPage = 1;
        this.loadProducts();
    }

    onPageChange(page: number): void {
        this.currentPage = page;
        this.loadProducts();
    }

    onItemsPerPageChange(itemsPerPage: number): void {
        this.itemsPerPage = itemsPerPage;
        console.log('Items per page changed:', itemsPerPage);
        this.loadProducts();
    }

    openProductDetails(product: ProductModel) {
        this.modalService.dismissAll();
        const activeModal = this.modalService.open(ProductModalComponent, {
            size: 'lg',
            centered: true,
            scrollable: true,
        });
        activeModal.componentInstance.selectedProduct = product;
        activeModal.componentInstance.selectedVariantId = this.getSelectedVariant(product);
    }

    async addToCart(product: ProductModel | null) {
        if (product) {
            if (this.authService.isLoggedIn()) {
                await this.cartService.addProductToCart(this.selectedVariants[product.id]);
            } else {
                this.loginModalService.openLoginModal();
            }
        }
    }

    selectVariant(product: ProductModel, variantId: string): void {
        this.selectedVariants[product.id] = variantId;
    }

    getSelectedVariantId(product: ProductModel): string {
        return this.selectedVariants[product.id] || product.variants?.[0]?.id || '';
    }

    getSelectedVariant(product: ProductModel) {
        const selectedId = this.getSelectedVariantId(product);
        return product.variants?.find(v => v.id === selectedId) || product.variants?.[0];
    }

    getSelectedVariantPrice(product: ProductModel): number {
        const variant = this.getSelectedVariant(product);
        return variant?.price || 0;
    }

    getSelectedVariantVolume(product: ProductModel): number {
        const variant = this.getSelectedVariant(product);
        return variant?.volume || 0;
    }

    getMinPrice(product: ProductModel): number {
        if (!product.variants || product.variants.length === 0) {
            return 0;
        }
        return Math.min(...product.variants.map(variant => variant.price));
    }

    trackByProductId(index: number, product: ProductModel): string {
        return product.id;
    }

    onImageLoad(event: Event): void {
        const img = event.target as HTMLImageElement;
        const container = img.closest('.card-image-container');
        if (container) {
            container.classList.remove('loading');
        }
    }

    onImageError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.src = 'assets/images/placeholder-product.jpg';
        const container = img.closest('.card-image-container');
        if (container) {
            container.classList.remove('loading');
        }
    }
}
