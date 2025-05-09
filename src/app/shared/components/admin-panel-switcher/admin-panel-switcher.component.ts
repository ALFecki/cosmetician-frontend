/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, catchError, forkJoin, of, tap } from 'rxjs';
import { BrandService } from '../../services/brand.service';
import { CategoryService } from '../../services/category.service';
import { PersonSevice } from '../../services/person.service';
import { ProductService } from '../../services/product.service';
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { FilterBrandSchema } from '../../schemas/brand.schema';
import { FilterCategorySchema } from '../../schemas/category.schema';

interface ModelConfig {
    key: string;
    title: string;
    service: any;
    fields: {
        key: string;
        label: string;
        type: 'text' | 'number' | 'textarea' | 'select' | 'file' | 'image' | 'email' | 'boolean';
        required?: boolean;
        options?: any[];
    }[];
    columns: {
        key: string;
        title: string;
        type?: 'text' | 'number' | 'image' | 'date' | 'boolean';
    }[];
}

@Component({
    selector: 'app-admin-panel-switcher',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, GenericTableComponent],
    templateUrl: './admin-panel-switcher.component.html',
    styleUrl: './admin-panel-switcher.component.scss',
})
export class AdminPanelSwitcherComponent implements OnInit {
    @ViewChild('itemModal') itemModal!: TemplateRef<any>;
    @ViewChild('deleteModal') deleteModal!: TemplateRef<any>;

    availableModels: { key: string; title: string }[] = [];
    currentModel = 'products';
    currentModelData: any[] = [];
    filteredData: any[] = [];

    itemForm!: FormGroup;
    isEditMode = false;
    selectedItemId: string | null = null;
    saving = false;
    deleting = false;
    cascadeDeleting = false;
    restoring = false;

    loading = false;
    error: string | null = null;
    searchText = '';

    private modelConfigs: Record<string, ModelConfig> = {};

    filePreviewUrls: Record<string, string> = {};
    selectedFiles: Record<string, File> = {};

    constructor(
        private fb: FormBuilder,
        private modalService: NgbModal,
        private productService: ProductService,
        private categoryService: CategoryService,
        private brandService: BrandService,
        private personService: PersonSevice,
    ) {}

    ngOnInit(): void {
        this.setupModelConfigs();
        this.availableModels = Object.keys(this.modelConfigs).map(key => ({
            key,
            title: this.modelConfigs[key].title,
        }));

        this.loadData();
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
                { key: 'price', label: 'Цена', type: 'number', required: true },
                { key: 'volume', label: 'Объем', required: true, type: 'number' },
                { key: 'categoryId', label: 'Категория', type: 'select', required: true },
                { key: 'brandId', label: 'Бренд', type: 'select', required: true },
                // { key: 'amount', label: 'Количество', type: 'number', required: true },
                { key: 'composition', label: 'Состав', type: 'textarea', required: false },
                { key: 'productScope', label: 'Область применения', type: 'textarea', required: false },
                { key: 'productType', label: 'Тип продукта', type: 'textarea', required: false },
                { key: 'country', label: 'Страна производитель', type: 'text', required: false },
                { key: 'methodOfUse', label: 'Способ применения', type: 'textarea', required: false },
            ],
            columns: [
                { key: 'id', title: 'ID' },
                { key: 'image', title: 'Изображение', type: 'image' },
                { key: 'title', title: 'Название' },
                { key: 'fullTitle', title: 'Полное название' },
                { key: 'description', title: 'Описание' },
                { key: 'volume', title: 'Объем' },
                { key: 'price', title: 'Цена', type: 'number' },
                { key: 'category.title', title: 'Категория' },
                { key: 'brand.title', title: 'Бренд' },
                // { key: 'amount', title: 'Количество', type: 'number' },
                { key: 'characteristics', title: 'Характеристики' },
                { key: 'composition', title: 'Состав' },
                { key: 'productScope', title: 'Область применения' },
                { key: 'productType', title: 'Тип продукта' },
                { key: 'country', title: 'Страна производитель' },
                { key: 'methodOfUse', title: 'Способ применения' },
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

        // this.modelConfigs['countries'] = {
        //     key: 'countries',
        //     title: 'Страны',
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
            this.loadData();
        }
    }

    loadData() {
        this.loading = true;
        this.error = null;
        // const service = this.currentModelConfig.service;

        // Get additional data for select fields
        const observables: Record<string, Observable<any>> = {};

        if (this.currentModel === 'products') {
            observables['categories'] = this.categoryService.getAll({ includeDeleted: true } as FilterCategorySchema);
            observables['brands'] = this.brandService.getAll({ includeDeleted: true } as FilterBrandSchema);
        }

        if (Object.keys(observables).length > 0) {
            forkJoin(observables)
                .pipe(
                    tap(results => {
                        this.currentModelConfig.fields.forEach(field => {
                            if (field.type === 'select') {
                                if (field.key === 'categoryId' && results['categories']) {
                                    field.options = results['categories'].data;
                                } else if (field.key === 'brandId' && results['brands']) {
                                    field.options = results['brands'].data;
                                }
                            }
                        });
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
        if (!this.searchText.trim()) {
            this.filteredData = [...this.currentModelData];
            return;
        }

        const searchLower = this.searchText.toLowerCase().trim();

        this.filteredData = this.currentModelData.filter(item => {
            return this.currentModelColumns.some(column => {
                const keys = column.key.split('.');
                let value = item;

                for (const key of keys) {
                    if (value === undefined || value === null) return false;
                    value = value[key];
                }

                if (value === undefined || value === null) return false;

                return String(value).toLowerCase().includes(searchLower);
            });
        });
    }

    clearSearch() {
        this.searchText = '';
        this.filteredData = [...this.currentModelData];
    }

    buildForm(item?: any) {
        const formControls: any = {};

        this.currentModelFields.forEach(field => {
            const value = item ? (field.key.includes('.') ? this.getNestedProperty(item, field.key) : item[field.key]) : '';

            const validators = [];
            if (field.required) validators.push(Validators.required);
            if (field.type === 'email') validators.push(Validators.email);

            formControls[field.key] = [value, validators];
        });

        return this.fb.group(formControls);
    }

    getNestedProperty(obj: any, path: string): any {
        return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
    }

    openAddModal() {
        this.isEditMode = false;
        this.selectedItemId = null;
        this.itemForm = this.buildForm();
        this.resetFileUploads();
        this.modalService.open(this.itemModal, { size: 'lg' });
    }

    editItem(item: any) {
        this.isEditMode = true;
        this.selectedItemId = item.id;
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

        delete this.filePreviewUrls[fieldKey];
        delete this.selectedFiles[fieldKey];
    }

    async saveItem() {
        console.log(`Item Form Value:`, this.itemForm.value);
        if (this.itemForm.invalid) {
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
            console.log(`Key: ${key}, Value: ${value}`);
            if (value !== null && value !== undefined) {
                if (typeof value === 'object' && !Array.isArray(value)) {
                    formData[key] = JSON.stringify(value);
                } else {
                    formData[key] = value;
                }
                console.log('Form Data:', formData);
            }
        });

        Object.keys(this.selectedFiles).forEach(key => {
            if (this.selectedFiles[key] instanceof File) {
                const file = this.selectedFiles[key];
                console.log(`File Key: ${key}, File:`, file);
                formData[key] = file;
            }
        });

        console.log('Form Data:', formData);

        const operation = this.isEditMode ? service.update(this.selectedItemId, formData, true) : service.create(formData, true);
        console.log('Operation:', operation);

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
}
