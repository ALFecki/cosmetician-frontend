import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environment';
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
        variants: { price: number; volume: number }[],
    ): { price: number; volume: number; productId: string }[] {
        const newVariants = [];
        if (!variants || variants.length === 0) {
            return [];
        }
        for (const variant of variants) {
            newVariants.push({ price: variant.price, volume: variant.volume, productId: product.id });
        }
        return newVariants;
    }

    override create(data: CreateProductSchema): Promise<SingleResponse<ProductModel>> {
        const variants: { price: number; volume: number }[] =
            typeof data['variants'] === 'string' ? JSON.parse(data['variants']) : data['variants'] || [];
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
}
