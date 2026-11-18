import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ListResponse, SingleResponse } from '../base/schemas/base_schema';
import { DiscountType, TargetType } from '../models/promotion.model';

export interface AdminPromotionInput {
    title: string;
    discountType: DiscountType;
    discountValue: number;
    targetType: TargetType;
    productIds: string[] | null;
    validFrom: string | null;
    validUntil: string | null;
    isDraft: boolean;
    isActive: boolean;
}

export interface AdminPromotion extends AdminPromotionInput {
    id: string;
    priority: number;
}

export interface PromotionProduct {
    id: string;
    title: string;
    fullTitle: string;
    brandTitle: string;
    priceCents: number | null;
}

@Injectable({ providedIn: 'root' })
export class AdminPromotionService {
    private readonly http = inject(HttpClient);
    private readonly url = environment.server_url + '/admin/promotion';

    list() {
        return this.http.get<ListResponse<AdminPromotion>>(this.url).pipe(map(response => response.data));
    }

    save(input: AdminPromotionInput, id?: string) {
        const request = id
            ? this.http.put<SingleResponse<AdminPromotion>>(this.url + '/' + encodeURIComponent(id), input)
            : this.http.post<SingleResponse<AdminPromotion>>(this.url, input);
        return request.pipe(map(response => response.data));
    }

    products(params: { q?: string; ids?: string } = {}) {
        return this.http.get<ListResponse<PromotionProduct>>(this.url + '/products', { params }).pipe(map(response => response.data));
    }
}
