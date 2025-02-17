import { Component } from '@angular/core';
import { ProductsComponent } from '../../shared/components/products/products.component';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [ProductsComponent],
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss'
})
export class CategoryComponent {

}
