import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { of, firstValueFrom } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { MaintenanceService } from '../services/maintenance.service';

@Injectable({
    providedIn: 'root',
})
export class MaintenanceGuard implements CanActivate {
    constructor(
        private maintenanceService: MaintenanceService,
        private authService: AuthService,
        private router: Router,
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
        const status = await this.maintenanceService.checkMaintenanceStatus();
        if (!status) {
            return true;
        }

        return firstValueFrom(this.authService.isAdmin$().pipe(
            take(1),
            map(isAdmin => {
                if (isAdmin) {
                    return true;
                } else {
                    return this.router.createUrlTree(['/maintenance']);
                }
            }),
            catchError(() => {
                return of(this.router.createUrlTree(['/maintenance']));
            }),
        ));

        // .pipe(
        //     switchMap(isMaintenanceMode => {
        //         if (!isMaintenanceMode.enabled) {
        //             return of(true);
        //         }

        //         return this.authService.isAdmin$().pipe(
        //             take(1),
        //             map(isAdmin => {
        //                 if (isAdmin) {
        //                     return true;
        //                 } else {
        //                     return this.router.createUrlTree(['/maintenance']);
        //                 }
        //             }),
        //         );
        //     }),
        // );
    }
}
