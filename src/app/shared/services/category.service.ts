import { Observable } from "rxjs";
import { DataService } from "../base/services/data.service";
import { CategoryModel } from "../models/category.model";
import { Injectable } from "@angular/core";
import { CreateCategorySchema, FilterCategorySchema, UpdateCategorySchema } from "../schemas/category.schema";
import { SingleResponse } from "../base/schemas/base_schema";

@Injectable({
    providedIn: 'root'
})
export class CategoryService extends DataService<CategoryModel, CreateCategorySchema, UpdateCategorySchema, FilterCategorySchema> {
    protected override endpoint: string = 'category';

    override create(data: CreateCategorySchema): Observable<SingleResponse<CategoryModel>> {
        throw new Error("Method not implemented.");
    }
    override update(data: Partial<Omit<CategoryModel, "id" | "createdAt" | "updatedAt">>): Observable<SingleResponse<CategoryModel>> {
        throw new Error("Method not implemented.");
    }

}