import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of } from 'rxjs';
import { AuthGuard } from '../../guards/auth.guard';
import { CountryModel } from '../../models/country.model';
import { ProductModel } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { PaginationComponent } from '../pagination/pagination.component';

@Component({
    selector: 'app-products',
    providers: [],
    standalone: true,
    imports: [CommonModule, PaginationComponent],
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

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productService: ProductService,
        private cartService: CartService,
        private modalService: NgbModal,
        private authGuard: AuthGuard,
    ) {}

    ngOnInit(): void {
        //         this.productService.getByFilterSchema({
        //     categoryId: [this.categoryId].filter((id): id is string => typeof id === 'string'),
        //     brandId: [this.brandId].filter((id): id is string => typeof id === 'string')
        // }).subscribe(data => {
        //     this.products$ = of(data.data);
        // });
        this.productService.getByFilterSchema({ categoryId: this.categoryId, brandId: this.brandId }).subscribe(data => {
            this.products$ = of(data.data);
            this.totalItems$ = of(data.length);
        });
    }

    loadProducts(): void {
        this.productService
            .getByFilterSchema({ categoryId: this.categoryId, brandId: this.brandId, page: this.currentPage, limit: this.itemsPerPage })
            .subscribe(data => {
                this.products$ = of(data.data);
            });
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

    openProductDetails(product: ProductModel, content: unknown) {
        this.selectedProduct = product;
        this.modalService.open(content, {
            size: 'lg',
            centered: true,
            scrollable: true,
        });
    }

    getCountryNames(product: ProductModel | null): string {
        return product?.countries?.map((country: CountryModel) => country.name).join(', ') || '';
    }

    moreInfo() {
        this.modalService.dismissAll();
        this.router.navigate(['/product', this.selectedProduct?.id]);
    }

    async addToCart(product: ProductModel | null) {
        if (product) {
            this.authGuard.canActivate(this.route.snapshot, this.router.routerState.snapshot).subscribe(async isAuthenticated => {
                if (isAuthenticated) {
                    await this.cartService.addProductToCart(product.id);
                }
            });
        }
    }
}
