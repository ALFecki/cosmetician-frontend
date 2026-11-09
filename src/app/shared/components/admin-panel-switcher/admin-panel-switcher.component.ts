/* eslint-disable @typescript-eslint/no-explicit-any */

import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, catchError, forkJoin, of, tap } from 'rxjs';
import { IconsModule } from '../../base/icons/icons.module';
import { FilterBrandSchema } from '../../schemas/brand.schema';
import { FilterCategorySchema } from '../../schemas/category.schema';
import { FilterCountrySchema } from '../../schemas/country.schema';
import { FilterProductScopeSchema, FilterProductTypeSchema } from '../../schemas/product.schema';
import { CreateProductVariantSchema } from '../../schemas/product_variant.schema';
import { BrandService } from '../../services/brand.service';
import { CategoryService } from '../../services/category.service';
import { CountryService } from '../../services/country.service';
import { MaintenanceService } from '../../services/maintenance.service';
import { PersonService } from '../../services/person.service';
import { ProductVariantService } from '../../services/product-variant.service';
import { ProductService } from '../../services/product.service';
import { ProductScopeService } from '../../services/product_scope.service';
import { ProductTypeSevice } from '../../services/product_type.service';
import { PromocodeService } from '../../services/promocode.service';
import { PromotionService } from '../../services/promotion.service';
import { StatisticsService } from '../../services/statistics.service';
import { ToastService } from '../../services/toast.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';
import { AdminOrdersComponent } from '../admin-orders/admin-orders.component';
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { StatisticsComponent } from '../statistics/statistics.component';

interface ModelConfig {
    key: string;
    title: string;
    service: any;
    fields: {
        key: string;
        label: string;
        type:
            | 'text'
            | 'number'
            | 'textarea'
            | 'select'
            | 'file'
            | 'image'
            | 'email'
            | 'boolean'
            | 'multiselect'
            | 'variants'
            | 'datetime-local'
            | 'product-search';
        required?: boolean;
        options?: any[];
    }[];
    columns: {
        key: string;
        title: string;
        type?: 'text' | 'number' | 'image' | 'date' | 'boolean' | 'array' | 'variants';
    }[];
}

@Component({
    selector: 'app-admin-panel-switcher',
    templateUrl: './admin-panel-switcher.component.html',
    styleUrl: './admin-panel-switcher.component.scss',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        StatisticsComponent,
        AdminOrdersComponent,
        GenericTableComponent,
        IconsModule,
        ImageUrlPipe,
    ],
})
export class AdminPanelSwitcherComponent implements OnInit {
    @ViewChild('itemModal') itemModal!: TemplateRef<any>;
    @ViewChild('deleteModal') deleteModal!: TemplateRef<any>;
    @ViewChild('variantModal') variantModal!: TemplateRef<any>;

    availableModels = [
        { key: 'orders', title: 'Заказы' },
        { key: 'product', title: 'Товары' },
        { key: 'category', title: 'Категории' },
        { key: 'brand', title: 'Бренды' },
        { key: 'person', title: 'Пользователи' },
        { key: 'statistics', title: 'Статистика' },
    ];
    currentModel = 'products';
    currentModelData: any[] = [];
    filteredData: any[] = [];

    itemForm!: FormGroup;
    variantForm!: FormGroup;
    isEditMode = false;
    editingItem: any = null;
    selectedItemId: string | null = null;
    saving = false;
    savingVariant = false;
    deleting = false;
    cascadeDeleting = false;
    restoring = false;
    currentProductId: string | null = null;
    showDeletedVariants = false;

    loading = false;
    error: string | null = null;
    searchText = '';

    isMaintenanceMode = false;
    maintenanceDuration: number | null = null;
    maintenanceLoading = false;

    private modelConfigs: Record<string, ModelConfig> = {};

    filePreviewUrls: Record<string, string> = {};
    selectedFiles: Record<string, File> = {};

    // Product search
    productSearchText: Record<string, string> = {};
    allProducts: any[] = [];
    filteredProducts: Record<string, any[]> = {};
    selectedProducts: Record<string, any[]> = {};
    showProductDropdown: Record<string, boolean> = {};

    constructor(
        private fb: FormBuilder,
        private modalService: NgbModal,
        private productService: ProductService,
        private productScopeService: ProductScopeService,
        private productTypeService: ProductTypeSevice,
        private categoryService: CategoryService,
        private brandService: BrandService,
        private personService: PersonService,
        private countryService: CountryService,
        private maintenanceService: MaintenanceService,
        private toastService: ToastService,
        private statisticsService: StatisticsService,
        private productVariantService: ProductVariantService,
        private promotionService: PromotionService,
        private promocodeService: PromocodeService,
    ) {}

