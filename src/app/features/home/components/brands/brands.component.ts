import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BrandModel } from '../../../../shared/models/brand.model';
import { BrandService } from '../../../../shared/services/brand.service';
import { ImageUrlPipe } from '../../../../shared/utils/image-url.pipe';

@Component({
    selector: 'app-brands',
    standalone: true,
    imports: [CommonModule, RouterModule, ImageUrlPipe],
    templateUrl: './brands.component.html',
    styleUrl: './brands.component.scss',
})
export class BrandsComponent implements OnInit {
    brands: BrandModel[] = [];
    loading = false;
    error = '';

    constructor(private brandService: BrandService) {}

    ngOnInit(): void {
        this.loading = true;
        // Use the cached brands list method
        this.brandService.getBrandsList().subscribe({
            next: brands => {
                // Get just the first 4 brands to display
                this.brands = brands
                    .slice(0, 4)
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .filter(brand => brand.image);
                this.loading = false;
            },
            error: error => {
                console.error('Error loading brands:', error);
                this.error = 'Не удалось загрузить бренды';
                this.loading = false;
            },
        });
    }

    getPlaceholderImage(): string {
        return 'assets/images/products/no-image.png';
    }
}
