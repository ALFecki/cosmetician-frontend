import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '../base/services/data.service';
import { ListResponse } from '../base/schemas/base_schema';
import { BannerInput, BannerModel } from '../models/banner.model';

@Injectable({ providedIn: 'root' })
export class BannerService extends DataService<BannerModel, BannerInput, Partial<BannerInput>, Record<string, never>> {
    protected override endpoint = 'admin/banner';

    getPublished(): Observable<ListResponse<BannerModel>> {
        return this.http.get<ListResponse<BannerModel>>(`${this.apiUrl}/banner`, { params: { home: 'true' }, transferCache: false });
    }
}
