import { Injectable } from '@angular/core';
import { DataService } from '../base/services/data.service';
import { CategoryModel } from '../models/category.model';
import { CreateCategorySchema, FilterCategorySchema, UpdateCategorySchema } from '../schemas/category.schema';

@Injectable({
    providedIn: 'root',
})
export class CategoryService extends DataService<CategoryModel, CreateCategorySchema, UpdateCategorySchema, FilterCategorySchema> {
    protected override endpoint = 'category';

    override transformModel(data: CategoryModel): CategoryModel {
        return {
            id: data.id,
            title: data.title,
            description: data.description,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
        } as unknown as CategoryModel;
    }
}