    ngOnInit(): void {
        this.setupModelConfigs();
        this.setupVariantForm();
        this.availableModels = Object.keys(this.modelConfigs).map(key => ({
            key,
            title: this.modelConfigs[key].title,
        }));

        this.loadData();
        this.loadMaintenanceStatus();
    }

    setupVariantForm() {
        this.variantForm = this.fb.group({
            volume: ['', [Validators.required, Validators.min(1)]],
            price: ['', [Validators.required, Validators.min(0.01)]],
            costPrice: ['', [Validators.required, Validators.min(0.01)]],
        });
    }

    loadMaintenanceStatus(): void {
        this.maintenanceService.getMaintenanceStatus().subscribe(status => {
            this.isMaintenanceMode = status.enabled;
            this.maintenanceDuration = status.ttl || null;
        });
    }

    toggleMaintenanceMode(): void {
        this.maintenanceLoading = true;

        const operation = this.isMaintenanceMode
            ? this.maintenanceService.disableMaintenanceMode()
            : this.maintenanceService.enableMaintenanceMode(this.maintenanceDuration || undefined);

        operation.subscribe({
            next: () => {
                this.isMaintenanceMode = !this.isMaintenanceMode;
                const status = this.isMaintenanceMode ? 'включен' : 'отключен';
                this.toastService.show(`Режим технических работ ${status}`, 'success');
                this.maintenanceLoading = false;
            },
            error: error => {
                console.error('Error toggling maintenance mode:', error);
                this.toastService.show('Ошибка при изменении режима технических работ', 'error');
                this.maintenanceLoading = false;
            },
        });
    }

