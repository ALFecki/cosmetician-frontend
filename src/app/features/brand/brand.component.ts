import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { BrandModel } from '../../shared/models/brand.model';
import { BrandService } from '../../shared/services/brand.service';
import { ProductsComponent } from '../../shared/components/products/products.component';

@Component({
    selector: 'app-brand',
    standalone: true,
    imports: [ProductsComponent],
    templateUrl: './brand.component.html',
    styleUrl: './brand.component.scss',
})
export class BrandComponent {
    brandId!: string;
    brand!: Observable<BrandModel>;

    constructor(
        private route: ActivatedRoute,
        brandService: BrandService,
    ) {
        this.route.params.subscribe(params => {
            this.brandId = params['id'];
        });

        brandService.getById(this.brandId).subscribe(data => {
            this.brand = of(data.data);
        });
    }
}
