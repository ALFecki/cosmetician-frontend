import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductModel } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-product-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-card.component.html',
    styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
    product!: ProductModel;
    loading = true;
    error = '';

    constructor(
        private route: ActivatedRoute,
        private productService: ProductService,
    ) {
        let productId = '';
        this.route.params.subscribe(params => {
            productId = params['id'];
        });

        this.productService.getById(productId).subscribe({
            next: data => {
                this.product = data.data;
                this.loading = false;
            },
            error: () => {
                this.error = 'Ошибка при загрузке продукта';
                this.loading = false;
            },
        });
    }

    addToCart(product: ProductModel) {
        console.log('Добавление в корзину:', product);
    }
}
