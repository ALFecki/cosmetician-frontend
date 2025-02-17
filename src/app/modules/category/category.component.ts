import { Component, OnInit } from '@angular/core';
import { ProductsComponent } from '../../shared/components/products/products.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [ProductsComponent],
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss'
})
export class CategoryComponent {
  categoryId!: string;

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe((params) => {
      this.categoryId = params['id'];
    });
  }
}
