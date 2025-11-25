import { FilterOptions } from '../base/schemas/base_schema';
import { PromocodeModel } from '../models/promocode.model';

export type CreatePromocodeSchema = Omit<PromocodeModel, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePromocodeSchema = Partial<Omit<PromocodeModel, 'id' | 'createdAt' | 'updatedAt'>>;
export type FilterPromocodeSchema = UpdatePromocodeSchema & FilterOptions; // TODO: createdAt, updatedAt
