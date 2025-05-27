import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProductModel } from '../../models/product.model';
import { AuthGuard } from '../../guards/auth.guard';
import { CartService } from '../../services/cart.service';
import { CountryModel } from '../../models/country.model';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-product-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-modal.component.html',
    styleUrl: './product-modal.component.scss',
})
export class ProductModalComponent {
    selectedProduct: ProductModel | null = null;
    activeTab = 'description';

    constructor(
        private modalService: NgbModal,
        private router: Router,
        private route: ActivatedRoute,
        private authGuard: AuthGuard,
        private cartService: CartService,
    ) {}

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

    getCountryNames(product: ProductModel | null): string {
        return product?.countries?.map((country: CountryModel) => country.name).join(', ') || '';
    }

    closeModal() {
        this.modalService.dismissAll();
    }
}
