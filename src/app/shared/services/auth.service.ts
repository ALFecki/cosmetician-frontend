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
            // catchError((error: HttpErrorResponse) => {
            //     console.error('Login error:', error);
            //     return new Observable<LoginResponse>(observer => {
            //         observer.error(error);
            //     });
            // }),
        );
    }

    getCsrfToken(): string {
        return this.csrfToken.value;
    }

    addCsrfToken(headers: HttpHeaders): HttpHeaders {
        const token = this.getCsrfToken();
        console.log('Current CSRF Token:', token);
        if (token) {
            headers = headers.set('X-CSRF-Token', token);
            console.log('CSRF Token added to headers:', token);
            console.log('Headers:', headers);
        }
        return headers;
    }

    checkAuth(): Observable<LoginResponse> {
        return this.http.get<LoginResponse>(`${environment.server_url}/check_auth`, { withCredentials: true }).pipe(
            tap((response: LoginResponse) => {
                console.log('Auth check response:', response);
                this.csrfToken.next(response.csrf_token);
            }),
            // catchError((error: HttpErrorResponse) => {
            //     console.error('Auth check error:', error);
            //     return new Observable<LoginResponse>(observer => {
            //         observer.error(error);
            //     });
            // }),
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
