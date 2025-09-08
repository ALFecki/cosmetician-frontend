import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { IconsModule } from '../../base/icons/icons.module';
import { BrandModel } from '../../models/brand.model';
import { CategoryModel } from '../../models/category.model';
import { BrandService } from '../../services/brand.service';
import { CategoryService } from '../../services/category.service';

@Component({
    selector: 'app-footer',
    imports: [CommonModule, RouterModule, IconsModule],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.scss'
})
export class FooterComponent {
    categories$: Observable<CategoryModel[]>;
    brands$: Observable<BrandModel[]>;

    constructor(
        private categoryService: CategoryService,
        private brandService: BrandService,
    ) {
        // Use the cached list observables directly
        this.categories$ = this.categoryService.getCategoriesList();
        this.brands$ = this.brandService.getBrandsList();
    }
}