    setupModelConfigs() {
        this.modelConfigs['products'] = {
            key: 'products',
            title: 'Продукты',
            service: this.productService,
            fields: [
                { key: 'title', label: 'Название', type: 'text', required: true },
                { key: 'fullTitle', label: 'Полное название', type: 'text', required: false },
                { key: 'description', label: 'Описание', type: 'textarea', required: true },
                { key: 'image', label: 'Изображение', type: 'image', required: false },
                { key: 'variants', label: 'Варианты (Объем-Себестоимость-Цена)', type: 'variants', required: false },
                { key: 'isPriceHidden', label: 'Скрыть цену', type: 'boolean', required: false },
                { key: 'categoryIds', label: 'Категории', type: 'multiselect', required: true },
                { key: 'brandId', label: 'Бренд', type: 'select', required: true },
                { key: 'countryIds', label: 'Страны производители', type: 'multiselect', required: false },
                { key: 'composition', label: 'Состав', type: 'textarea', required: false },
                { key: 'productScopeIds', label: 'Область применения', type: 'multiselect', required: false },
                { key: 'productTypeId', label: 'Тип продукта', type: 'select', required: false },
                { key: 'methodOfUse', label: 'Способ применения', type: 'textarea', required: false },
            ],
            columns: [
                { key: 'id', title: 'ID' },
                { key: 'image', title: 'Изображение', type: 'image' },
                { key: 'title', title: 'Название' },
                { key: 'fullTitle', title: 'Полное название', type: 'text' },
                { key: 'description', title: 'Описание', type: 'text' },
                { key: 'variants', title: 'Варианты (Объем/Себестоимость/Цена)', type: 'variants' },
                { key: 'categories', title: 'Категории', type: 'array' },
                { key: 'brand.title', title: 'Бренд' },
                { key: 'countries', title: 'Страны', type: 'array' },
                { key: 'composition', title: 'Состав', type: 'text' },
                { key: 'productScopes', title: 'Область применения', type: 'array' },
                { key: 'productType.title', title: 'Тип продукта' },
                { key: 'methodOfUse', title: 'Способ применения', type: 'text' },
                { key: 'isDeleted', title: 'Удален' },
                { key: 'createdAt', title: 'Дата создания', type: 'date' },
                { key: 'updatedAt', title: 'Дата обновления', type: 'date' },
            ],
        };

        this.modelConfigs['productTypes'] = {
            key: 'productTypes',
            title: 'Типы продуктов',
            service: this.productTypeService,
            fields: [
                { key: 'title', label: 'Название', type: 'text', required: true },
                { key: 'description', label: 'Описание', type: 'textarea', required: false },
            ],
            columns: [
                { key: 'id', title: 'ID' },
                { key: 'title', title: 'Название' },
                { key: 'description', title: 'Описание' },
                { key: 'isDeleted', title: 'Удален' },
                { key: 'createdAt', title: 'Дата создания', type: 'date' },
                { key: 'updatedAt', title: 'Дата обновления', type: 'date' },
            ],
        };

        this.modelConfigs['productScopes'] = {
            key: 'productScopes',
            title: 'Области применения',
            service: this.productScopeService,
            fields: [
                { key: 'title', label: 'Название', type: 'text', required: true },
                { key: 'description', label: 'Описание', type: 'textarea', required: false },
            ],
            columns: [
                { key: 'id', title: 'ID' },
                { key: 'title', title: 'Название' },
                { key: 'description', title: 'Описание' },
                { key: 'isDeleted', title: 'Удален' },
                { key: 'createdAt', title: 'Дата создания', type: 'date' },
                { key: 'updatedAt', title: 'Дата обновления', type: 'date' },
            ],
        };

        this.modelConfigs['categories'] = {
            key: 'categories',
            title: 'Категории',
            service: this.categoryService,
            fields: [
                { key: 'title', label: 'Название', type: 'text', required: true },
                { key: 'description', label: 'Описание', type: 'textarea', required: true },
                { key: 'image', label: 'Изображение', type: 'image', required: false },
            ],
            columns: [
                { key: 'id', title: 'ID' },
                { key: 'image', title: 'Изображение', type: 'image' },
                { key: 'title', title: 'Название' },
                { key: 'description', title: 'Описание' },
                { key: 'isDeleted', title: 'Удален' },
                { key: 'createdAt', title: 'Дата создания', type: 'date' },
                { key: 'updatedAt', title: 'Дата обновления', type: 'date' },
            ],
        };

        this.modelConfigs['brands'] = {
            key: 'brands',
            title: 'Бренды',
            service: this.brandService,
            fields: [
                { key: 'title', label: 'Название', type: 'text', required: true },
                { key: 'description', label: 'Описание', type: 'textarea', required: true },
                { key: 'manufacturer', label: 'Производитель', type: 'text', required: false },
                { key: 'importer', label: 'Импортёр', type: 'text', required: false },
                { key: 'image', label: 'Изображение', type: 'image', required: false },
            ],
            columns: [
                { key: 'id', title: 'ID' },
                { key: 'image', title: 'Изображение', type: 'image' },
                { key: 'title', title: 'Название' },
                { key: 'description', title: 'Описание' },
                { key: 'manufacturer', title: 'Производитель' },
                { key: 'importer', title: 'Импортёр' },
                { key: 'isDeleted', title: 'Удален' },
                { key: 'createdAt', title: 'Дата создания', type: 'date' },
                { key: 'updatedAt', title: 'Дата обновления', type: 'date' },
            ],
        };

        this.modelConfigs['users'] = {
            key: 'users',
            title: 'Пользователи',
            service: this.personService,
            fields: [
                { key: 'email', label: 'Email', type: 'email', required: true },
                { key: 'firstName', label: 'Имя', type: 'text', required: true },
                { key: 'secondName', label: 'Фамилия', type: 'text', required: true },
                { key: 'surname', label: 'Отчество', type: 'text', required: false },
                {
                    key: 'isAdmin',
                    label: 'Администратор',
                    type: 'select',
                    required: true,
                    options: [
                        { id: 'true', title: 'Да' },
                        { id: 'false', title: 'Нет' },
                    ],
                },
                {
                    key: 'isModerator',
                    label: 'Модератор',
                    type: 'select',
                    required: true,
                    options: [
                        { id: 'true', title: 'Да' },
                        { id: 'false', title: 'Нет' },
                    ],
                },
            ],
            columns: [
                { key: 'id', title: 'ID' },
                { key: 'email', title: 'Email' },
                { key: 'firstName', title: 'Имя' },
                { key: 'secondName', title: 'Фамилия' },
                { key: 'surname', title: 'Отчество' },
                { key: 'isAdmin', title: 'Администратор' },
                { key: 'isModerator', title: 'Модератор' },
                { key: 'isDeleted', title: 'Удален' },
                { key: 'createdAt', title: 'Дата создания', type: 'date' },
                { key: 'updatedAt', title: 'Дата обновления', type: 'date' },
            ],
        };

        this.modelConfigs['orders'] = {
            key: 'orders',
            title: 'Заказы',
            service: this.personService,
            fields: [
                { key: 'userId', label: 'ID пользователя', type: 'text', required: true },
                { key: 'productId', label: 'ID продукта', type: 'text', required: true },
                { key: 'quantity', label: 'Количество', type: 'number', required: true },
                { key: 'status', label: 'Статус', type: 'text', required: true },
            ],
            columns: [
                { key: 'id', title: 'ID' },
                { key: 'userId', title: 'ID пользователя' },
                { key: 'productId', title: 'ID продукта' },
                { key: 'quantity', title: 'Количество' },
                { key: 'status', title: 'Статус' },
                { key: 'isDeleted', title: 'Удален' },
                { key: 'createdAt', title: 'Дата создания', type: 'date' },
                { key: 'updatedAt', title: 'Дата обновления', type: 'date' },
            ],
        };

        this.modelConfigs['countries'] = {
            key: 'countries',
            title: 'Страны',
            service: this.countryService,
            fields: [
                { key: 'name', label: 'Название', type: 'text', required: true },
                { key: 'code', label: 'Код', type: 'text', required: true },
            ],
            columns: [
                { key: 'id', title: 'ID' },
                { key: 'name', title: 'Название' },
                { key: 'code', title: 'Код' },
                { key: 'isDeleted', title: 'Удален' },
                { key: 'createdAt', title: 'Дата создания', type: 'date' },
                { key: 'updatedAt', title: 'Дата обновления', type: 'date' },
            ],
        };

        this.modelConfigs['promotions'] = {
            key: 'promotions',
            title: 'Акции',
            service: this.promotionService,
            fields: [
                { key: 'title', label: 'Название акции', type: 'text', required: true },
                { key: 'description', label: 'Описание', type: 'textarea', required: false },
                {
                    key: 'targetType',
                    label: 'Тип цели',
                    type: 'select',
                    required: true,
                    options: [
                        { id: 'product', title: 'Конкретный товар' },
                        { id: 'brand', title: 'Бренд' },
                        { id: 'category', title: 'Категория' },
                        { id: 'all', title: 'Все товары' },
                    ],
                },
                { key: 'productIds', label: 'Выберите товары (если тип цели = товар)', type: 'product-search', required: false },
                {
                    key: 'discountType',
                    label: 'Тип скидки',
                    type: 'select',
                    required: true,
                    options: [
                        { id: 'percentage', title: 'Процент' },
                        { id: 'fixed', title: 'Фиксированная сумма' },
                    ],
                },
                { key: 'discountValue', label: 'Значение скидки', type: 'number', required: true },
                { key: 'minQuantity', label: 'Минимальное количество товаров', type: 'number', required: false },
                { key: 'buyQuantity', label: 'Купи N товаров', type: 'number', required: false },
                { key: 'getQuantity', label: 'Получи M товаров', type: 'number', required: false },
                { key: 'priority', label: 'Приоритет (чем выше, тем приоритетнее)', type: 'number', required: true },
                { key: 'validFrom', label: 'Действительна с', type: 'datetime-local', required: true },
                { key: 'validUntil', label: 'Действительна до', type: 'datetime-local', required: true },
                {
                    key: 'isActive',
                    label: 'Активна',
                    type: 'select',
                    required: true,
                    options: [
                        { id: 'true', title: 'Да' },
                        { id: 'false', title: 'Нет' },
                    ],
                },
            ],
            columns: [
                { key: 'id', title: 'ID' },
                { key: 'title', title: 'Название' },
                { key: 'description', title: 'Описание' },
                { key: 'targetType', title: 'Тип цели' },
                { key: 'discountType', title: 'Тип скидки' },
                { key: 'discountValue', title: 'Значение скидки' },
                { key: 'minQuantity', title: 'Мин. кол-во' },
                { key: 'buyQuantity', title: 'Купи N' },
                { key: 'getQuantity', title: 'Получи M' },
                { key: 'priority', title: 'Приоритет' },
                { key: 'validFrom', title: 'Действительна с', type: 'date' },
                { key: 'validUntil', title: 'Действительна до', type: 'date' },
                { key: 'isActive', title: 'Активна', type: 'boolean' },
                { key: 'createdAt', title: 'Дата создания', type: 'date' },
                { key: 'updatedAt', title: 'Дата обновления', type: 'date' },
            ],
        };

        this.modelConfigs['promocodes'] = {
            key: 'promocodes',
            title: 'Промокоды',
            service: this.promocodeService,
            fields: [
                { key: 'code', label: 'Промокод', type: 'text', required: true },
                {
                    key: 'discountType',
                    label: 'Тип скидки',
                    type: 'select',
                    required: true,
                    options: [
                        { id: 'percentage', title: 'Процент' },
                        { id: 'fixed', title: 'Фиксированная сумма' },
                    ],
                },
                { key: 'discountValue', label: 'Значение скидки', type: 'number', required: true },
                { key: 'minOrderAmount', label: 'Минимальная сумма заказа', type: 'number', required: false },
                { key: 'maxDiscountAmount', label: 'Максимальная сумма скидки', type: 'number', required: false },
                { key: 'usageLimit', label: 'Лимит использований (0 = безлимит)', type: 'number', required: false },
                { key: 'validFrom', label: 'Действителен с', type: 'datetime-local', required: true },
                { key: 'validUntil', label: 'Действителен до', type: 'datetime-local', required: true },
                {
                    key: 'isActive',
                    label: 'Активен',
                    type: 'select',
                    required: true,
                    options: [
                        { id: 'true', title: 'Да' },
                        { id: 'false', title: 'Нет' },
                    ],
                },
            ],
            columns: [
                { key: 'id', title: 'ID' },
                { key: 'code', title: 'Промокод' },
                { key: 'discountType', title: 'Тип скидки' },
                { key: 'discountValue', title: 'Значение' },
                { key: 'minOrderAmount', title: 'Мин. сумма заказа' },
                { key: 'maxDiscountAmount', title: 'Макс. скидка' },
                { key: 'usageLimit', title: 'Лимит' },
                { key: 'usageCount', title: 'Использовано' },
                { key: 'validFrom', title: 'Действителен с', type: 'date' },
                { key: 'validUntil', title: 'Действителен до', type: 'date' },
                { key: 'isActive', title: 'Активен', type: 'boolean' },
                { key: 'createdAt', title: 'Дата создания', type: 'date' },
                { key: 'updatedAt', title: 'Дата обновления', type: 'date' },
            ],
        };

        this.modelConfigs['statistics'] = {
            key: 'statistics',
            title: 'Статистика',
            service: this.statisticsService,
            fields: [],
            columns: [],
        };
    }

