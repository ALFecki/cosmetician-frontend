import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../../environment';
import { LoginData, LoginResponse } from '../models/login.interface';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private csrfToken: BehaviorSubject<string> = new BehaviorSubject<string>('');

    constructor(private http: HttpClient) {}

    login(loginData: LoginData): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${environment.server_url}/login`, loginData, { withCredentials: true }).pipe(
            tap((response: LoginResponse) => {
                this.csrfToken.next(response.csrf_token);
            }),
        );
    }

    getCsrfToken(): string {
        return this.csrfToken.value;
    }

    addCsrfToken(headers: HttpHeaders): HttpHeaders {
        const token = this.getCsrfToken();
        if (token) {
            headers = headers.set('X-CSRF-Token', token);
        }
        return headers;
    }

    checkAuth(): Observable<LoginResponse> {
        return this.http.get<LoginResponse>(`${environment.server_url}/check_auth`, { withCredentials: true }).pipe(
            tap((response: LoginResponse) => {
                this.csrfToken.next(response.csrf_token);
            }),
        );
    }

    logout(): Observable<unknown> {
        return this.http.post(`${environment.server_url}/logout`, {}).pipe(
            tap(() => {
                this.csrfToken.next('');
            }),
        );
    }

    isLoggedIn(): boolean {
        return !!this.csrfToken.value;
    }
}
