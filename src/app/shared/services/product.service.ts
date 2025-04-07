import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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

    constructor(
        http: HttpClient,
        private brandService: BrandService,
        private categoryService: CategoryService,
    ) {
        super(http);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    override create(data: CreateProductSchema): Observable<SingleResponse<ProductModel>> {
        throw new Error('Method not implemented.');
    }
    override update(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        data: Partial<Omit<ProductModel, 'product' | 'id' | 'brand' | 'createdAt' | 'updatedAt'>>,
    ): Observable<SingleResponse<ProductModel>> {
        throw new Error('Method not implemented.');
    }

    override transformModel(data: ProductModel): ProductModel {
        return {
            id: data.id,
            alias: data.alias,
            title: data.title,
            description: data.description,
            price: data.price,
            brand: this.brandService.transformModel(data.brand),
            category: this.categoryService.transformModel(data.category),
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
        } as unknown as ProductModel;
    }
}
