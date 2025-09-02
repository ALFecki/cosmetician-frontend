import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProductModel } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { ToastService } from '../../services/toast.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';

@Component({
    selector: 'app-product-carousel',
    templateUrl: './product-carousel.component.html',
    styleUrls: ['./product-carousel.component.scss'],
    standalone: true,
    imports: [CommonModule, ImageUrlPipe],
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
                response.data.forEach(product => {
                    product.variants = product.variants.filter(variant => !variant.isDeleted);
                });
                this.products = response.data
                    .filter(product => product.variants.length !== 0)
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 10);
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
                left: -320,
                behavior: 'smooth',
            });
        }
    }

    scrollRight(): void {
        if (this.productCarousel) {
            this.productCarousel.nativeElement.scrollBy({
                left: 320,
                behavior: 'smooth',
            });
        }
    }

    openProductDetails(product: ProductModel): void {
        console.log("!~!!!")
        console.log(product.id)
        this.router.navigate(['/product', product.id], {onSameUrlNavigation: 'reload'});
    }

    openProductDetailsWithScroll(product: any): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.openProductDetails(product);
}

    openCatalog(): void {
        this.router.navigate(['/products']);
    }

    trackByProductId(index: number, product: ProductModel): string {
        return product.id;
    }

    getMinPrice(product: ProductModel): number {
        if (!product.variants || product.variants.length === 0) {
            return 0;
        }
        return Math.min(...product.variants.map(variant => variant.price));
    }

    onImageLoad(event: Event): void {
        const img = event.target as HTMLImageElement;
        const container = img.closest('.img-container');
        if (container) {
            container.classList.remove('loading');
        }
    }

    onImageError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.src = 'assets/images/placeholder-product.jpg';
        const container = img.closest('.img-container');
        if (container) {
            container.classList.remove('loading');
        }
    }
}
