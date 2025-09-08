import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { ProductsComponent } from '../../shared/components/products/products.component';
import { CategoryModel } from '../../shared/models/category.model';
import { CategoryService } from '../../shared/services/category.service';
import { ImageUrlPipe } from '../../shared/utils/image-url.pipe';

@Component({
    selector: 'app-category',
    templateUrl: './category.component.html',
    styleUrl: './category.component.scss',
    imports: [ProductsComponent, CommonModule, ImageUrlPipe]
})
export class CategoryComponent {
    categoryId!: string;
    category!: Observable<CategoryModel>;
    loading = true;
    error = '';

    constructor(
        private route: ActivatedRoute,
        categoryService: CategoryService,
    ) {
        this.route.params.subscribe(params => {
            this.categoryId = params['id'];
        });

        this.loading = true;
        this.category = categoryService.getById(this.categoryId).pipe(
            map(response => response.data),
            tap(() => (this.loading = false)),
            catchError(() => {
                this.error = 'Ошибка при загрузке категории';
                this.loading = false;
                return of({} as CategoryModel);
            }),
        );
    }
}
