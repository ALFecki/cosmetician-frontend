import { Injectable } from '@angular/core';
import { DataService } from '../base/services/data.service';
import { PersonModel } from '../models/person.model';
import { CreatePersonSchema, FilterPersonSchema, UpdatePersonSchema } from '../schemas/person.schema';

@Injectable({
    providedIn: 'root',
})
export class PersonSevice extends DataService<PersonModel, CreatePersonSchema, UpdatePersonSchema, FilterPersonSchema> {
    protected override endpoint = 'person';
}
