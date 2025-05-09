import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserModel } from '../models/user.model';
import { environment } from '../../../../environment';

@Injectable({
    providedIn: 'root',
})
export class AdminService {
    private apiUrl = `${environment.server_url}/admin`;

    constructor(private http: HttpClient) {}

    getAll(): Observable<{ data: UserModel[] }> {
        return this.http.get<{ data: UserModel[] }>(`${this.apiUrl}/users`);
    }

    getById(id: string): Observable<UserModel> {
        return this.http.get<UserModel>(`${this.apiUrl}/users/${id}`);
    }

    create(user: Partial<UserModel>): Observable<UserModel> {
        return this.http.post<UserModel>(`${this.apiUrl}/users`, user);
    }

    update(id: string, user: Partial<UserModel>): Observable<UserModel> {
        return this.http.put<UserModel>(`${this.apiUrl}/users/${id}`, user);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/users/${id}`);
    }

    // getStatistics(): Observable<any> {
    //     return this.http.get<any>(`${this.apiUrl}/statistics`);
    // }
}
