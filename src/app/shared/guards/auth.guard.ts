import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root',
})
export class AuthGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router,
    ) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        return this.authService.checkAuth().pipe(
            map(response => {
                if (response) {
                    return true;
                }
                this.router.navigate(['/login'], {
                    queryParams: { returnUrl: state.url },
                });
                return false;
            }),
            catchError(() => {
                this.router.navigate(['/login'], {
                    queryParams: { returnUrl: state.url },
                });
                return of(false);
            }),
        );
    }
}
