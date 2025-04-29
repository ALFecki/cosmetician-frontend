import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { BrandModel } from '../../models/brand.model';
import { CategoryModel } from '../../models/category.model';
import { BrandService } from '../../services/brand.service';
import { CategoryService } from '../../services/category.service';

@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.scss',
})
export class FooterComponent {
    categories$!: Observable<CategoryModel[]>;
    brands$!: Observable<BrandModel[]>;

    constructor(
        private categoryService: CategoryService,
        private brandService: BrandService,
    ) {
        this.categoryService.getAll().subscribe(data => {
            this.categories$ = of(data.data);
        });
        this.brandService.getAll().subscribe(data => {
            this.brands$ = of(data.data);
        });
    }
}
