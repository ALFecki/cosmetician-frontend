import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environment';
import { ListResponse, SingleResponse } from '../schemas/base_schema';

@Injectable({
    providedIn: 'root',
})
export abstract class DataService<Model, CreateSchema, UpdateSchema, FilterSchema> {
    protected apiUrl = environment.server_url;
    protected abstract endpoint: string;

    constructor(protected http: HttpClient) {}

    getAll(filter: FilterSchema | null = null): Observable<ListResponse<Model>> {
        let params = new HttpParams();
        if (filter) {
            (Object.keys(filter) as (keyof FilterSchema)[]).forEach(key => {
                if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
                    if (filter[key] instanceof Date) {
                        params = params.append(String(key), filter[key].toISOString());
                    } else if (Array.isArray(filter[key])) {
                        console.log('Array filter:', filter[key]);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const values = filter[key] as any[];
                        params = params.append(String(key), values.join(','));
                    } else {
                        params = params.append(String(key), filter[key].toString());
                    }
                }
            });
        }
        return this.http.get<ListResponse<Model>>(`${this.apiUrl}/${this.endpoint}`, { params });
    }

    getById(id: string): Observable<SingleResponse<Model>> {
        return this.http.get<SingleResponse<Model>>(`${this.apiUrl}/${this.endpoint}/${id}`);
    }

    getByFilterSchema(schema: FilterSchema): Observable<ListResponse<Model>> {
        let params = new HttpParams();
        if (schema) {
            (Object.keys(schema) as (keyof FilterSchema)[]).forEach(key => {
                if (schema[key] !== null && schema[key] !== undefined && schema[key] !== '') {
                    if (schema[key] instanceof Date) {
                        params = params.append(String(key), schema[key].toISOString());
                    } else if (Array.isArray(schema[key])) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        schema[key].forEach((value: any) => {
                            params = params.append(String(key), value.toString());
                        });
                    } else if (typeof schema[key] === 'boolean') {
                        params = params.append(String(key), schema[key] ? '1' : '0');
                    } else {
                        params = params.append(String(key), schema[key].toString());
                    }
                }
            });
        }
        return this.http.get<ListResponse<Model>>(`${this.apiUrl}/${this.endpoint}`, { params });
    }

    protected async uploadImage(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await firstValueFrom(
            this.http.post<{ status: string; data: { path: string } }>(`${this.apiUrl}/upload/image`, formData),
        );

        return response.data.path;
    }

    async create(data: CreateSchema): Promise<SingleResponse<Model>> {
        const processedData = { ...(data as CreateSchema) };
        console.log('Processed data:', processedData);

        for (const key in processedData) {
            if (key.includes('image') && processedData[key] instanceof File) {
                processedData[key] =
                    `${environment.server_url}/images/${await this.uploadImage(processedData[key])}` as (typeof processedData)[typeof key];
            }
        }
        console.log('Processed create data:', processedData);

        return firstValueFrom(this.http.post<SingleResponse<Model>>(`${this.apiUrl}/${this.endpoint}`, processedData));
    }

    async update(id: string, data: UpdateSchema): Promise<SingleResponse<Model>> {
        const processedData = { ...(data as UpdateSchema) };

        for (const key in processedData) {
            if (key.includes('image') && processedData[key] instanceof File) {
                processedData[key] = (await this.uploadImage(processedData[key])) as (typeof processedData)[typeof key];
            }
        }
        console.log('Processed update data:', processedData);

        return firstValueFrom(this.http.patch<SingleResponse<Model>>(`${this.apiUrl}/${this.endpoint}/${id}`, processedData));
    }

    delete(id: string): Observable<SingleResponse<Model>> {
        return this.http.delete<SingleResponse<Model>>(`${this.apiUrl}/${this.endpoint}/${id}`);
    }

    deleteCascade(id: string): Observable<SingleResponse<Model>> {
        return this.http.delete<SingleResponse<Model>>(`${this.apiUrl}/${this.endpoint}/cascade/${id}`);
    }
}
