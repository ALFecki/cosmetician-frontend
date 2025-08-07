import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SingleResponse } from '../base/schemas/base_schema';
import { DataService } from '../base/services/data.service';
import { ProductModel } from '../models/product.model';
import { CreateProductSchema, FilterProductSchema, UpdateProductSchema } from '../schemas/product.schema';
import { BrandService } from './brand.service';
import { CategoryService } from './category.service';

@Injectable({
    providedIn: 'root',
})
export class ProductService extends DataService<ProductModel, CreateProductSchema, UpdateProductSchema, FilterProductSchema> {
    protected override endpoint = 'product';
    protected override apiUrl = environment.server_url;

    constructor(
        http: HttpClient,
        private brandService: BrandService,
        private categoryService: CategoryService,
    ) {
        super(http);
    }

    private setProductIdToVariants(
        product: ProductModel,
        variants: { costPrice: number; price: number; volume: number }[],
    ): { costPrice: number; price: number; volume: number; productId: string }[] {
        const newVariants = [];
        if (!variants || variants.length === 0) {
            return [];
        }
        for (const variant of variants) {
            newVariants.push({ costPrice: variant.costPrice, price: variant.price, volume: variant.volume, productId: product.id });
        }
        return newVariants;
    }

    override async create(data: CreateProductSchema): Promise<SingleResponse<ProductModel>> {
        const variants: { costPrice: number; price: number; volume: number }[] =
            typeof data['variants'] === 'string' ? JSON.parse(data['variants']) : data['variants'] || [];
        data.isDeleted = variants.length === 0;
        if (data.image && (data.image as unknown) instanceof File) {
            data.image = await this.uploadImage(data.image as unknown as File);
        }
        return new Promise((resolve, reject) => {
            this.http.post<SingleResponse<ProductModel>>(`${this.apiUrl}/${this.endpoint}`, data).subscribe({
                next: response => {
                    const newVariants = this.setProductIdToVariants(response.data, variants);
                    for (const variant of newVariants) {
                        this.http.post<SingleResponse<ProductModel>>(`${this.apiUrl}/product_variant`, variant).subscribe();
                    }
                    this.getById(response.data.id).subscribe({
                        next: resolve,
                        error: reject,
                    });
                },
                error: error => {
                    console.error('Error creating product:', error);
                    reject(error);
                },
            });
        });
    }

    override async update(id: string, data: UpdateProductSchema): Promise<SingleResponse<ProductModel>> {
        const variants: { costPrice: number; price: number; volume: number }[] =
            typeof data['variants'] === 'string' ? JSON.parse(data['variants']) : data['variants'] || [];
        data.isDeleted = variants.length === 0;
        if (data.image && (data.image as unknown) instanceof File) {
            data.image = await this.uploadImage(data.image as unknown as File);
        }
        return new Promise((resolve, reject) => {
            this.http.patch<SingleResponse<ProductModel>>(`${this.apiUrl}/${this.endpoint}/${id}`, data).subscribe({
                next: response => {
                    const newVariants = this.setProductIdToVariants(response.data, variants);
                    for (const variant of newVariants) {
                        this.http
                            .patch<SingleResponse<ProductModel>>(`${this.apiUrl}/product_variant/${variant.productId}`, variant)
                            .subscribe();
                    }
                    this.getById(response.data.id).subscribe({
                        next: resolve,
                        error: reject,
                    });
                },
                error: error => {
                    console.error('Error updating product:', error);
                    reject(error);
                },
            });
        });
    }
}
