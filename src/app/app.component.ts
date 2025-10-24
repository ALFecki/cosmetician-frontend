import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable, combineLatest, filter, map, of, shareReplay, startWith } from 'rxjs';
import { FooterComponent } from './shared/components/footer/footer.component';
import { LoaderComponent } from './shared/components/loader/loader.component';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { AuthService } from './shared/services/auth.service';
import { MaintenanceService } from './shared/services/maintenance.service';
import { AuthInterceptor } from './shared/utils/auth.interceptor';
import { SnakeToCamelInterceptor } from './shared/utils/case.interceptor';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [CommonModule, NgbModule, RouterOutlet, NavbarComponent, FooterComponent, ToastComponent, LoaderComponent],
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
    showNavbarAndFooter$: Observable<boolean> = of(false);
    isLoading$: Observable<boolean> = of(true);
    private initialLoadComplete = false;

    constructor(
        private router: Router,
        private maintenanceService: MaintenanceService,
        private authService: AuthService,
    ) {
        this.isLoading$ = this.maintenanceService.isLoading().pipe(
            map(loading => {
                if (!loading && !this.initialLoadComplete) {
                    this.initialLoadComplete = true;
                }
                return loading && !this.initialLoadComplete;
            }),
            shareReplay(1)
        );

        this.showNavbarAndFooter$ = combineLatest([
            this.maintenanceService.isMaintenanceModeEnabled(),
            this.router.events.pipe(
                filter(event => event instanceof NavigationEnd),
                map((event: NavigationEnd) => event.url),
                startWith(this.router.url),
            ),
        ]).pipe(
            map(([isMaintenanceMode, url]) => {
                return !isMaintenanceMode || url === '/maintenance';
            }),
            shareReplay(1)
        );
    }

    async ngOnInit(): Promise<void> {
        this.maintenanceService.getMaintenanceStatus().subscribe();
    }
}
