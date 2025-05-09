import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of } from 'rxjs';
import { ProductModel } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { CountryModel } from '../../models/country.model';
import { AuthGuard } from '../../guards/auth.guard';

@Component({
    selector: 'app-products',
    providers: [],
    standalone: true,
    imports: [CommonModule],
    templateUrl: './products.component.html',
    styleUrl: './products.component.scss',
})
export class ProductsComponent implements OnInit {
    products$!: Observable<ProductModel[]>;
    @Input() categoryId: string | undefined;
    @Input() brandId: string | undefined;
    selectedProduct: ProductModel | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productService: ProductService,
        private cartService: CartService,
        private modalService: NgbModal,
        private authGuard: AuthGuard,
    ) {}

    ngOnInit(): void {
        this.productService.getByFilterSchema({ categoryId: this.categoryId, brandId: this.brandId }).subscribe(data => {
            this.products$ = of(data.data);
        });
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
