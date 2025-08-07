import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
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
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        return this.maintenanceService.getMaintenanceStatus().pipe(
            switchMap(isMaintenanceMode => {
                if (!isMaintenanceMode) {
                    return of(true);
                }

                return this.authService.isAdmin$().pipe(
                    take(1),
                    map(isAdmin => {
                        console.log('Maintenance mode is enabled. User is admin:', isAdmin);
                        if (isAdmin) {
                            return true;
                        } else {
                            this.router.navigate(['/maintenance']);
                            return false;
                        }
                    }),
                );
            }),
        );
    }
}
