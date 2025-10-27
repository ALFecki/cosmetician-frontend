import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrandModel } from '../../models/brand.model';
import { CategoryModel } from '../../models/category.model';
import { ProductScopeModel } from '../../models/product.model';
import { FilterProductSchema } from '../../schemas/product.schema';
import { BrandService } from '../../services/brand.service';
import { CategoryService } from '../../services/category.service';
import { ProductScopeService } from '../../services/product_scope.service';

@Component({
    selector: 'app-product-filter',
    imports: [FormsModule],
    templateUrl: './product-filter.component.html',
    styleUrls: ['./product-filter.component.scss'],
})
export class ProductFilterComponent implements OnInit {
    @Output() filterChange = new EventEmitter<FilterProductSchema>();
    @Input() initialFilters: FilterProductSchema = {};

    filterData: FilterProductSchema = {
        title: '',
        brandId: [],
        categoryId: [],
        productScopeId: [],
        countryId: [],
        minPrice: undefined,
        maxPrice: undefined,
        minVolume: undefined,
        maxVolume: undefined,
    };

    brands: BrandModel[] = [];
    categories: CategoryModel[] = [];
    productScopes: ProductScopeModel[] = [];

    constructor(
        private brandService: BrandService,
        private categoryService: CategoryService,
        private productScopeService: ProductScopeService,
    ) {}

    ngOnInit(): void {
        this.loadFilterOptions();
        if (this.initialFilters) {
            this.filterData = { ...this.filterData, ...this.initialFilters };
        }
    }

    loadFilterOptions(): void {
        this.brandService.getAll().subscribe(data => {
            this.brands = data.data;
        });

        this.categoryService.getAll().subscribe(data => {
            this.categories = data.data;
        });

        this.productScopeService.getAll().subscribe(data => {
            this.productScopes = data.data;
        });
    }

    get activeFiltersCount(): number {
        let count = 0;
        if (this.filterData.title) count++;
        if (this.filterData.brandId && this.filterData.brandId.length > 0) count += this.filterData.brandId.length;
        if (this.filterData.categoryId && this.filterData.categoryId.length > 0) count += this.filterData.categoryId.length;
        if (this.filterData.productScopeId && this.filterData.productScopeId.length > 0) count += this.filterData.productScopeId.length;
        if (this.filterData.minPrice !== undefined) count++;
        if (this.filterData.maxPrice !== undefined) count++;
        if (this.filterData.minVolume !== undefined) count++;
        if (this.filterData.maxVolume !== undefined) count++;
        return count;
    }

    applyFilter(): void {
        const cleanedFilter = this.cleanFilterObject(this.filterData);
        this.filterChange.emit(cleanedFilter);
    }

    resetFilter(): void {
        this.filterData = {
            title: '',
            brandId: [],
            categoryId: [],
            countryId: [],
            productScopeId: [],
            minPrice: undefined,
            maxPrice: undefined,
            minVolume: undefined,
            maxVolume: undefined,
        };
        this.filterChange.emit({});
    }

    private cleanFilterObject(filter: FilterProductSchema): FilterProductSchema {
        const result: FilterProductSchema = {};

        Object.entries(filter).forEach(([key, value]) => {
            if (value !== '' && value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    if (value.length > 0) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        result[key as keyof FilterProductSchema] = value as any;
                    }
                } else {
                    result[key as keyof FilterProductSchema] = value;
                }
            }
        });

        return result;
    }

    toggleBrand(brandId: string): void {
        const index = this.filterData.brandId?.indexOf(brandId) ?? -1;
        if (index === -1) {
            this.filterData.brandId = [...(this.filterData.brandId || []), brandId];
        } else {
            this.filterData.brandId = (this.filterData.brandId || []).filter(id => id !== brandId);
        }
    }

    toggleCategory(categoryId: string): void {
        const index = this.filterData.categoryId?.indexOf(categoryId) ?? -1;
        if (index === -1) {
            this.filterData.categoryId = [...(this.filterData.categoryId || []), categoryId];
        } else {
            this.filterData.categoryId = (this.filterData.categoryId || []).filter(id => id !== categoryId);
        }
    }

    toggleProductScope(productScopeId: string): void {
        const index = this.filterData.productScopeId?.indexOf(productScopeId) ?? -1;
        if (index === -1) {
            this.filterData.productScopeId = [...(this.filterData.productScopeId || []), productScopeId];
        } else {
            this.filterData.productScopeId = (this.filterData.productScopeId || []).filter(id => id !== productScopeId);
        }
    }

    isBrandSelected(brandId: string): boolean {
        return this.filterData.brandId?.includes(brandId) || false;
    }

    isCategorySelected(categoryId: string): boolean {
        return this.filterData.categoryId?.includes(categoryId) || false;
    }

    isProductScopeSelected(productScopeId: string): boolean {
        return this.filterData.productScopeId?.includes(productScopeId) || false;
    }
}
