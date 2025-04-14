import { CommonModule, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { ProductsComponent } from '../../shared/components/products/products.component';
import { CategoryModel } from '../../shared/models/category.model';
import { CategoryService } from '../../shared/services/category.service';

@Component({
    selector: 'app-category',
    templateUrl: './category.component.html',
    styleUrl: './category.component.scss',
    imports: [ProductsComponent, NgIf, CommonModule],
    standalone: true,
})
export class CategoryComponent {
    categoryId!: string;
    category!: Observable<CategoryModel>;

    constructor(
        private route: ActivatedRoute,
        categoryService: CategoryService,
    ) {
        this.route.params.subscribe(params => {
            this.categoryId = params['id'];
        });

        categoryService.getById(this.categoryId).subscribe(data => {
            this.category = of(data.data);
        });
    }
}
