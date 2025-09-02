import { Injectable } from '@angular/core';
import { ProductVariantModel } from '../models/product.model';
import { CreateProductVariantSchema, FilterProductVariantSchema, UpdateProductVariantSchema } from '../schemas/product_variant.schema';
import { DataService } from '../base/services/data.service';

@Injectable({
    providedIn: 'root',
})
export class ProductVariantService extends DataService<ProductVariantModel, CreateProductVariantSchema, UpdateProductVariantSchema, FilterProductVariantSchema> {
    protected readonly endpoint = 'product_variant';
}
