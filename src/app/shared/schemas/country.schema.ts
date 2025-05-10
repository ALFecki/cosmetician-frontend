import { FilterOptions } from "../base/schemas/base_schema";
import { CountryModel } from "../models/country.model";

export type CreateCountrySchema = Omit<CountryModel, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCountrySchema = Partial<Omit<CountryModel, 'id' | 'createdAt' | 'updatedAt'>>;
export type FilterCountrySchema = UpdateCountrySchema & FilterOptions; // TODO: createdAt, updatedAt