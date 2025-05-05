import { Injectable } from '@angular/core';
import { DataService } from '../base/services/data.service';
import { BrandModel } from '../models/brand.model';
import { CreateBrandSchema, FilterBrandSchema, UpdateBrandSchema } from '../schemas/brand.schema';

@Injectable({
    providedIn: 'root',
})
export class BrandService extends DataService<BrandModel, CreateBrandSchema, UpdateBrandSchema, FilterBrandSchema> {
    protected override endpoint = 'brand';
}
