import { Injectable } from '@angular/core';
import { DataService } from '../base/services/data.service';
import { CreateCountrySchema, FilterCountrySchema, UpdateCountrySchema } from '../schemas/country.schema';
import { CountryModel } from '../models/country.model';

@Injectable({
    providedIn: 'root',
})
export class CountryService extends DataService<CountryModel, CreateCountrySchema, UpdateCountrySchema, FilterCountrySchema> {
    protected override endpoint = 'country';
}
