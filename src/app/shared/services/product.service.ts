import { Inject, Injectable } from '@angular/core';
import { DataService } from '../base/services/data.service';
import { ProductModel } from '../models/product.model';
import { CreateProductSchema, FilterProductSchema, UpdateProductSchema } from '../schemas/product.schema';
import { Observable } from 'rxjs';
import { SingleResponse } from '../base/schemas/base_schema';
import { BrandService } from './brand.service';
import { CategoryService } from './category.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ProductService extends DataService<ProductModel, CreateProductSchema, UpdateProductSchema, FilterProductSchema> {
  protected override endpoint: string = 'product';

  constructor(http: HttpClient, private brandService: BrandService,private categoryService: CategoryService) {
    super(http);
  }

  override create(data: CreateProductSchema): Observable<SingleResponse<ProductModel>> {
    throw new Error('Method not implemented.');
  }
  override update(data: Partial<Omit<ProductModel, 'product' | 'id' | 'brand' | 'createdAt' | 'updatedAt'>>): Observable<SingleResponse<ProductModel>> {
    throw new Error('Method not implemented.');
  }

  override transformModel(data: any): ProductModel {
    return {
      id: data.id,
      alias: data.alias,
      title: data.title,
      description: data.description,
      price: data.price,
      brand: this.brandService.transformModel(data.brand),
      category: this.categoryService.transformModel(data.category),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    } as unknown as ProductModel;
  }
  
}
