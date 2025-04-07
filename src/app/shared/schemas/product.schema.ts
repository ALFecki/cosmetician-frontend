import { FilterOptions } from '../base/schemas/base_schema';
import { ProductModel } from '../models/product.model';

export type CreateProductSchema = Omit<ProductModel, 'id' | 'brand' | 'product' | 'createdAt' | 'updatedAt'>;
export type UpdateProductSchema = Partial<Omit<ProductModel, 'id' | 'brand' | 'product' | 'createdAt' | 'updatedAt'>>;
export type FilterProductSchema = UpdateProductSchema & FilterOptions; // TODO: createdAt, updatedAt
