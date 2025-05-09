import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, shareReplay, tap } from 'rxjs';
import { ListResponse } from '../base/schemas/base_schema';
import { DataService } from '../base/services/data.service';
import { BrandModel } from '../models/brand.model';
import { CreateBrandSchema, FilterBrandSchema, UpdateBrandSchema } from '../schemas/brand.schema';

@Injectable({
    providedIn: 'root',
})
export class BrandService extends DataService<BrandModel, CreateBrandSchema, UpdateBrandSchema, FilterBrandSchema> {
    protected override endpoint = 'brand';

    private brandsCache$: Observable<ListResponse<BrandModel>> | null = null;
    private brandListSubject = new BehaviorSubject<BrandModel[]>([]);

    // Override the getAll method to implement caching
    override getAll(filter: FilterBrandSchema | null = null): Observable<ListResponse<BrandModel>> {
        // If there's no cache or we have specific filters, make a new request
        if (!this.brandsCache$ || (filter && Object.keys(filter).length > 0)) {
            const request = super.getAll(filter).pipe(
                tap(response => {
                    // Update the brands list subject with the new data
                    if (response && response.data) {
                        this.brandListSubject.next(response.data);
                    }
                }),
                // Use shareReplay to cache the last result and share it among subscribers
                shareReplay(1),
            );

            // Only cache requests with no filters or just includeDeleted
            if (!filter || (Object.keys(filter).length === 1 && 'includeDeleted' in filter)) {
                this.brandsCache$ = request;
            }

            return request;
        }

        return this.brandsCache$;
    }

    // Get just the brands array as an observable
    getBrandsList(): Observable<BrandModel[]> {
        // If we have no data yet, trigger a fetch
        if (this.brandListSubject.value.length === 0 && !this.brandsCache$) {
            this.getAll().subscribe();
        }
        return this.brandListSubject.asObservable();
    }

    // Clear cache if data might have changed
    clearCache(): void {
        this.brandsCache$ = null;
    }
}
