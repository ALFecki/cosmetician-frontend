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

    override getAll(filter: FilterCategorySchema | null = null): Observable<ListResponse<CategoryModel>> {
        if (!this.categoriesCache$ || (filter && Object.keys(filter).length > 0)) {
            const request = super.getAll(filter).pipe(
                tap(response => {
                    if (response && response.data) {
                        this.categoryListSubject.next(response.data);
                    }
                }),
                shareReplay(1),
            );

            if (!filter || (Object.keys(filter).length === 1 && 'includeDeleted' in filter)) {
                this.categoriesCache$ = request;
            }

            return request;
        }

        return this.categoriesCache$;
    }

    getCategoriesList(): Observable<CategoryModel[]> {
        if (this.categoryListSubject.value.length === 0 && !this.categoriesCache$) {
            this.getAll().subscribe();
        }
        return this.categoryListSubject.asObservable();
    }

    clearCache(): void {
        this.categoriesCache$ = null;
    }
}
