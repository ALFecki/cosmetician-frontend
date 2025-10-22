import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { IconsModule } from '../../base/icons/icons.module';
import { BrandService } from '../../services/brand.service';
import { CategoryService } from '../../services/category.service';
import {
    BrandProfitabilityResponse,
    InventoryTurnoverResponse,
    StatisticsFilterSchema,
    StatisticsService,
    StatisticsSummaryResponse,
    WeightedROIResponse,
} from '../../services/statistics.service';
import { ToastService } from '../../services/toast.service';
import { BrandModel } from '../../models/brand.model';
import { CategoryModel } from '../../models/category.model';

@Component({
    selector: 'app-statistics',
    imports: [CommonModule, ReactiveFormsModule, IconsModule],
    templateUrl: './statistics.component.html',
    styleUrl: './statistics.component.scss',
})
export class StatisticsComponent implements OnInit {
    filterForm!: FormGroup;
    loading = false;
    error: string | null = null;

    // Data
    statisticsSummary: StatisticsSummaryResponse | null = null;
    brandProfitability: BrandProfitabilityResponse[] = [];
    weightedROI: WeightedROIResponse[] = [];
    inventoryTurnover: InventoryTurnoverResponse[] = [];

    // Options for filters
    brands: BrandModel[] = [];
    categories: CategoryModel[] = [];

    // Active section
    activeSection: 'summary' | 'profitability' | 'roi' | 'turnover' = 'summary';

    constructor(
        private fb: FormBuilder,
        private statisticsService: StatisticsService,
        private brandService: BrandService,
        private categoryService: CategoryService,
        private toastService: ToastService,
    ) {}

    ngOnInit(): void {
        this.initializeForm();
        this.loadFilterOptions();
        this.loadStatistics();
    }

    initializeForm(): void {
        this.filterForm = this.fb.group({
            brandId: [[]],
            categoryId: [[]],
            startDate: [''],
            endDate: [''],
            significanceCoefficient: [1.0],
        });
    }

    loadFilterOptions(): void {
        forkJoin({
            brands: this.brandService.getAll({ includeDeleted: false }),
            categories: this.categoryService.getAll({ includeDeleted: false }),
        })
            .pipe(
                catchError(error => {
                    console.error('Error loading filter options:', error);
                    return of({ brands: { data: [] }, categories: { data: [] } });
                }),
            )
            .subscribe(results => {
                this.brands = results.brands.data || [];
                this.categories = results.categories.data || [];
            });
    }

    loadStatistics(): void {
        this.loading = true;
        this.error = null;

        const filter = this.getFilterValues();

        this.statisticsService
            .getStatisticsSummary(filter)
            .pipe(
                catchError(error => {
                    console.error('Error loading statistics:', error);
                    this.error = 'Ошибка загрузки статистики';
                    this.toastService.show('Ошибка загрузки статистики', 'error');
                    return of(null);
                }),
            )
            .subscribe(response => {
                if (response && response.data) {
                    this.statisticsSummary = response.data;
                    this.brandProfitability = response.data.brandProfitability;
                    this.weightedROI = response.data.weightedROI;
                    this.inventoryTurnover = response.data.inventoryTurnover;
                } else {
                    this.error = 'Нет данных для отображения';
                }
                this.loading = false;
            });
    }

    getFilterValues(): StatisticsFilterSchema {
        const formValue = this.filterForm.value;
        const filter: StatisticsFilterSchema = {};

        if (formValue.brandId && formValue.brandId.length > 0) {
            filter.brandId = formValue.brandId;
        }
        if (formValue.categoryId && formValue.categoryId.length > 0) {
            filter.categoryId = formValue.categoryId;
        }
        if (formValue.startDate) {
            filter.startDate = formValue.startDate;
        }
        if (formValue.endDate) {
            filter.endDate = formValue.endDate;
        }
        if (formValue.significanceCoefficient) {
            filter.significanceCoefficient = formValue.significanceCoefficient;
        }

        return filter;
    }

    onFilterChange(): void {
        this.loadStatistics();
    }

    clearFilters(): void {
        this.filterForm.reset({
            brandId: [],
            categoryId: [],
            startDate: '',
            endDate: '',
            significanceCoefficient: 1.0,
        });
        this.loadStatistics();
    }

    setActiveSection(section: 'summary' | 'profitability' | 'roi' | 'turnover'): void {
        this.activeSection = section;
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('be-BY').format(value) + ' руб.';
    }

    formatPercentage(value: number): string {
        return new Intl.NumberFormat('be-BY', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value / 100);
    }

    formatNumber(value: number): string {
        return new Intl.NumberFormat('be-BY').format(value);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onBrandChange(brandId: string, event: any): void {
        const currentValue = this.filterForm.get('brandId')?.value || [];
        let newValue: string[];

        if (event.target.checked) {
            newValue = [...currentValue, brandId];
        } else {
            newValue = currentValue.filter((id: string) => id !== brandId);
        }

        this.filterForm.get('brandId')?.setValue(newValue);
        this.onFilterChange();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onCategoryChange(categoryId: string, event: any): void {
        const currentValue = this.filterForm.get('categoryId')?.value || [];
        let newValue: string[];

        if (event.target.checked) {
            newValue = [...currentValue, categoryId];
        } else {
            newValue = currentValue.filter((id: string) => id !== categoryId);
        }

        this.filterForm.get('categoryId')?.setValue(newValue);
        this.onFilterChange();
    }

    getTotalProfit(): number {
        return this.brandProfitability.reduce((sum, item) => sum + item.totalProfit, 0);
    }

    getTotalRevenue(): number {
        return this.brandProfitability.reduce((sum, item) => sum + item.totalRevenue, 0);
    }

    getTotalUnitsSold(): number {
        return this.brandProfitability.reduce((sum, item) => sum + item.unitsSold, 0);
    }

    getTopProfitableBrands(): BrandProfitabilityResponse[] {
        return [...this.brandProfitability].sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 5);
    }

    getTopProfitabilityBrands(): BrandProfitabilityResponse[] {
        return [...this.brandProfitability].sort((a, b) => b.profitabilityPercentage - a.profitabilityPercentage).slice(0, 5);
    }

    getProfitabilityBadgeClass(percentage: number): string {
        if (percentage >= 30) return 'bg-success';
        if (percentage >= 15) return 'bg-warning';
        return 'bg-danger';
    }

    getROIBadgeClass(roi: number): string {
        if (roi >= 0.5) return 'bg-success';
        if (roi >= 0.2) return 'bg-warning';
        return 'bg-danger';
    }

    getTurnoverBadgeClass(ratio: number): string {
        if (ratio >= 4) return 'bg-success';
        if (ratio >= 2) return 'bg-warning';
        return 'bg-danger';
    }
}
