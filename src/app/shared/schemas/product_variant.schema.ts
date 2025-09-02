import { FilterOptions } from '../base/schemas/base_schema';
import { ProductVariantModel } from '../models/product_variant.model';

export type CreateProductVariantSchema = Omit<ProductVariantModel, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProductVariantSchema = Partial<Omit<ProductVariantModel, 'id' | 'createdAt' | 'updatedAt'>>;
// export type FilterProductVariantSchema = UpdateProductVariantSchema & FilterOptions; // TODO: createdAt, updatedAt

export interface FilterProductVariantSchema extends FilterOptions {
    isDeleted?: boolean;
}
