import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, shareReplay, tap } from 'rxjs';
import { ListResponse } from '../base/schemas/base_schema';
import { DataService } from '../base/services/data.service';
import { CategoryModel } from '../models/category.model';
import { CreateCategorySchema, FilterCategorySchema, UpdateCategorySchema } from '../schemas/category.schema';

@Injectable({
    providedIn: 'root',
})
export class CategoryService extends DataService<CategoryModel, CreateCategorySchema, UpdateCategorySchema, FilterCategorySchema> {
    protected override endpoint = 'category';

    private categoriesCache$: Observable<ListResponse<CategoryModel>> | null = null;
    private categoryListSubject = new BehaviorSubject<CategoryModel[]>([]);

    // Override the getAll method to implement caching
    override getAll(filter: FilterCategorySchema | null = null): Observable<ListResponse<CategoryModel>> {
        // If there's no cache or we have specific filters, make a new request
        if (!this.categoriesCache$ || (filter && Object.keys(filter).length > 0)) {
            const request = super.getAll(filter).pipe(
                tap(response => {
                    // Update the categories list subject with the new data
                    if (response && response.data) {
                        this.categoryListSubject.next(response.data);
                    }
                }),
                // Use shareReplay to cache the last result and share it among subscribers
                shareReplay(1),
            );

            // Only cache requests with no filters or just includeDeleted
            if (!filter || (Object.keys(filter).length === 1 && 'includeDeleted' in filter)) {
                this.categoriesCache$ = request;
            }

            return request;
        }

        return this.categoriesCache$;
    }

    // Get just the categories array as an observable
    getCategoriesList(): Observable<CategoryModel[]> {
        // If we have no data yet, trigger a fetch
        if (this.categoryListSubject.value.length === 0 && !this.categoriesCache$) {
            this.getAll().subscribe();
        }
        return this.categoryListSubject.asObservable();
    }

    // Clear cache if data might have changed
    clearCache(): void {
        this.categoriesCache$ = null;
    }
}
