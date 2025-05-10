import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrandModel } from '../../models/brand.model';
import { CategoryModel } from '../../models/category.model';
import { CountryModel } from '../../models/country.model';
import { FilterProductSchema } from '../../schemas/product.schema';
import { BrandService } from '../../services/brand.service';
import { CategoryService } from '../../services/category.service';
import { CountryService } from '../../services/country.service';

@Component({
    selector: 'app-product-filter',
    standalone: true,
    imports: [CommonModule, FormsModule],
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
        countryId: [],
        minPrice: undefined,
        maxPrice: undefined,
        minVolume: undefined,
        maxVolume: undefined,
    };

    brands: BrandModel[] = [];
    categories: CategoryModel[] = [];
    countries: CountryModel[] = [];
    showFilter = false;

    constructor(
        private brandService: BrandService,
        private categoryService: CategoryService,
        private countryService: CountryService,
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

        this.countryService.getAll().subscribe(data => {
            this.countries = data.data;
        });
    }

    toggleFilter(): void {
        this.showFilter = !this.showFilter;
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

    toggleCountry(countryId: string): void {
        const index = this.filterData.countryId?.indexOf(countryId) ?? -1;
        if (index === -1) {
            this.filterData.countryId = [...(this.filterData.countryId || []), countryId];
        } else {
            this.filterData.countryId = (this.filterData.countryId || []).filter(id => id !== countryId);
        }
    }

    isBrandSelected(brandId: string): boolean {
        return this.filterData.brandId?.includes(brandId) || false;
    }

    isCategorySelected(categoryId: string): boolean {
        return this.filterData.categoryId?.includes(categoryId) || false;
    }

    isCountrySelected(countryId: string): boolean {
        return this.filterData.countryId?.includes(countryId) || false;
    }
}
