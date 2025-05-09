import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private authService: AuthService) {
        // this.authService.checkAuth()
    }

    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        if (!req.url.includes('login') && !req.url.includes('logout')) {
            req = req.clone({
                headers: this.authService.addCsrfToken(req.headers),
            });
        }

        req = req.clone({
            withCredentials: true,
        });

        return next.handle(req);
    }
}
