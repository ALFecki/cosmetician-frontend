import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { ProductsComponent } from '../../shared/components/products/products.component';
import { BrandModel } from '../../shared/models/brand.model';
import { BrandService } from '../../shared/services/brand.service';
import { IconsModule } from '../../shared/base/icons/icons.module';
import { ImageUrlPipe } from '../../shared/utils/image-url.pipe';

@Component({
    selector: 'app-brand',
    imports: [CommonModule, ProductsComponent, IconsModule, ImageUrlPipe],
    templateUrl: './brand.component.html',
    styleUrl: './brand.component.scss',
})
export class BrandComponent implements OnInit {
    brandId!: string;
    brand$!: Observable<BrandModel>;
    loading = true;
    error = '';

    constructor(
        private route: ActivatedRoute,
        private brandService: BrandService,
    ) {}

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            this.brandId = params['id'];
            this.loadBrand();
        });
    }

    loadBrand(): void {
        this.loading = true;
        this.error = '';

        this.brandService.getById(this.brandId).subscribe({
            next: response => {
                this.brand$ = of(response.data);
                this.loading = false;
            },
            error: error => {
                console.error('Error loading brand:', error);
                this.error = 'Не удалось загрузить информацию о бренде';
                this.loading = false;
            },
        });
    }
}
