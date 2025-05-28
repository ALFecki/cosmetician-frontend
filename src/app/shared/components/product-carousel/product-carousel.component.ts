import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProductModel } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { ToastService } from '../../services/toast.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-product-carousel',
    templateUrl: './product-carousel.component.html',
    styleUrls: ['./product-carousel.component.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class ProductCarouselComponent implements OnInit {
    products: ProductModel[] = [];
    loading = false;
    error: string | null = null;
    selectedVariantId?: string;

    @ViewChild('productCarousel') productCarousel!: ElementRef;

    constructor(
        private productService: ProductService,
        private cartService: CartService,
        private router: Router,
        private modalService: NgbModal,
        private toastService: ToastService,
    ) {}

    ngOnInit(): void {
        this.loading = true;
        this.productService.getAll({ page: 1, limit: 30 }).subscribe({
            next: response => {
                this.products = response.data.sort(() => 0.5 - Math.random()).slice(0, 10);
                this.loading = false;
            },
            error: error => {
                this.error = 'Ошибка при загрузке товаров';
                this.loading = false;
                console.error('Error loading products:', error);
            },
        });
    }

    scrollLeft(): void {
        if (this.productCarousel) {
            this.productCarousel.nativeElement.scrollBy({
                left: -300,
                behavior: 'smooth',
            });
        }
    }

    scrollRight(): void {
        if (this.productCarousel) {
            this.productCarousel.nativeElement.scrollBy({
                left: 300,
                behavior: 'smooth',
            });
        }
    }

    openProductDetails(product: ProductModel): void {
        this.router.navigate(['/product', product.id]);
    }

    openCatalog(): void {
        this.router.navigate(['/products']);
    }
}
