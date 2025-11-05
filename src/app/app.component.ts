import { CommonModule, isPlatformBrowser, ViewportScroller } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { combineLatest, filter, map, Observable, of, startWith } from 'rxjs';
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
export class AppComponent {
    title = 'proskin-frontend';
    showNavbarAndFooter$: Observable<boolean> = of(false);

    constructor(
        private router: Router,
        private maintenanceService: MaintenanceService,
        private authService: AuthService,
        private viewportScroller: ViewportScroller,
        @Inject(PLATFORM_ID) private platformId: object,
    ) {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            if (isPlatformBrowser(this.platformId)) {
                setTimeout(() => {
                    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                    document.body.scrollTop = 0;
                    document.documentElement.scrollTop = 0;
                    this.viewportScroller.scrollToPosition([0, 0]);
                }, 200);
            }
        });

        this.showNavbarAndFooter$ = combineLatest([
            this.maintenanceService.isMaintenanceModeEnabled(),
            this.router.events.pipe(
                filter(event => event instanceof NavigationEnd),
                map((event: NavigationEnd) => event.url),
                startWith(this.router.url),
            ),
        ]).pipe(
            map(([isMaintenanceMode, currentUrl]) => {
                if (currentUrl.includes('/maintenance')) {
                    return false;
                }

                if (isMaintenanceMode && !this.authService.isAdmin()) {
                    return false;
                }

                return true;
            }),
        );
    }

    onActivate() {
        if (isPlatformBrowser(this.platformId)) {
            const scrollToTop = () => {
                window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                document.body.scrollTop = 0;
                document.documentElement.scrollTop = 0;

                const scrollableElements = document.querySelectorAll('*');
                scrollableElements.forEach((el) => {
                    const element = el as HTMLElement;
                    if (element.scrollTop && element.scrollTop > 0) {
                        element.scrollTop = 0;
                    }
                });

                this.viewportScroller.scrollToPosition([0, 0]);
            };

            scrollToTop();
        }
    }
}
