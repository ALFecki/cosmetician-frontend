import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbOffcanvas, NgbOffcanvasRef } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of } from 'rxjs';
import { IconsModule } from '../../base/icons/icons.module';
import { ProductModel } from '../../models/product.model';
import { FilterProductSchema } from '../../schemas/product.schema';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { LoginModalService } from '../../services/login-modal.service';
import { ProductService } from '../../services/product.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';
import { calculateDiscountedPrice, PriceInfo } from '../../utils/promotion.utils';
import { PaginationComponent } from '../pagination/pagination.component';
import { ProductFilterComponent } from '../product-filter/product-filter.component';
import { ProductModalComponent } from '../product-modal/product-modal.component';

@Component({
    selector: 'app-products',
    providers: [],
    imports: [CommonModule, FormsModule, PaginationComponent, ProductFilterComponent, ImageUrlPipe, IconsModule],
    templateUrl: './products.component.html',
    styleUrl: './products.component.scss',
})
export class ProductsComponent implements OnInit, OnChanges, OnDestroy {
    products$!: Observable<ProductModel[]>;
    @Input() categoryId: string | undefined;
    @Input() brandId: string | undefined;
    selectedProduct: ProductModel | null = null;
    itemsPerPage = 10;
    currentPage = 1;
    totalItems$: Observable<number> = of(0);
    filterOptions: FilterProductSchema = {};
    sortBy: 'title' | 'price-asc' | 'price-desc' | 'createdAt' = 'title';
    showFilters = false;
    @ViewChild('mobileFilters') private mobileFilters!: TemplateRef<unknown>;
    private filterPanel?: NgbOffcanvasRef;
    private initialized = false;
    private selectedVariants: Record<string, string> = {};
    private revealedPrices = new Set<string>();
    private priceTimeouts = new Map<string, NodeJS.Timeout>();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productService: ProductService,
        protected cartService: CartService,
        private modalService: NgbModal,
        private authService: AuthService,
        private loginModalService: LoginModalService,
        private offcanvasService: NgbOffcanvas,
    ) {}

    ngOnInit(): void {
        this.initialized = true;
        if (this.categoryId) {
            this.filterOptions.categoryId = [this.categoryId];
        }
        if (this.brandId) {
            this.filterOptions.brandId = [this.brandId];
        }

        // Check for promo query parameter
        this.route.queryParams.subscribe(params => {
            if (params['promo'] === 'true') {
                this.filterOptions.hasPromotion = true;
            }
        });

        this.loadProducts();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!changes['brandId'] && !changes['categoryId']) return;
        this.filterOptions = {};
        if (this.categoryId) this.filterOptions.categoryId = [this.categoryId];
        if (this.brandId) this.filterOptions.brandId = [this.brandId];
        this.currentPage = 1;
        if (this.initialized) this.loadProducts();
    }

    isPriceRevealed(productId: string): boolean {
        return this.revealedPrices.has(productId);
    }

    revealPrice(productId: string): void {
        this.revealedPrices.add(productId);

        if (this.priceTimeouts.has(productId)) {
            clearTimeout(this.priceTimeouts.get(productId));
        }

        const timeout = setTimeout(() => {
            const priceElement = document.querySelector(`[data-product-id="${productId}"] .price-revealed`);
            if (priceElement) {
                priceElement.classList.remove('animate-reveal');
                priceElement.classList.add('animate-hide');

                setTimeout(() => {
                    this.revealedPrices.delete(productId);
                    this.priceTimeouts.delete(productId);
                }, 400);
            } else {
                this.revealedPrices.delete(productId);
                this.priceTimeouts.delete(productId);
            }
        }, 5000);

        this.priceTimeouts.set(productId, timeout);
    }

    ngOnDestroy(): void {
        this.filterPanel?.dismiss();
        this.priceTimeouts.forEach(timeout => {
            clearTimeout(timeout);
        });
        this.priceTimeouts.clear();
    }

    private scrollToTop(): void {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });

        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }

    resetFilters(): void {
        this.filterOptions = {};
        this.currentPage = 1;
        this.loadProducts();
        this.scrollToTop();
    }

    loadProducts(): void {
        // Prepare sort parameter for server
        let sortParam: string | undefined;
        switch (this.sortBy) {
            case 'title':
                sortParam = 'title';
                break;
            case 'price-asc':
                sortParam = 'price';
                break;
            case 'price-desc':
                sortParam = '-price';
                break;
            case 'createdAt':
                sortParam = '-createdAt';
                break;
        }

        this.productService
            .getAll({
                ...this.filterOptions,
                page: this.currentPage,
                limit: this.itemsPerPage,
                sort: sortParam,
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

    toggleFilters(): void {
        if (this.filterPanel) {
            this.filterPanel.close();
            return;
        }
        this.showFilters = true;
        this.filterPanel = this.offcanvasService.open(this.mobileFilters, {
            position: 'start',
            panelClass: 'storefront-filter-panel',
            ariaLabelledBy: 'mobile-filter-title',
            backdrop: true,
            keyboard: true,
            scroll: false,
            animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : undefined,
        });
        this.filterPanel.hidden.subscribe(() => {
            this.showFilters = false;
            this.filterPanel = undefined;
        });
    }

    @HostListener('window:resize')
    closeFiltersOnDesktop(): void {
        if (window.innerWidth > 700) this.filterPanel?.close();
    }

    get activeFiltersCount(): number {
        let count = 0;
        if (this.filterOptions.title) count++;
        if (this.filterOptions.brandId && this.filterOptions.brandId.length > 0) count += this.filterOptions.brandId.length;
        if (this.filterOptions.categoryId && this.filterOptions.categoryId.length > 0) count += this.filterOptions.categoryId.length;
        if (this.filterOptions.productScopeId && this.filterOptions.productScopeId.length > 0)
            count += this.filterOptions.productScopeId.length;
        if (this.filterOptions.minPrice !== undefined) count++;
        if (this.filterOptions.maxPrice !== undefined) count++;
        if (this.filterOptions.minVolume !== undefined) count++;
        if (this.filterOptions.maxVolume !== undefined) count++;
        return count;
    }

    onSortChange(sortValue: string): void {
        this.sortBy = sortValue as 'title' | 'price-asc' | 'price-desc' | 'createdAt';
        this.loadProducts();
    }

    onFilterChange(filterData: FilterProductSchema): void {
        this.filterOptions = { ...filterData };
        this.currentPage = 1;
        this.loadProducts();
    }

    onPageChange(page: number): void {
        this.currentPage = page;
        this.loadProducts();
        this.scrollToTop();
    }

    onItemsPerPageChange(itemsPerPage: number): void {
        this.itemsPerPage = itemsPerPage;
        this.currentPage = 1;
        console.log('Items per page changed:', itemsPerPage);
        this.loadProducts();
        this.scrollToTop();
    }

    openProductDetails(product: ProductModel) {
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            this.router.navigate([`/product/${product.id}`]);
        } else {
            this.modalService.dismissAll();
            const activeModal = this.modalService.open(ProductModalComponent, {
                size: 'lg',
                centered: true,
                scrollable: true,
            });
            activeModal.componentInstance.selectedProduct = product;
            activeModal.componentInstance.selectedVariantId = this.getSelectedVariantId(product);
        }
    }

    async addToCart(product: ProductModel | null) {
        if (product) {
            if (this.authService.phoneCheckoutEnabled || this.authService.isLoggedIn()) {
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

    getProductPriceInfo(product: ProductModel): PriceInfo {
        const variant = this.getSelectedVariant(product);
        const basePrice = variant?.price || 0;
        const promotions = product.promotions || [];
        return calculateDiscountedPrice(basePrice, promotions);
    }
}
