import { Injectable } from '@angular/core';
import { DataService } from '../base/services/data.service';
import { CategoryModel } from '../models/category.model';
import { CreateCategorySchema, FilterCategorySchema, UpdateCategorySchema } from '../schemas/category.schema';

@Injectable({
    providedIn: 'root',
})
export class CategoryService extends DataService<CategoryModel, CreateCategorySchema, UpdateCategorySchema, FilterCategorySchema> {
    protected override endpoint = 'category';
}
