import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProductModel } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

@Component({
    selector: 'app-product-card',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './product-card.component.html',
    styleUrl: './product-card.component.scss',
})
export class ProductCardComponent implements OnInit {
    product!: ProductModel;
    loading = true;
    error = '';

    // Tabs
    activeTab = 'desc';

    // Characteristics
    allCharacteristics: { label: string; value: string }[] = [];
    visibleCharacteristics: { label: string; value: string }[] = [];
    hiddenCharacteristics: { label: string; value: string }[] = [];
    showAllCharacteristics = false;

    constructor(
        private route: ActivatedRoute,
        private productService: ProductService,
        private cartService: CartService,
    ) {}

    ngOnInit() {
        let productId = '';
        this.route.params.subscribe(params => {
            productId = params['id'];
        });

        this.productService.getById(productId).subscribe({
            next: data => {
                this.product = data.data;
                this.prepareCharacteristics();
                this.loading = false;
            },
            error: () => {
                this.error = 'Ошибка при загрузке продукта';
                this.loading = false;
            },
        });
    }

    prepareCharacteristics() {
        if (!this.product) return;
        // Compose characteristics array
        this.allCharacteristics = [
            { label: 'Бренд', value: this.product.brand?.title || '—' },
            { label: 'Категория', value: this.product.category?.title || '—' },
            { label: 'Объем', value: this.product.volume ? this.product.volume + ' мл' : '—' },
            { label: 'Страна', value: this.product.country || '—' },
            { label: 'Тип продукта', value: this.product.productType || '—' },
            { label: 'Назначение', value: this.product.productScope || '—' },
            // { label: 'Артикул', value: this.product.sku || '—' },
            // Add more as needed
        ].filter(c => c.value && c.value !== '—');
        this.visibleCharacteristics = this.allCharacteristics.slice(0, 4);
        this.hiddenCharacteristics = this.allCharacteristics.slice(4);
    }

    async addToCart(product: ProductModel) {
        console.log('Добавление в корзину:', product);
        await this.cartService.addProductToCart(product.id);
    }
}