    get currentModelConfig(): ModelConfig {
        return this.modelConfigs[this.currentModel];
    }

    get currentModelFields() {
        return this.currentModelConfig.fields;
    }

    get currentModelColumns() {
        return this.currentModelConfig.columns;
    }

    getCurrentModelTitle(): string {
        return this.currentModelConfig?.title || '';
    }

    switchModel(modelKey: string) {
        if (this.currentModel !== modelKey) {
            this.currentModel = modelKey;
            this.searchText = '';
            if (modelKey === 'statistics') {
                this.loading = false;
            } else {
                this.loadData();
            }
        }
    }

    loadData() {
        this.loading = true;
        this.error = null;

        const observables: Record<string, Observable<any>> = {};

        if (this.currentModel === 'products') {
            observables['categories'] = this.categoryService.getAll({ includeDeleted: true } as FilterCategorySchema);
            observables['brands'] = this.brandService.getAll({ includeDeleted: true } as FilterBrandSchema);
            observables['countries'] = this.countryService.getAll({ includeDeleted: true } as FilterCountrySchema);
            observables['productTypes'] = this.productTypeService.getAll({ includeDeleted: true } as FilterProductTypeSchema);
            observables['productScopes'] = this.productScopeService.getAll({ includeDeleted: true } as FilterProductScopeSchema);
        }

        // Load products for promotions model
        if (this.currentModel === 'promotions') {
            observables['products'] = this.productService.getAll({ includeDeleted: false });
        }

        if (Object.keys(observables).length > 0) {
            forkJoin(observables)
                .pipe(
                    tap(results => {
                        this.currentModelConfig.fields.forEach(field => {
                            if (field.type === 'select' || field.type === 'multiselect') {
                                if (field.key === 'categoryIds' && results['categories']) {
                                    field.options = results['categories'].data;
                                } else if (field.key === 'brandId' && results['brands']) {
                                    field.options = results['brands'].data;
                                } else if (field.key === 'countryIds' && results['countries']) {
                                    field.options = results['countries'].data;
                                } else if (field.key === 'productScopeIds' && results['productScopes']) {
                                    field.options = results['productScopes'].data;
                                } else if (field.key === 'productTypeId' && results['productTypes']) {
                                    field.options = results['productTypes'].data;
                                }
                            }
                        });

                        // Load products for product-search fields
                        if (results['products']) {
                            this.allProducts = results['products'].data;
                        }
                    }),
                    catchError(error => {
                        console.error('Error loading options:', error);
                        return of(null);
                    }),
                )
                .subscribe(() => {
                    this.loadMainData();
                });
        } else {
            this.loadMainData();
        }
    }

