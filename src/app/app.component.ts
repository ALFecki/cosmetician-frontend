import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable, combineLatest, filter, map } from 'rxjs';
import { HomeModule } from './features/home/home.module';
import { FooterComponent } from './shared/components/footer/footer.component';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { MaintenanceService } from './shared/services/maintenance.service';
import { AuthInterceptor } from './shared/utils/auth.interceptor';
import { SnakeToCamelInterceptor } from './shared/utils/case.interceptor';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    standalone: true,
    imports: [CommonModule, NgbModule, RouterOutlet, NavbarComponent, HomeModule, FooterComponent, ToastComponent],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: SnakeToCamelInterceptor,
            multi: true,
        },
    ],
})
export class AppComponent implements OnInit {
    title = 'proskin-frontend';
    showNavbarAndFooter$: Observable<boolean>;

    constructor(
        private router: Router,
        private maintenanceService: MaintenanceService,
    ) {
        this.showNavbarAndFooter$ = combineLatest([
            this.maintenanceService.getMaintenanceStatus(),
            this.router.events.pipe(
                filter(event => event instanceof NavigationEnd),
                map((event: NavigationEnd) => event.url),
            ),
        ]).pipe(
            map(([isMaintenanceMode, currentUrl]) => {
                if (isMaintenanceMode && currentUrl === '/maintenance') {
                    return false;
                }
                return true;
            }),
        );
    }

    async ngOnInit(): Promise<void> {
        await this.maintenanceService.getMaintenanceStatus();
    }
}
