import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { MaintenanceService } from '../services/maintenance.service';

@Injectable({
    providedIn: 'root'
})
export class MaintenanceGuard implements CanActivate {
    constructor(
        private maintenanceService: MaintenanceService,
        private authService: AuthService,
        private router: Router
    ) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean> {
        // Сначала инициализируем статус maintenance mode
        return this.maintenanceService.getMaintenanceStatus().pipe(
            switchMap(isMaintenanceMode => {
                // Если maintenance mode выключен, разрешаем доступ
                if (!isMaintenanceMode) {
                    return of(true);
                }

                // Если maintenance mode включен, проверяем права администратора
                return this.authService.isAdmin$().pipe(
                    take(1),
                    map(isAdmin => {
                        
                        console.log('Maintenance mode is enabled. User is admin:', isAdmin);
                        if (isAdmin) {
                            // Администратор может проходить
                            return true;
                        } else {
                            // Обычных пользователей перенаправляем на страницу maintenance
                            this.router.navigate(['/maintenance']);
                            return false;
                        }
                    })
                );
            })
        );
    }
}
