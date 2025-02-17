import { FilterOptions } from "../base/schemas/base_schema"
import { BrandModel } from "../models/brand.model"

export type CreateBrandSchema = Omit<BrandModel, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateBrandSchema = Partial<Omit<BrandModel, 'id' | 'createdAt' | 'updatedAt'>>
export type FilterBrandSchema = UpdateBrandSchema & FilterOptions // TODO: createdAt, updatedAt