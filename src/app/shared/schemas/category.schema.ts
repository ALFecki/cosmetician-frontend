import { FilterOptions } from '../base/schemas/base_schema';
import { CategoryModel } from '../models/category.model';

export type CreateCategorySchema = Omit<CategoryModel, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCategorySchema = Partial<Omit<CategoryModel, 'id' | 'createdAt' | 'updatedAt'>>;
export type FilterCategorySchema = UpdateCategorySchema & FilterOptions; // TODO: createdAt, updatedAt
