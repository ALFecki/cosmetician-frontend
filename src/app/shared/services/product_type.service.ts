import { Injectable } from '@angular/core';
import { DataService } from '../base/services/data.service';
import { ProductTypeModel } from '../models/product.model';
import { CreateProductTypeSchema, FilterProductTypeSchema, UpdateProductTypeSchema } from '../schemas/product.schema';

@Injectable({
    providedIn: 'root',
})
export class ProductTypeSevice extends DataService<
    ProductTypeModel,
    CreateProductTypeSchema,
    UpdateProductTypeSchema,
    FilterProductTypeSchema
> {
    protected override endpoint = 'product_type';
}
