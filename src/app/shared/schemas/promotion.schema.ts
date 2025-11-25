import { FilterOptions } from '../base/schemas/base_schema';
import { PromotionModel } from '../models/promotion.model';

export type CreatePromotionSchema = Omit<PromotionModel, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePromotionSchema = Partial<Omit<PromotionModel, 'id' | 'createdAt' | 'updatedAt'>>;
export type FilterPromotionSchema = UpdatePromotionSchema & FilterOptions; // TODO: createdAt, updatedAt
