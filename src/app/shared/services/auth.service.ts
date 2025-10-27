import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { Md5 } from 'ts-md5';
import { environment } from '../../../environments/environment';
import { Claims, LoginData, LoginResponse, RegistrationData } from '../models/login.interface';
import { PersonModel } from '../models/person.model';
import { ForgotPasswordResponse } from '../base/schemas/base_schema';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private csrfToken: BehaviorSubject<string> = new BehaviorSubject<string>('');
    private onLogin: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    private onLogout: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    private userClaims: BehaviorSubject<Claims | null> = new BehaviorSubject<Claims | null>(null);
    private currentUser: BehaviorSubject<PersonModel | null> = new BehaviorSubject<PersonModel | null>(null);

    constructor(
        private http: HttpClient,
    ) {}

    login(loginData: LoginData): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${environment.server_url}/login`, loginData, { withCredentials: true }).pipe(
            tap((response: LoginResponse) => {
                this.csrfToken.next(response.claims.csrf_token);
                this.userClaims.next(response.claims);
                this.currentUser.next(response.user);
                this.onLogin.next(true);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('isAuthenticated', 'true');
                }
            }),
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

    forgotPassword(email: string): Observable<ForgotPasswordResponse> {
        return this.http
            .get<ForgotPasswordResponse>(`${environment.server_url}/forgot_password`, { params: new HttpParams().set('email', email) })
            .pipe(
                tap(() => {
                    console.log('Forgot password email sent');
                }),
                catchError(error => {
                    console.error('Forgot password error:', error);
                    return throwError(() => error);
                }),
            );
    }

    resetPassword(email: string, token: string, newPassword: string): Observable<PersonModel> {
        return this.http
            .post<PersonModel>(`${environment.server_url}/reset_password`, {
                email,
                token,
                newPassword: Md5.hashStr(newPassword),
            })
            .pipe(
                catchError(error => {
                    console.error('Reset password error:', error);
                    return throwError(() => error);
                }),
            );
    }

    verifyResetToken(token: string, email: string): Observable<{ valid: boolean }> {
        return this.http
            .get<{
                valid: boolean;
            }>(`${environment.server_url}/verify_reset_token`, { params: new HttpParams().set('token', token).set('email', email) })
            .pipe(
                catchError(error => {
                    console.error('Verify reset token error:', error);
                    return throwError(() => error);
                }),
            );
    }

    sendEmailVerification(): Observable<{ result: string; code: string }> {
        return this.http.get<{ result: string; code: string }>(`${environment.server_url}/verify_email`, { withCredentials: true }).pipe(
            catchError(error => {
                console.error('Send email verification error:', error);
                return throwError(() => error);
            }),
        );
    }

    verifyEmail(code: string): Observable<PersonModel> {
        return this.http
            .get<PersonModel>(`${environment.server_url}/email_verification`, {
                params: new HttpParams().set('code', code),
                withCredentials: true,
            })
            .pipe(
                tap(response => {
                    if (response) {
                        console.log('Email verified successfully');
                    } else {
                        console.log('Email verification failed');
                    }
                }),
                catchError(error => {
                    console.error('Verify email error:', error);
                    return throwError(() => error);
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
        if (typeof window !== 'undefined' && !localStorage.getItem('isAuthenticated')) {
        return of(null);
        }
        return this.http.get<LoginResponse>(`${environment.server_url}/check_auth`, { withCredentials: true }).pipe(
            tap((response: LoginResponse) => {
                this.csrfToken.next(response.claims.csrf_token);
                this.userClaims.next(response.claims as Claims);
                this.currentUser.next(response.user);
            }),
            catchError(() => {
                if (typeof window !== 'undefined') {
                localStorage.removeItem('isAuthenticated');
                }
                return of(null);
            }),
        );
    }

    getCurrentUser(): Observable<PersonModel | null> {
        return this.currentUser.asObservable();
    }

    getCurrentUserSync(): PersonModel | null {
        return this.currentUser.value;
    }

    logout(): Observable<unknown> {
        return this.http.post(`${environment.server_url}/logout`, {}, { withCredentials: true }).pipe(
            tap(() => {
                this.csrfToken.next('');
                this.userClaims.next(null);
                this.currentUser.next(null);
                this.onLogout.next(true);
                if (typeof window !== 'undefined') {
                localStorage.removeItem('isAuthenticated');
            }
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
        return this.isLoggedIn() && !!claims && (claims.is_admin || claims.is_moderator);
    }

    isAdmin$(): Observable<boolean> {
        return this.checkAuth().pipe(
            map(claims => {
                if (!claims) return false;
                return claims.claims.is_admin === true;
            }),
            catchError(() => of(false)),
        );
    }
}
