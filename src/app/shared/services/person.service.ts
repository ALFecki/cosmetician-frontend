import { Injectable } from "@angular/core";
import { DataService } from "../base/services/data.service";
import { PersonModel } from "../models/person.model";
import { CreatePersonSchema, FilterPersonSchema, UpdatePersonSchema } from "../schemas/person.schema";

@Injectable({
    providedIn: "root",
})
export class PersonSevice extends DataService<PersonModel, CreatePersonSchema, UpdatePersonSchema, FilterPersonSchema> {
    protected override endpoint = "person";

    override transformModel(data: PersonModel): PersonModel {
        return {
            id: data.id,
            firstName: data.firstName,
            secondName: data.secondName,
            surname: data.surname,
            email: data.email,
            phone: data.phone,
            password: data.password,
            is_admin: data.is_admin,
            is_moderator: data.is_moderator,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
        } as unknown as PersonModel;
    }

}