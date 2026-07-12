import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IconsModule } from '../../base/icons/icons.module';
import { BrandModel } from '../../models/brand.model';
import { CategoryModel } from '../../models/category.model';
import { BrandService } from '../../services/brand.service';
import { CategoryService } from '../../services/category.service';

@Component({
    selector: 'app-footer',
    imports: [CommonModule, RouterModule, IconsModule],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.scss',
})
export class FooterComponent {
    categories$: Observable<CategoryModel[]>;
    brands$: Observable<BrandModel[]>;
    currentYear = new Date().getFullYear();
    publicOfferUrl = environment.public_offer_url;

    paymentLogos: string[] = [
        'assets/images/acquiring/color-21.png',
        'assets/images/acquiring/color-22.png',
        'assets/images/acquiring/color-23.png',
        'assets/images/acquiring/color-24.png',
        'assets/images/acquiring/color-25.png',
        'assets/images/acquiring/color-26.png',
        'assets/images/acquiring/color-28.png',
        'assets/images/acquiring/color-29.png',
        'assets/images/acquiring/color-30.png',
    ];

    private getRandomUniqueElements<T>(arr: T[], count: number): T[] {
        const shuffledArray = [...arr];

        for (let i = shuffledArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]]; // Swap elements
        }

        return shuffledArray.slice(0, Math.min(count, shuffledArray.length));
    }

    constructor(
        private categoryService: CategoryService,
        private brandService: BrandService,
    ) {
        this.categories$ = this.categoryService.getCategoriesList().pipe(map(categories => this.getRandomUniqueElements(categories, 5)));
        this.brands$ = this.brandService.getBrandsList().pipe(map(brands => this.getRandomUniqueElements(brands, 5)));
    }
}
