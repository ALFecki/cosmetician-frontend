import { Component, OnInit } from '@angular/core';
import { ProductsComponent } from '../../shared/components/products/products.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-category',
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss',
  imports: [ProductsComponent],
  standalone: true
})
export class CategoryComponent {
  categoryId!: string;

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe((params) => {
      this.categoryId = params['id'];
    });
  }
}