    loadMainData() {
        const service = this.currentModelConfig.service;

        service.getAll({ includeDeleted: true }).subscribe(
            (response: any) => {
                this.currentModelData = response.data;
                this.filteredData = [...this.currentModelData];
                this.loading = false;
            },
            (error: any) => {
                console.error(`Error loading ${this.currentModel}:`, error);
                this.error = `Ошибка загрузки данных: ${error.message || 'Неизвестная ошибка'}`;
                this.loading = false;
            },
        );
    }

    onSearchChange() {
        console.log('On search change');
        if (!this.searchText.trim()) {
            console.log('return1');
            this.filteredData = [...this.currentModelData];
            return;
        }

        const searchLower = this.searchText.toLowerCase().trim();

        this.filteredData = this.currentModelData.filter(item => {
            return String(item['title']).toLowerCase().includes(searchLower);
        });
    }

    clearSearch() {
        this.searchText = '';
        this.filteredData = [...this.currentModelData];
    }

    buildForm(item?: any) {
        const formControls: any = {};

        this.currentModelFields.forEach(field => {
            let value: any = '';

            if (item) {
                if (field.key === 'variants') {
                    const allVariants = item.variants || [{ volume: '', costPrice: '', price: '' }];
                    value = this.getFilteredVariants(allVariants);
                } else if (field.key === 'categoryIds') {
                    value = item.categories?.map((cat: any) => cat.id) || [];
                } else if (field.key === 'countryIds') {
                    value = item.countries?.map((country: any) => country.id) || [];
                } else if (field.key === 'productScopeIds') {
                    value = item.productScopes?.map((scope: any) => scope.id) || [];
                } else if (field.type === 'datetime-local' && item[field.key]) {
                    // Convert date to datetime-local format (YYYY-MM-DDTHH:mm)
                    const date = new Date(item[field.key]);
                    value = date.toISOString().slice(0, 16);
                } else if (field.type === 'product-search' && item[field.key]) {
                    // Convert array of IDs to comma-separated string for internal use
                    const productIds = Array.isArray(item[field.key]) ? item[field.key] : [];
                    value = productIds.join(',');
                    this.initializeProductSearch(field.key, value);
                } else {
                    value = field.key.includes('.') ? this.getNestedProperty(item, field.key) : item[field.key] || '';
                }
            } else {
                if (field.key === 'variants') {
                    value = [];
                } else if (field.type === 'multiselect') {
                    value = [];
                } else if (field.type === 'product-search') {
                    this.selectedProducts[field.key] = [];
                    this.productSearchText[field.key] = '';
                    this.showProductDropdown[field.key] = false;
                }
            }

            if (field.key === 'variants') {
                formControls[field.key] = this.fb.array(
                    value.map((variant: any) =>
                        this.fb.group({
                            id: [variant.id || null],
                            volume: [variant.volume || '', Validators.required],
                            costPrice: [variant.costPrice || '', Validators.required],
                            price: [variant.price || '', Validators.required],
                            isDeleted: [variant.isDeleted || false],
                        }),
                    ),
                );
            } else {
                const validators = [];
                if (field.required) validators.push(Validators.required);
                if (field.type === 'email') validators.push(Validators.email);
                formControls[field.key] = [value, validators];
            }
        });

        return this.fb.group(formControls);
    }

