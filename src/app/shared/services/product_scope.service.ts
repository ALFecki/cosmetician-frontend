import { Injectable } from '@angular/core';
import { DataService } from '../base/services/data.service';
import { ProductScopeModel } from '../models/product.model';
import { CreateProductScopeSchema, FilterProductScopeSchema, UpdateProductScopeSchema } from '../schemas/product.schema';

@Injectable({
    providedIn: 'root',
})
export class ProductScopeService extends DataService<
    ProductScopeModel,
    CreateProductScopeSchema,
    UpdateProductScopeSchema,
    FilterProductScopeSchema
> {
    protected override endpoint = 'product_scope';
}
