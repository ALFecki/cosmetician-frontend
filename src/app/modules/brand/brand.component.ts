import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductsComponent } from '../../shared/components/products/products.component';

@Component({
  selector: 'app-brand',
  standalone: true,
  imports: [ProductsComponent],
  templateUrl: './brand.component.html',
  styleUrl: './brand.component.scss'
})
export class BrandComponent {
  brandId!: string;

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe((params) => {
      this.brandId = params['id'];
    });
  }
}
