import { Injectable } from "@angular/core";
import { DataService } from "../base/services/data.service";
import { PromotionModel } from "../models/promotion.model";
import { CreatePromotionSchema, FilterPromotionSchema, UpdatePromotionSchema } from "../schemas/promotion.schema";
import { Observable } from "rxjs";
import { ListResponse } from "../base/schemas/base_schema";
import { PromocodeModel } from "../models/promocode.model";

@Injectable({
    providedIn: 'root',
})
export class PromotionService extends DataService<PromotionModel, CreatePromotionSchema, UpdatePromotionSchema, FilterPromotionSchema> {
    protected override endpoint = 'promotion';

    getProductPromotions(productId: string): Observable<ListResponse<PromotionModel>> {
        return this.http.get<ListResponse<PromotionModel>>(`${this.apiUrl}/product/${productId}/promotions`);
    }

    getProductPromoCodes(productId: string): Observable<ListResponse<PromocodeModel>> {
        return this.http.get<ListResponse<PromocodeModel>>(`${this.apiUrl}/product/${productId}/promo-codes`);
    }
}