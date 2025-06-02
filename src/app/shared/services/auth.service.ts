import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../../../environment';
import { Claims, LoginData, LoginResponse, RegistrationData } from '../models/login.interface';
import { PersonModel } from '../models/person.model';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private csrfToken: BehaviorSubject<string> = new BehaviorSubject<string>('');
    private onLogin: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    private onLogout: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    private userClaims: BehaviorSubject<Claims | null> = new BehaviorSubject<Claims | null>(null);
    private currentUser: BehaviorSubject<PersonModel | null> = new BehaviorSubject<PersonModel | null>(null);

    constructor(private http: HttpClient) {}

    login(loginData: LoginData): Observable<Claims> {
        return this.http.post<Claims>(`${environment.server_url}/login`, loginData, { withCredentials: true }).pipe(
            tap((response: Claims) => {
                this.csrfToken.next(response.csrf_token);
                this.userClaims.next(response);
                this.onLogin.next(true);
            }),
            // catchError((error: HttpErrorResponse) => {
            //     console.error('Login error:', error);
            //     return new Observable<LoginResponse>(observer => {
            //         observer.error(error);
            //     });
            // }),
        );
    }

    register(registrationData: RegistrationData): Observable<LoginResponse | null> {
        return this.http.post<LoginResponse>(`${environment.server_url}/register`, registrationData, { withCredentials: true }).pipe(
            tap((response: LoginResponse) => {
                this.csrfToken.next(response.claims.csrf_token);
                this.onLogin.next(true);
            }),
            catchError((error: HttpErrorResponse) => {
                console.error('Registration error:', error);
                return of(null);
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

    checkAuth(): Observable<LoginResponse | null> {
        return this.http.get<LoginResponse>(`${environment.server_url}/check_auth`, { withCredentials: true }).pipe(
            tap((response: LoginResponse) => {
                // console.log('Auth check response:', response);
                this.csrfToken.next(response.claims.csrf_token);
                this.userClaims.next(response.claims as Claims);
                this.currentUser.next(response.user);
            }),
            catchError(() => {
                // console.error('Auth check error:', error);
                return of(null);
            }),
        );
    }

    getCurrentUser(): Observable<PersonModel | null> {
        return this.currentUser.asObservable();
    }

    logout(): Observable<unknown> {
        return this.http.post(`${environment.server_url}/logout`, {}, { withCredentials: true }).pipe(
            tap(() => {
                this.csrfToken.next('');
                this.onLogout.next(true);
            }),
        );
    }

    getLoginStatus(): Observable<boolean> {
        return this.onLogin.asObservable();
    }

    getLogoutStatus(): Observable<boolean> {
        return this.onLogout.asObservable();
    }

    isLoggedIn(): boolean {
        return !!this.csrfToken.value;
    }

    isAdmin(): boolean {
        const claims = this.userClaims.getValue();
        console.log('Checking admin status:', claims);
        return this.isLoggedIn() && !!claims && (claims.is_admin || claims.is_moderator);
    }

    isAdmin$(): Observable<boolean> {
        return this.checkAuth().pipe(
            map(claims => {
                if (!claims) return false;
                return claims.claims.is_admin === true;
            }),
        );
    }
}
