import { CommonModule } from '@angular/common';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Component, HostListener, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, catchError, forkJoin, of, tap } from 'rxjs';
import { IconsModule } from '../../base/icons/icons.module';
import { ProductVariantModel } from '../../models/product.model';
import { FilterBrandSchema } from '../../schemas/brand.schema';
import { FilterCategorySchema } from '../../schemas/category.schema';
import { FilterCountrySchema } from '../../schemas/country.schema';
import { FilterProductScopeSchema, FilterProductTypeSchema } from '../../schemas/product.schema';
import { CreateProductVariantSchema } from '../../schemas/product_variant.schema';
import { BannerService } from '../../services/banner.service';
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
import { AdminPromotionsComponent } from '../admin-promotions/admin-promotions.component';
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { StatisticsComponent } from '../statistics/statistics.component';

type PricedVariant = Pick<ProductVariantModel, 'price' | 'promotionPrice' | 'isDeleted'>;
interface PricedProduct {
    variants?: PricedVariant[];
    isPriceHidden?: boolean;
}

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
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        StatisticsComponent,
        AdminOrdersComponent,
        AdminPromotionsComponent,
        GenericTableComponent,
        IconsModule,
        ImageUrlPipe,
    ],
})
export class AdminPanelSwitcherComponent implements OnInit {
    @ViewChild('itemModal') itemModal!: TemplateRef<any>;
    @ViewChild('deleteModal') deleteModal!: TemplateRef<any>;
    @ViewChild('variantModal') variantModal!: TemplateRef<any>;
    @ViewChild(AdminPromotionsComponent) private adminPromotions?: AdminPromotionsComponent;

