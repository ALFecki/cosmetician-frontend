import { Observable } from "rxjs";
import { DataService } from "../base/services/data.service";
import { BrandModel } from "../models/brand.model";
import { Injectable } from "@angular/core";
import { CreateBrandSchema, FilterBrandSchema, UpdateBrandSchema } from "../schemas/brand.schema";
import { ListResponse, SingleResponse } from "../base/schemas/base_schema";



@Injectable({
    providedIn: 'root'
})
export class BrandService extends DataService<BrandModel, CreateBrandSchema, UpdateBrandSchema, FilterBrandSchema> {
    protected override endpoint: string = 'brand';
    
    override create(data: CreateBrandSchema): Observable<SingleResponse<BrandModel>> {
        throw new Error("Method not implemented.");
    }
    override update(data: Partial<Omit<BrandModel, "id" | "createdAt" | "updatedAt">>): Observable<SingleResponse<BrandModel>> {
        throw new Error("Method not implemented.");
    }

    override transformModel(data: any): BrandModel {
        return {
            id: data.id,
            alias: data.alias,
            title: data.title,
            description: data.description,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt)
        } as unknown as BrandModel;
    }
}