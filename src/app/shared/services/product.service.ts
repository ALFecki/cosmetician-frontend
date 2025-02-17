import { Injectable } from '@angular/core';
import { DataService } from '../base/services/data.service';
import { ProductModel } from '../models/product.model';
import { CreateProductSchema, FilterProductSchema, UpdateProductSchema } from '../schemas/product.schema';
import { Observable } from 'rxjs';
import { SingleResponse } from '../base/schemas/base_schema';

@Injectable({
  providedIn: 'root'
})
export class ProductService extends DataService<ProductModel, CreateProductSchema, UpdateProductSchema, FilterProductSchema> {
  protected override endpoint: string = 'product';

  override create(data: CreateProductSchema): Observable<SingleResponse<ProductModel>> {
    throw new Error('Method not implemented.');
  }
  override update(data: Partial<Omit<ProductModel, 'product' | 'id' | 'brand' | 'createdAt' | 'updatedAt'>>): Observable<SingleResponse<ProductModel>> {
    throw new Error('Method not implemented.');
  }
  
}
