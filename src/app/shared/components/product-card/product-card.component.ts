import { Component, Input } from '@angular/core';
import { ProductModel } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent {
  product!: ProductModel;
  loading = true;
  error: string = '';

  constructor(private route: ActivatedRoute, private productService: ProductService) {
    let productId = '';
    this.route.params.subscribe((params) => {
      productId = params['id'];
    });

    this.productService.getById(productId).subscribe({
      next: (data) => {
        this.product = data.data;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Ошибка при загрузке продукта';
        this.loading = false;
      }
    });
  }

  addToCart() {
    console.log('Добавление в корзину:', this.product);
  }
}
