import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SingleResponse } from '../base/schemas/base_schema';
import { DataService } from '../base/services/data.service';
import { CategoryModel } from '../models/category.model';
import { CreateCategorySchema, FilterCategorySchema, UpdateCategorySchema } from '../schemas/category.schema';

@Injectable({
    providedIn: 'root',
})
export class CategoryService extends DataService<CategoryModel, CreateCategorySchema, UpdateCategorySchema, FilterCategorySchema> {
    protected override endpoint = 'category';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    override create(data: CreateCategorySchema): Observable<SingleResponse<CategoryModel>> {
        throw new Error('Method not implemented.');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    override update(data: Partial<Omit<CategoryModel, 'id' | 'createdAt' | 'updatedAt'>>): Observable<SingleResponse<CategoryModel>> {
        throw new Error('Method not implemented.');
    }

    override transformModel(data: CategoryModel): CategoryModel {
        return {
            id: data.id,
            alias: data.alias,
            title: data.title,
            description: data.description,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
        } as unknown as CategoryModel;
    }
}
