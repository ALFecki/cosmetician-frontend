import { FilterOptions } from '../base/schemas/base_schema';
import { ProductModel, ProductScopeModel, ProductTypeModel } from '../models/product.model';

export type CreateProductSchema = Omit<ProductModel, 'id' | 'brand' | 'product' | 'createdAt' | 'updatedAt'>;
export type UpdateProductSchema = Partial<Omit<ProductModel, 'id' | 'brand' | 'product' | 'createdAt' | 'updatedAt'>>;
// export type FilterProductSchema = UpdateProductSchema & FilterOptions; // TODO: createdAt, updatedAt

export interface FilterProductSchema extends FilterOptions {
    title?: string;
    brandId?: string[];
    categoryId?: string[];
    countryId?: string[];
    minPrice?: number;
    maxPrice?: number;
    minVolume?: number;
    maxVolume?: number;
    isDeleted?: boolean;
}


export type CreateProductScopeSchema = Omit<ProductScopeModel, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProductScopeSchema = Partial<Omit<ProductScopeModel, 'id' | 'createdAt' | 'updatedAt'>>;

export interface FilterProductScopeSchema extends FilterOptions {
    title?: string;
    description?: string;
    isDeleted?: boolean;
}

export type CreateProductTypeSchema = Omit<ProductTypeModel, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProductTypeSchema = Partial<Omit<ProductTypeModel, 'id' | 'createdAt' | 'updatedAt'>>;

export interface FilterProductTypeSchema extends FilterOptions {
    title?: string;
    description?: string;
    isDeleted?: boolean;
}