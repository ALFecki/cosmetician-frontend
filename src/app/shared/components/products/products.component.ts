import { CommonModule, NgFor } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { ProductModel } from '../../models/product.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [NgFor, CommonModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {
  products$!: Observable<ProductModel[]>;
  @Input() categoryId!: string;

  constructor(private productService: ProductService) {

  }
  ngOnInit(): void {
    this.productService.getByFilterSchema({ categoryId: this.categoryId }).subscribe((data) => {
      this.products$ = of(this.productService.transformList(data).data);
    });
  }
}
