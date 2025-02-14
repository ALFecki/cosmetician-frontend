import { Observable } from "rxjs";
import { DataService } from "../../services/data.service";
import { CategoryModel } from "../models/category.model";
import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class CategoryService extends DataService {
    endpoint = 'category';


    override create(data: CategoryModel): Observable<CategoryModel> {
        throw new Error("Method not implemented.");
    }

    override update(data: CategoryModel): Observable<CategoryModel> {
        throw new Error("Method not implemented.");
    }

    override delete(id: number): Observable<CategoryModel> {
        throw new Error("Method not implemented.");
    }

}