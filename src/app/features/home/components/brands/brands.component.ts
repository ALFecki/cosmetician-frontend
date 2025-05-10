import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BrandModel } from '../../../../shared/models/brand.model';
import { BrandService } from '../../../../shared/services/brand.service';

@Component({
    selector: 'app-brands',
    standalone: true,
    imports: [CommonModule, RouterModule],
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
        this.brandService.getAll().subscribe({
            next: response => {
                // Get just the first 4 brands to display
                this.brands = response.data.slice(0, 4);
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
