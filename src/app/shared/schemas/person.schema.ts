import { FilterOptions } from '../base/schemas/base_schema';
import { PersonModel } from '../models/person.model';

export type CreatePersonSchema = Omit<PersonModel, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePersonSchema = Partial<Omit<PersonModel, 'id' | 'createdAt' | 'updatedAt'>>;
export type FilterPersonSchema = UpdatePersonSchema & FilterOptions; // TODO: createdAt, updatedAt
