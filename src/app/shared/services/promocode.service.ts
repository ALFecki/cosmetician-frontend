import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '../base/services/data.service';
import { PromocodeModel } from '../models/promocode.model';
import { CreatePromocodeSchema, FilterPromocodeSchema, UpdatePromocodeSchema } from '../schemas/promocode.schema';

@Injectable({
    providedIn: 'root',
})
export class PromocodeService extends DataService<PromocodeModel, CreatePromocodeSchema, UpdatePromocodeSchema, FilterPromocodeSchema> {
    protected override endpoint = 'promo-code';

    validatePromocode(code: string): Observable<PromocodeModel> {
        return this.http.get<PromocodeModel>(`${this.apiUrl}/${this.endpoint}/validate/${code}`);
    }
}
