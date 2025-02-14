import { Observable } from "rxjs";
import { DataService } from "../../services/data.service";
import { BrandModel } from "../models/brand.model";
import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class BrandService extends DataService {
    endpoint = 'brand';


    override create(data: BrandModel): Observable<BrandModel> {
        throw new Error("Method not implemented.");
    }

    override update(data: BrandModel): Observable<BrandModel> {
        throw new Error("Method not implemented.");
    }

    override delete(id: number): Observable<BrandModel> {
        throw new Error("Method not implemented.");
    }

}