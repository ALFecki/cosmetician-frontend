import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BrandModel } from '../../../../shared/models/brand.model';
import { BrandService } from '../../../../shared/services/brand.service';
import { ImageUrlPipe } from '../../../../shared/utils/image-url.pipe';
import { IconsModule } from '../../../../shared/base/icons/icons.module';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, map, Observable } from 'rxjs';

@Component({
    selector: 'app-brands',
    imports: [RouterModule, ImageUrlPipe, CommonModule, IconsModule],
    templateUrl: './brands.component.html',
    styleUrl: './brands.component.scss',
})
export class BrandsComponent implements OnInit {
    brands$: Observable<BrandModel[]> = new Observable<BrandModel[]>();
    loading$ = new BehaviorSubject<boolean>(false);
    error = '';

    constructor(private brandService: BrandService) {}

    private getRandomUniqueElements<T>(arr: T[], count: number): T[] {
        const shuffledArray = [...arr];

        for (let i = shuffledArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]]; // Swap elements
        }

        return shuffledArray.slice(0, Math.min(count, shuffledArray.length));
    }

    ngOnInit(): void {
        this.loading$.next(true);
        this.brands$ = this.brandService.getBrandsList().pipe(
            map(brands => {
                brands = brands.filter(b => b.image);
                const germaine = brands.find(b => b.title.toLowerCase() === 'germaine de capuccini');
                if (germaine) {
                    brands = brands.filter(b => b.id !== germaine!.id);
                    return [this.getRandomUniqueElements(brands, 3), germaine].flat();
                }
                return this.getRandomUniqueElements(brands, 4);
            }),
        );
        this.loading$.next(false);
    }

    getPlaceholderImage(): string {
        return 'assets/images/products/no-image.png';
    }
}
