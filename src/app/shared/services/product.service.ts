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

    override async create(data: CreateProductSchema): Promise<SingleResponse<ProductModel>> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { variants, ...productData } = data;
        productData.isDeleted = false;

        if (productData.image && (productData.image as unknown) instanceof File) {
            productData.image = await this.uploadImage(productData.image as unknown as File);
        }

        return new Promise((resolve, reject) => {
            this.http.post<SingleResponse<ProductModel>>(`${this.apiUrl}/${this.endpoint}`, productData).subscribe({
                next: response => {
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { variants, ...productData } = data;

        if (productData.image && (productData.image as unknown) instanceof File) {
            productData.image = await this.uploadImage(productData.image as unknown as File);
        }

        return new Promise((resolve, reject) => {
            this.http.patch<SingleResponse<ProductModel>>(`${this.apiUrl}/${this.endpoint}/${id}`, productData).subscribe({
                next: response => {
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
