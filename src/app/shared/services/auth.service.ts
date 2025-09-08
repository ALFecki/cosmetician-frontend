import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
// import { SsrCookieService } from 'ngx-cookie-service-ssr';
import { BehaviorSubject, catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { Md5 } from 'ts-md5';
import { environment } from '../../../environments/environment';
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

    constructor(private http: HttpClient,
        //  private cookieService: SsrCookieService
        ) {}

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

    forgotPassword(email: string): Observable<any> {
        return this.http.post(`${environment.server_url}/auth/forgot_password`, { email }).pipe(
            catchError(error => {
                console.error('Forgot password error:', error);
                return throwError(() => error);
            })
        );
    }

    resetPassword(token: string, newPassword: string): Observable<any> {
        return this.http.post(`${environment.server_url}/auth/reset_password`, { 
            token, 
            newPassword: Md5.hashStr(newPassword)
        }).pipe(
            catchError(error => {
                console.error('Reset password error:', error);
                return throwError(() => error);
            })
        );
    }

    verifyResetToken(token: string): Observable<any> {
        return this.http.get(`${environment.server_url}/auth/verify_reset_token/${token}`).pipe(
            catchError(error => {
                console.error('Verify reset token error:', error);
                return throwError(() => error);
            })
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
        console.log('Checking authentication status...');
        // console.log('Platform ID:', this.cookieService.check('jwt'));
        // if (this.cookieService.check('jwt') === false) {
        //     return of(null);
        // }
        return this.http.get<LoginResponse>(`${environment.server_url}/check_auth`, { withCredentials: true }).pipe(
            tap((response: LoginResponse) => {
                // console.log('Auth check response:', response);
                this.csrfToken.next(response.claims.csrf_token);
                this.userClaims.next(response.claims as Claims);
                this.currentUser.next(response.user);
            }),
            // catchError((error) => {
            //     console.error('Auth check error:', error);
            //     return of(null);
            // }),
        );
    }

    getCurrentUser(): Observable<PersonModel | null> {
        return this.currentUser.asObservable();
    }

    logout(): Observable<unknown> {
        return this.http.post(`${environment.server_url}/logout`, {}, { withCredentials: true }).pipe(
            tap(() => {
                this.csrfToken.next('');
                this.userClaims.next(null);
                this.currentUser.next(null);
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