    getNestedProperty(obj: any, path: string): any {
        return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
    }

    openAddModal() {
        this.isEditMode = false;
        this.selectedItemId = null;
        this.editingItem = null;
        this.itemForm = this.buildForm();
        this.resetFileUploads();
        this.modalService.open(this.itemModal, { size: 'lg' });
    }

    editItem(item: any) {
        this.isEditMode = true;
        this.selectedItemId = item.id;
        this.editingItem = item;
        this.showDeletedVariants = false; // Reset checkbox when opening new item
        this.itemForm = this.buildForm(item);
        this.resetFileUploads();
        this.modalService.open(this.itemModal, { size: 'lg' });
    }

    openDeleteModal(item: any) {
        this.selectedItemId = item.id;
        this.modalService.open(this.deleteModal);
    }

    openCascadeDeleteModal(item: any) {
        this.selectedItemId = item.id;
        this.cascadeDeleting = true;
        this.modalService.open(this.deleteModal);
    }

    resetFileUploads() {
        this.filePreviewUrls = {};
        this.selectedFiles = {};
        // Reset product search state
        this.productSearchText = {};
        this.showProductDropdown = {};
    }

    onFileSelected(event: Event, fieldKey: string) {
        const fileInput = event.target as HTMLInputElement;
        if (fileInput.files && fileInput.files.length) {
            const file = fileInput.files[0];
            this.selectedFiles[fieldKey] = file;

            const reader = new FileReader();
            reader.onload = () => {
                this.filePreviewUrls[fieldKey] = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    cancelFileSelection(fieldKey: string) {
        const fileInput = document.getElementById(fieldKey) as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
        return null;
    }

    async reloadProductVariants() {
        if (!this.currentProductId || this.currentModel !== 'products') return;

        try {
            const response = await this.productService.getById(this.currentProductId).toPromise();
            if (response?.data) {
                this.editingItem = response.data;

                const filteredVariants = this.getFilteredVariants(response.data.variants || []);
                this.updateVariantsInForm(filteredVariants);
                const index = this.currentModelData.findIndex(item => item.id === this.currentProductId);
                if (index !== -1) {
                    this.currentModelData[index] = response.data;
                    this.filteredData = [...this.currentModelData];
                }
            }
        } catch (error) {
            console.error('Error reloading product variants:', error);
            this.toastService.show('Ошибка при обновлении данных продукта', 'error');
        }
    }

    getFilteredVariants(variants: any[]): any[] {
        if (!variants) return [];
        return this.showDeletedVariants ? variants : variants.filter(v => !v.isDeleted);
    }

    updateVariantsInForm(variants: any[]) {
        const variantsArray = this.getVariantsFormArray();
        if (!variantsArray) return;

        while (variantsArray.length !== 0) {
            variantsArray.removeAt(0);
        }

        variants.forEach(variant => {
            variantsArray.push(
                this.fb.group({
                    id: [variant.id || null],
                    volume: [variant.volume || '', Validators.required],
                    costPrice: [variant.costPrice || '', Validators.required],
                    price: [variant.price || '', Validators.required],
                    isDeleted: [variant.isDeleted || false],
                }),
            );
        });
    }

    onShowDeletedVariantsChange() {
        if (this.editingItem?.variants) {
            const filteredVariants = this.getFilteredVariants(this.editingItem.variants);
            this.updateVariantsInForm(filteredVariants);
        }
    }

    openVariantModal() {
        if (!this.editingItem?.id) {
            this.toastService.show('Сначала сохраните продукт, затем добавляйте варианты', 'warning');
            return;
        }

        this.currentProductId = this.editingItem.id;
        this.variantForm.reset();
        this.modalService.open(this.variantModal, { backdrop: 'static' });
    }

    async saveVariant() {
        if (this.variantForm.invalid || this.savingVariant || !this.currentProductId) {
            Object.keys(this.variantForm.controls).forEach(key => {
                this.variantForm.get(key)?.markAsTouched();
            });
            return;
        }

        this.savingVariant = true;

        const variantData: CreateProductVariantSchema = {
            ...this.variantForm.value,
            productId: this.currentProductId,
        };

        try {
            const response = await this.productVariantService.create(variantData);
            if (response?.status) {
                this.toastService.show('Вариант успешно добавлен', 'success');
                this.variantForm.reset();
                await this.reloadProductVariants();
            }
        } catch (error) {
            console.error('Error creating variant:', error);
            this.toastService.show('Ошибка при создании варианта', 'error');
        } finally {
            this.savingVariant = false;
        }
    }

    async removeVariant(index: number): Promise<void> {
        if (this.currentModel !== 'products') return;

        const variantsArray = this.getVariantsFormArray();
        if (!variantsArray) return;

        const activeVariants = this.editingItem?.variants?.filter((v: any) => !v.isDeleted) || [];
        if (activeVariants.length <= 1) {
            this.toastService.show('Нельзя удалить последний активный вариант продукта', 'warning');
            return;
        }

        const variantControl = variantsArray.at(index);
        const variantId = variantControl?.get('id')?.value;

        if (!variantId) {
            variantsArray.removeAt(index);
            return;
        }

        try {
            const response = await this.productVariantService.delete(variantId).toPromise();
            if (response?.status) {
                this.toastService.show('Вариант удален', 'success');
                await this.reloadProductVariants();
            }
        } catch (error) {
            console.error('Error deleting variant:', error);
            this.toastService.show('Ошибка при удалении варианта', 'error');
        }
    }

    getVariantsFormArray() {
        return this.itemForm.get('variants') as any;
    }

    getVariantId(index: number): string | null {
        const variantsArray = this.itemForm.get('variants') as any;
        if (variantsArray && variantsArray.at(index)) {
            return variantsArray.at(index).get('id')?.value || null;
        }
        return null;
    }

    async saveItem() {
        if (this.itemForm.invalid || this.saving) {
            Object.keys(this.itemForm.controls).forEach(key => {
                this.itemForm.get(key)?.markAsTouched();
            });
            return;
        }

        this.saving = true;
        const service = this.currentModelConfig.service;
        const formData: Record<string, any> = {};

        Object.keys(this.itemForm.value).forEach(key => {
            if (this.selectedFiles[key]) {
                return;
            }

            const value = this.itemForm.value[key];
            const field = this.currentModelFields.find(f => f.key === key);

            if (value !== null && value !== undefined && value !== '') {
                if (key === 'variants' || key === 'categoryIds' || key === 'countryIds' || key === 'productScopeIds') {
                    formData[key] = JSON.stringify(value);
                } else if (field?.type === 'datetime-local') {
                    // Convert datetime-local to ISO string for backend
                    formData[key] = new Date(value).toISOString();
                } else if (field?.type === 'product-search') {
                    // Convert comma-separated string to array and stringify like categoryIds
                    const productIds = value.split(',').filter((id: string) => id.trim());
                    formData[key] = JSON.stringify(productIds);
                } else if (typeof value === 'object' && !Array.isArray(value)) {
                    formData[key] = JSON.stringify(value);
                } else {
                    formData[key] = value;
                }
            }
        });

        if (this.currentModel === 'product') {
            delete formData['variants'];
        }

        Object.keys(this.selectedFiles).forEach(key => {
            if (this.selectedFiles[key] instanceof File) {
                const file = this.selectedFiles[key];
                formData[key] = file;
            }
        });

        const operation = this.isEditMode ? service.update(this.selectedItemId, formData, true) : service.create(formData, true);

        await operation
            .then(() => {
                this.saving = false;
                this.modalService.dismissAll();
                this.loadData();
            })
            .catch((error: any) => {
                console.error('Error saving item:', error);
                this.saving = false;
                this.error = 'Ошибка при сохранении данных';
            });
    }

    deleteItem() {
        if (!this.selectedItemId) return;

        const service = this.currentModelConfig.service;

        if (this.cascadeDeleting) {
            service.deleteCascade(this.selectedItemId).subscribe(
                () => {
                    this.cascadeDeleting = false;
                    this.modalService.dismissAll();
                    this.loadData();
                },
                (error: any) => {
                    console.error('Error deleting item:', error);
                    this.cascadeDeleting = false;
                },
            );
            return;
        }

        this.deleting = true;

        service.delete(this.selectedItemId).subscribe(
            () => {
                this.deleting = false;
                this.modalService.dismissAll();
                this.loadData();
            },
            (error: any) => {
                console.error('Error deleting item:', error);
                this.deleting = false;
            },
        );
    }

    onMultiselectChange(fieldKey: string, optionId: string, event: any) {
        const currentValue = this.itemForm.get(fieldKey)?.value || [];
        let newValue: string[];

        if (event.target.checked) {
            newValue = [...currentValue, optionId];
        } else {
            newValue = currentValue.filter((id: string) => id !== optionId);
        }

        this.itemForm.get(fieldKey)?.setValue(newValue);
    }

    getSelectedOptionsText(fieldKey: string, options: any[]): string {
        const selectedIds = this.itemForm.get(fieldKey)?.value || [];
        if (selectedIds.length === 0) {
            return `Выберите ${fieldKey.toLowerCase()}...`;
        }

        if (selectedIds.length === 1) {
            const selectedOption = options?.find(opt => opt.id === selectedIds[0]);
            return selectedOption?.title || selectedOption?.name || 'Выбран 1 элемент';
        }

        return `Выбрано: ${selectedIds.length}`;
    }

    // Product search methods
    onProductSearchChange(fieldKey: string, searchText: string): void {
        this.productSearchText[fieldKey] = searchText;

        if (!searchText.trim()) {
            this.filteredProducts[fieldKey] = this.allProducts.slice(0, 20);
            return;
        }

        const searchLower = searchText.toLowerCase().trim();
        this.filteredProducts[fieldKey] = this.allProducts
            .filter(product => product.title.toLowerCase().includes(searchLower) || product.fullTitle?.toLowerCase().includes(searchLower))
            .slice(0, 20);
    }

    toggleProductDropdown(fieldKey: string, show: boolean): void {
        this.showProductDropdown[fieldKey] = show;
        if (show && !this.filteredProducts[fieldKey]) {
            this.filteredProducts[fieldKey] = this.allProducts.slice(0, 20);
        }
    }

    selectProduct(fieldKey: string, product: any): void {
        if (!this.selectedProducts[fieldKey]) {
            this.selectedProducts[fieldKey] = [];
        }

        const exists = this.selectedProducts[fieldKey].find(p => p.id === product.id);
        if (!exists) {
            this.selectedProducts[fieldKey].push(product);
            this.updateProductFormValue(fieldKey);
        }

        this.productSearchText[fieldKey] = '';
        this.showProductDropdown[fieldKey] = false;
    }

    removeSelectedProduct(fieldKey: string, productId: string): void {
        if (this.selectedProducts[fieldKey]) {
            this.selectedProducts[fieldKey] = this.selectedProducts[fieldKey].filter(p => p.id !== productId);
            this.updateProductFormValue(fieldKey);
        }
    }

    updateProductFormValue(fieldKey: string): void {
        const productIds = this.selectedProducts[fieldKey]?.map(p => p.id) || [];
        this.itemForm.get(fieldKey)?.setValue(productIds.join(','));
    }

    initializeProductSearch(fieldKey: string, currentValue: string): void {
        if (!currentValue) {
            this.selectedProducts[fieldKey] = [];
            return;
        }

        const productIds = currentValue.split(',').filter(id => id.trim());
        this.selectedProducts[fieldKey] = this.allProducts.filter(p => productIds.includes(p.id));
    }
}
