import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environment';
import { ListResponse, SingleResponse } from '../schemas/base_schema';

@Injectable({
    providedIn: 'root'
})
export abstract class DataService<Model, CreateSchema, UpdateSchema, FilterSchema> {
    protected apiUrl = environment.server_url;
    protected abstract endpoint: string;

    constructor(private http: HttpClient) { }

    getAll(): Observable<ListResponse<Model>> {
        return this.http.get<ListResponse<Model>>(`${this.apiUrl}/${this.endpoint}`);
    }

    getById(id: string): Observable<SingleResponse<Model>> {
        return this.http.get<SingleResponse<Model>>(`${this.apiUrl}/${this.endpoint}/${id}`);
    }

    getByFilterSchema(schema: FilterSchema): Observable<ListResponse<Model>> {
        let params = new HttpParams();
        if (schema) {
            (Object.keys(schema) as Array<keyof FilterSchema>).forEach(key => {
                if (schema[key] !== null && schema[key] !== undefined && schema[key] !== '') {
                    if (schema[key] instanceof Date) {
                        params = params.append(String(key).replace(/([A-Z])/g, '_$1').toLowerCase(), schema[key].toISOString());
                    }
                    else if (Array.isArray(schema[key])) {
                        schema[key].forEach((value: any) => {
                            params = params.append(String(key).replace(/([A-Z])/g, '_$1').toLowerCase(), value.toString());
                        });
                    }
                    else if (typeof schema[key] === 'boolean') {
                        params = params.append(String(key).replace(/([A-Z])/g, '_$1').toLowerCase(), schema[key] ? '1' : '0');
                    }
                    else {
                        params = params.append(String(key).replace(/([A-Z])/g, '_$1').toLowerCase(), schema[key].toString());
                    }
                }
            });
        }
        return this.http.get<ListResponse<Model>>(`${this.apiUrl}/${this.endpoint}`, { params });
    }

    abstract create(data: CreateSchema): Observable<SingleResponse<Model>>;

    abstract update(data: UpdateSchema): Observable<SingleResponse<Model>>;

    delete(id: number): Observable<SingleResponse<Model>> {
        return this.http.delete<SingleResponse<Model>>(`${this.apiUrl}/${this.endpoint}/${id}`);
    }

    abstract transformModel(data: any): Model;

    transformList(data: ListResponse<Model>): ListResponse<Model> {
        return {
            status: data.status,
            length: data.length,
            data: data.data.map(item => this.transformModel(item))
        };
    }

    transformSingle(data: SingleResponse<Model>): SingleResponse<Model> {
        return {
            status: data.status,
            data: this.transformModel(data.data)
        };
    }

}