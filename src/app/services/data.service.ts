import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

@Injectable({
    providedIn: 'root'
})
export abstract class DataService {
    protected apiUrl = environment.server_url;
    protected abstract endpoint: string;

    constructor(private http: HttpClient) { }

    getAll(): Observable<any> {
        return this.http.get(`${this.apiUrl}/${this.endpoint}`);
    }

    getById(id: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/${this.endpoint}/${id}`);
    }

    abstract create(data: any): Observable<any>;

    abstract update(data: any): Observable<any>;

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${this.endpoint}/${id}`);
    }
}