    availableModels = [
        { key: 'orders', title: 'Заказы' },
        { key: 'product', title: 'Товары' },
        { key: 'category', title: 'Категории' },
        { key: 'brand', title: 'Бренды' },
        { key: 'person', title: 'Клиенты' },
        { key: 'statistics', title: 'Статистика' },
    ];
    readonly navigation = [
        {
            title: 'Магазин',
            items: [
                { key: 'orders', title: 'Заказы', icon: 'bag-check' },
                { key: 'products', title: 'Товары', icon: 'box-seam' },
                { key: 'users', title: 'Клиенты', icon: 'person' },
            ],
        },
        {
            title: 'Продвижение',
            items: [
                { key: 'promotions', title: 'Акции и промокоды', icon: 'tag' },
                { key: 'banners', title: 'Баннеры', icon: 'grid' },
            ],
        },
        {
            title: 'Управление',
            items: [
                { key: 'statistics', title: 'Статистика', icon: 'list-check' },
                { key: 'categories', title: 'Справочники', icon: 'book' },
                { key: 'settings', title: 'Настройки', icon: 'gear' },
            ],
        },
    ];
    readonly referenceModels = ['categories', 'brands', 'productTypes', 'productScopes', 'countries'];
    readonly editorTabs = [
        { key: 'main', title: 'Основное' },
        { key: 'prices', title: 'Цены и объёмы' },
        { key: 'description', title: 'Описание и состав' },
    ];
    editorOpen = false;
    editorTab = 'main';
    productStatus = 'all';
    brandFilter = '';
    categoryFilter = '';
    sortOrder = 'title';
    page = 1;
    readonly pageSize = 20;
    compact = false;
    currentModel = 'products';
    private readonly route = inject(ActivatedRoute, { optional: true });
    legacyPromotions = false;
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
    deletingVariant = false;
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
        private bannerService: BannerService,
    ) {}

    ngOnInit(): void {
        if (this.route?.snapshot.queryParamMap.get('section') === 'orders') {
            this.currentModel = 'orders';
        }
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
        this.modelConfigs['banners'] = {
            key: 'banners',
            title: 'Баннеры',
            service: this.bannerService,
            fields: [
                { key: 'image', label: 'Изображение', type: 'image', required: true },
                { key: 'title', label: 'Заголовок', type: 'text' },
                { key: 'subtitle', label: 'Подпись', type: 'textarea' },
                { key: 'buttonText', label: 'Текст кнопки', type: 'text' },
                { key: 'buttonLink', label: 'Ссылка кнопки (путь /products или https://...)', type: 'text' },
                { key: 'sortOrder', label: 'Порядок (0–10000, меньшие числа раньше)', type: 'number', required: true },
                { key: 'isActive', label: 'Показывать на главной', type: 'boolean' },
            ],
            columns: [
                { key: 'image', title: 'Изображение', type: 'image' },
                { key: 'title', title: 'Заголовок' },
                { key: 'sortOrder', title: 'Порядок', type: 'number' },
                { key: 'isActive', title: 'На главной', type: 'boolean' },
            ],
        };

        this.modelConfigs['products'] = {
            key: 'products',
            title: 'Товары',
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
                { key: 'productTypeId', label: 'Тип продукта', type: 'select', required: true },
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
            title: 'Клиенты',
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
        return this.currentModelConfig?.fields || [];
    }

    get currentModelColumns() {
        const visible: Record<string, string[]> = {
            productTypes: ['title', 'description', 'isDeleted'],
            productScopes: ['title', 'description', 'isDeleted'],
            categories: ['image', 'title', 'description', 'isDeleted'],
            brands: ['image', 'title', 'manufacturer', 'isDeleted'],
            users: ['email', 'firstName', 'secondName', 'isAdmin', 'isModerator'],
            countries: ['name', 'code', 'isDeleted'],
            promotions: ['title', 'discountType', 'discountValue', 'validUntil', 'isActive'],
            promocodes: ['code', 'discountValue', 'usageCount', 'validUntil', 'isActive'],
        };
        return (this.currentModelConfig?.columns || []).filter(
            column => !visible[this.currentModel] || visible[this.currentModel].includes(column.key),
        );
    }

    modelTitle(key: string): string {
        return this.modelConfigs[key]?.title || key;
    }

    getCurrentModelTitle(): string {
        return this.currentModel === 'settings' ? 'Настройки' : this.currentModelConfig?.title || '';
    }

    isNavigationActive(key: string): boolean {
        return (
            key === this.currentModel ||
            (key === 'categories' && this.referenceModels.includes(this.currentModel)) ||
            (key === 'promotions' && this.currentModel === 'promocodes')
        );
    }

    get hasList(): boolean {
        return (
            !['statistics', 'orders', 'settings'].includes(this.currentModel) &&
            (this.currentModel !== 'promotions' || this.legacyPromotions)
        );
    }

    get pageCount(): number {
        return Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
    }
    get pagedProducts(): any[] {
        return this.filteredData.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
    }
    get editorFields() {
        if (this.currentModel !== 'products') return this.currentModelFields;
        const descriptions = ['description', 'composition', 'methodOfUse'];
        const prices = ['variants', 'isPriceHidden'];
        return this.currentModelFields.filter(field =>
            this.editorTab === 'description'
                ? descriptions.includes(field.key)
                : this.editorTab === 'prices'
                  ? prices.includes(field.key)
                  : !descriptions.includes(field.key) && !prices.includes(field.key),
        );
    }

    getOptions(key: string): any[] {
        return this.modelConfigs['products'].fields.find(field => field.key === key)?.options || [];
    }
    activeVariants<Variant extends { isDeleted?: boolean }>(product: { variants?: Variant[] }): Variant[] {
        return (product.variants || []).filter(variant => !variant.isDeleted);
    }
    productPrice(product: PricedProduct, hidden = product.isPriceHidden): string {
        if (hidden) return 'Скрыта';
        return this.formatPriceRange(this.activeVariants(product).map(variant => Number(variant.price)));
    }
    private formatPriceRange(prices: number[]): string {
        if (!prices.length) return 'Нет вариантов';
        return (
            (new Set(prices).size > 1 ? 'от ' : '') +
            Math.min(...prices).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        );
    }
    private effectivePrice(variant: PricedVariant): number {
        return variant.promotionPrice ? variant.promotionPrice.finalCents / 100 : Number(variant.price);
    }

    catalogPrice(product: PricedProduct) {
        if (product.isPriceHidden) return { current: 'Скрыта', original: '', discount: '' };
        const variants = this.activeVariants(product);
        const prices = variants.map(variant => this.effectivePrice(variant));
        const current = this.formatPriceRange(prices);
        const offer = variants[prices.indexOf(Math.min(...prices))]?.promotionPrice;
        if (!offer?.savingCents) return { current, original: '', discount: '' };
        const saving = offer.savingCents;
        const base = offer.finalCents + saving;
        const discount = (100 * saving) / base;
        return {
            current,
            original: this.formatPriceRange([base / 100]),
            discount: discount < 0.01 ? '−<0,01%' : '−' + discount.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + '%',
        };
    }

    productVolumes(product: { variants?: Pick<ProductVariantModel, 'volume' | 'isDeleted'>[] }): string {
        const volumes = this.activeVariants(product).map(variant => variant.volume);
        return volumes.length ? volumes.join(' · ') + ' мл' : '—';
    }

    get hasUnsavedChanges(): boolean {
        return !!this.itemForm?.dirty || Object.keys(this.selectedFiles).length > 0;
    }

    canLeave(): boolean {
        if (this.currentModel === 'promotions' && this.adminPromotions && !this.adminPromotions.canLeave()) return false;
        if (this.saving || this.savingVariant || this.deleting || this.restoring || this.deletingVariant) return false;
        return !this.editorOpen || !this.hasUnsavedChanges || window.confirm('Есть несохранённые изменения. Выйти без сохранения?');
    }

    @HostListener('window:beforeunload', ['$event'])
    beforeUnload(event: BeforeUnloadEvent): void {
        if (
            this.saving ||
            this.savingVariant ||
            this.deletingVariant ||
            (this.editorOpen && this.hasUnsavedChanges) ||
            this.adminPromotions?.hasPendingChanges
        ) {
            event.preventDefault();
            event.returnValue = '';
        }
    }

    closeEditor(): boolean {
        if (!this.canLeave()) return false;
        this.editorOpen = false;
        this.error = null;
        this.resetFileUploads();
        return true;
    }

    switchModel(modelKey: string) {
        if (this.currentModel === modelKey || !this.closeEditor()) return;
        this.currentModel = modelKey;
        this.legacyPromotions = false;
        this.searchText = '';
        this.brandFilter = '';
        this.categoryFilter = '';
        this.productStatus = 'all';
        this.page = 1;
        this.currentModelData = [];
        this.filteredData = [];
        if (this.hasList) this.loadData();
        else this.loading = false;
    }

    loadLegacyPromotions(): void {
        if (this.currentModel !== 'promotions') return;
        this.legacyPromotions = true;
        this.loadData();
    }

    loadData() {
        const model = this.currentModel;
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
                        if (this.currentModel !== model) return;
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
                    if (this.currentModel === model) this.loadMainData();
                });
        } else {
            this.loadMainData();
        }
    }

    loadMainData() {
        const model = this.currentModel;
        const service = this.currentModelConfig.service;

        service.getAll({ includeDeleted: true }).subscribe(
            (response: any) => {
                if (this.currentModel !== model) return;
                this.currentModelData = response.data;
                this.applyFilters();
                this.loading = false;
            },
            (error: any) => {
                if (this.currentModel !== model) return;
                console.error(`Error loading ${this.currentModel}:`, error);
                this.error = `Ошибка загрузки данных: ${error.message || 'Неизвестная ошибка'}`;
                this.loading = false;
            },
        );
    }

    onSearchChange() {
        this.page = 1;
        this.applyFilters();
    }

    applyFilters() {
        const query = this.searchText.trim().toLocaleLowerCase();
        this.filteredData = this.currentModelData.filter(item => {
            const text = [item.title, item.fullTitle, item.brand?.title, item.name, item.code, item.email, item.firstName, item.secondName]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase();
            if (query && !text.includes(query)) return false;
            if (this.currentModel !== 'products') return true;
            return (
                (this.productStatus === 'all' || (this.productStatus === 'archived' ? item.isDeleted : !item.isDeleted)) &&
                (!this.brandFilter || item.brandId === this.brandFilter) &&
                (!this.categoryFilter || item.categories?.some((category: any) => category.id === this.categoryFilter))
            );
        });
        if (this.currentModel === 'products') {
            this.filteredData.sort((left, right) => {
                if (this.sortOrder === 'price') {
                    const a = Math.min(...this.activeVariants<PricedVariant>(left).map(variant => this.effectivePrice(variant)));
                    const b = Math.min(...this.activeVariants<PricedVariant>(right).map(variant => this.effectivePrice(variant)));
                    if (a !== b) return a - b;
                }
                return left.title.localeCompare(right.title, 'ru');
            });
        }
        this.page = Math.min(this.page, this.pageCount);
    }

    clearSearch() {
        this.searchText = '';
        this.onSearchChange();
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
                    value = field.key.includes('.') ? this.getNestedProperty(item, field.key) : (item[field.key] ?? '');
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

            if (!item && field.type === 'boolean') value = false;

            if (!item && this.currentModel === 'banners') {
                if (field.key === 'sortOrder') value = 0;
                if (field.key === 'isActive') value = false;
            }

            if (field.key === 'variants') {
                formControls[field.key] = this.fb.array(
                    value.map((variant: any) =>
                        this.fb.group({
                            id: [variant.id || null],
                            volume: [variant.volume ?? '', Validators.required],
                            costPrice: [variant.costPrice ?? '', Validators.required],
                            price: [variant.price ?? '', Validators.required],
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
        this.error = null;
        this.isEditMode = false;
        this.selectedItemId = null;
        this.editingItem = null;
        this.itemForm = this.buildForm();
        this.resetFileUploads();
        this.editorTab = 'main';
        if (this.currentModel === 'products') {
            this.editorOpen = true;
            setTimeout(function () {
                document.querySelector('.admin-workspace')?.scrollIntoView({ block: 'start' });
            });
            this.currentProductId = this.editingItem?.id || null;
        } else {
            this.modalService.open(this.itemModal, {
                size: 'lg',
                windowClass: 'skviderm-admin-modal',
                backdrop: 'static',
                beforeDismiss: () => !this.saving,
            });
        }
    }

    editItem(item: any) {
        this.error = null;
        this.isEditMode = true;
        this.selectedItemId = item.id;
        this.editingItem = item;
        this.showDeletedVariants = false; // Reset checkbox when opening new item
        this.itemForm = this.buildForm(item);
        this.resetFileUploads();
        this.editorTab = 'main';
        if (this.currentModel === 'products') {
            this.editorOpen = true;
            setTimeout(function () {
                document.querySelector('.admin-workspace')?.scrollIntoView({ block: 'start' });
            });
            this.currentProductId = this.editingItem?.id || null;
        } else {
            this.modalService.open(this.itemModal, {
                size: 'lg',
                windowClass: 'skviderm-admin-modal',
                backdrop: 'static',
                beforeDismiss: () => !this.saving,
            });
        }
    }

    openDeleteModal(item: any) {
        this.cascadeDeleting = false;
        this.selectedItemId = item.id;
        this.modalService.open(this.deleteModal, {
            windowClass: 'skviderm-admin-modal',
            backdrop: 'static',
            beforeDismiss: () => !this.deleting,
        });
    }

    openCascadeDeleteModal(item: any) {
        this.selectedItemId = item.id;
        this.cascadeDeleting = true;
        this.modalService.open(this.deleteModal, {
            windowClass: 'skviderm-admin-modal',
            backdrop: 'static',
            beforeDismiss: () => !this.deleting,
        });
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
            if (this.currentModel === 'banners') this.itemForm.get(fieldKey)?.setValue(file);

            const reader = new FileReader();
            reader.onload = () => {
                if (this.selectedFiles[fieldKey] === file) {
                    this.filePreviewUrls[fieldKey] = reader.result as string;
                }
            };
            reader.readAsDataURL(file);
        }
    }

    cancelFileSelection(fieldKey: string) {
        delete this.selectedFiles[fieldKey];
        delete this.filePreviewUrls[fieldKey];
        if (this.currentModel === 'banners') {
            this.itemForm.get(fieldKey)?.setValue(this.editingItem?.[fieldKey] ?? '');
        }
        const fileInput = document.getElementById(fieldKey) as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
        return null;
    }

    async reloadProductVariants() {
        if (!this.currentProductId || this.currentModel !== 'products') return;

        try {
            const productId = this.currentProductId;
            const response = await this.productService.getById(productId).toPromise();
            if (this.currentModel !== 'products' || this.currentProductId !== productId || !this.editorOpen) return;
            if (response?.data) {
                this.editingItem = response.data;

                const filteredVariants = this.getFilteredVariants(response.data.variants || []);
                this.updateVariantsInForm(filteredVariants);
                const index = this.currentModelData.findIndex(item => item.id === this.currentProductId);
                if (index !== -1) {
                    this.currentModelData[index] = response.data;
                    this.applyFilters();
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
                    volume: [variant.volume ?? '', Validators.required],
                    costPrice: [variant.costPrice ?? '', Validators.required],
                    price: [variant.price ?? '', Validators.required],
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
        this.modalService.open(this.variantModal, {
            backdrop: 'static',
            windowClass: 'skviderm-admin-modal',
            beforeDismiss: () => !this.savingVariant,
        });
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
        if (this.currentModel !== 'products' || this.deletingVariant || this.saving || this.savingVariant) return;

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

        this.deletingVariant = true;
        try {
            const response = await this.productVariantService.delete(variantId).toPromise();
            if (response?.status) {
                this.toastService.show('Вариант удален', 'success');
                await this.reloadProductVariants();
            }
        } catch (error) {
            console.error('Error deleting variant:', error);
            this.toastService.show('Ошибка при удалении варианта', 'error');
        } finally {
            this.deletingVariant = false;
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
        if (this.itemForm.invalid || this.saving || this.savingVariant || this.deletingVariant || this.restoring) {
            Object.keys(this.itemForm.controls).forEach(key => {
                this.itemForm.get(key)?.markAsTouched();
            });
            return;
        }

        this.error = null;
        this.saving = true;
        const service = this.currentModelConfig.service;
        const formData: Record<string, any> = {};

        Object.keys(this.itemForm.value).forEach(key => {
            if (this.selectedFiles[key]) {
                return;
            }

            const value = this.itemForm.value[key];
            const field = this.currentModelFields.find(f => f.key === key);

            if (this.currentModel === 'banners') {
                formData[key] = field?.type === 'boolean' ? value === true : field?.type === 'number' ? Number(value) : (value ?? '');
                return;
            }

            if (this.currentModel === 'products' && ['fullTitle', 'composition', 'methodOfUse'].includes(key)) {
                formData[key] = value ?? '';
                return;
            }
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

        if (this.currentModel === 'products') {
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
            .then((response: any) => {
                this.saving = false;
                this.itemForm.markAsPristine();
                this.resetFileUploads();
                if (this.currentModel === 'products' && !this.isEditMode) {
                    this.editItem(response.data);
                    this.editorTab = 'prices';
                    this.toastService.show('Товар создан. Добавьте объёмы и цены.', 'success');
                } else {
                    this.editorOpen = false;
                    this.modalService.dismissAll();
                    this.toastService.show('Изменения сохранены', 'success');
                }
                this.loadData();
            })
            .catch((error: any) => {
                console.error('Error saving item:', error);
                this.saving = false;
                this.error =
                    this.currentModel === 'banners' && typeof error.error === 'string' ? error.error : 'Ошибка при сохранении данных';
            });
    }

    deleteItem() {
        if (!this.selectedItemId || this.deleting) return;
        this.deleting = true;
        const service = this.currentModelConfig.service;
        const operation = this.cascadeDeleting ? service.deleteCascade(this.selectedItemId) : service.delete(this.selectedItemId);
        operation.subscribe({
            next: () => {
                this.deleting = false;
                this.cascadeDeleting = false;
                this.editorOpen = false;
                this.modalService.dismissAll();
                this.loadData();
            },
            error: () => {
                this.deleting = false;
                this.toastService.show('Не удалось удалить. Данные сохранены, попробуйте ещё раз.', 'error');
            },
        });
    }

    async restoreProduct() {
        if (!this.editingItem || this.restoring) return;
        this.restoring = true;
        try {
            const product = this.editingItem;
            await this.productService.update(product.id, {
                isDeleted: false,
                categoryIds: JSON.stringify(product.categories.map((item: any) => item.id)),
                countryIds: JSON.stringify(product.countries.map((item: any) => item.id)),
                productScopeIds: JSON.stringify(product.productScopes.map((item: any) => item.id)),
            } as any);
            this.editingItem = { ...product, isDeleted: false };
            this.loadData();
            this.toastService.show('Товар возвращён в каталог', 'success');
        } catch {
            this.error = 'Не удалось восстановить товар. Попробуйте ещё раз.';
        } finally {
            this.restoring = false;
        }
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
        this.itemForm.markAsDirty();
    }

    getSelectedOptionsText(fieldKey: string, options: any[]): string {
        const selectedIds = this.itemForm.get(fieldKey)?.value || [];
        if (selectedIds.length === 0) {
            return 'Выберите…';
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
