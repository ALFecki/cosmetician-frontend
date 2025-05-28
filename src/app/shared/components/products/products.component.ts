import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of } from 'rxjs';
import { AuthGuard } from '../../guards/auth.guard';
import { ProductModel } from '../../models/product.model';
import { FilterProductSchema } from '../../schemas/product.schema';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { PaginationComponent } from '../pagination/pagination.component';
import { ProductFilterComponent } from '../product-filter/product-filter.component';
import { ProductModalComponent } from '../product-modal/product-modal.component';

@Component({
    selector: 'app-products',
    providers: [],
    standalone: true,
    imports: [CommonModule, PaginationComponent, ProductFilterComponent],
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
    selectedVariants: Record<string, string> = {};

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productService: ProductService,
        private cartService: CartService,
        private modalService: NgbModal,
        private authGuard: AuthGuard,
    ) {}

    ngOnInit(): void {
        // Initialize filter options based on input props
        if (this.categoryId) {
            this.filterOptions.categoryId = [this.categoryId];
        }
        if (this.brandId) {
            this.filterOptions.brandId = [this.brandId];
        }
        this.loadProducts();
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
                    // Initialize selected variant for each product
                    if (product.variants && product.variants.length > 0) {
                        this.selectedVariants[product.id] = product.variants[0].id;
                    }
                }
            });
    }

    onFilterChange(filterData: FilterProductSchema): void {
        this.filterOptions = { ...filterData };
        this.currentPage = 1; // Reset to first page when filter changes
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
            this.authGuard.canActivate(this.route.snapshot, this.router.routerState.snapshot).subscribe(async isAuthenticated => {
                if (isAuthenticated) {
                    await this.cartService.addProductToCart(this.selectedVariants[product.id]);
                }
            });
        }
    }

    selectVariant(productId: string, variantId: string) {
        this.selectedVariants[productId] = variantId;
    }

    getSelectedVariant(product: ProductModel): string | undefined {
        return this.selectedVariants[product.id] || product.variants?.[0]?.id;
    }

    getSelectedVariantPrice(product: ProductModel): number {
        const variantId = this.getSelectedVariant(product);
        const variant = product.variants?.find(v => v.id === variantId);
        return variant ? variant.price : 0;
    }

    getSelectedVariantVolume(product: ProductModel): number {
        const variantId = this.getSelectedVariant(product);
        const variant = product.variants?.find(v => v.id === variantId);
        return variant ? variant.volume : 0;
    }
}
