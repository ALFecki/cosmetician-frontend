import { Component } from '@angular/core';
import { ProductsComponent } from '../../shared/components/products/products.component';

@Component({
    selector: 'app-product-list',
    imports: [ProductsComponent],
    templateUrl: './product-list.component.html',
    styleUrl: './product-list.component.scss'
})
export class ProductListComponent {}
