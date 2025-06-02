import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, from, switchMap } from 'rxjs';
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

    canActivate(): Observable<boolean | UrlTree> {
        return this.authService.isAdmin$().pipe(
            map(isAdmin => ({ isAdmin })),
            map(({ isAdmin }) =>
                from(this.maintenanceService.checkMaintenanceStatus()).pipe(
                    map(isMaintenanceMode => {
                        if (isMaintenanceMode) {
                            if (isAdmin) {
                                return true;
                            } else {
                                return this.router.createUrlTree(['/maintenance']);
                            }
                        }
                        return true;
                    }),
                ),
            ),
            switchMap(obs => obs),
        );
    }
}
