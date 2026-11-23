import { GuestCheckoutService } from './shared/services/guest-checkout.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NgbConfig, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { ProductModalComponent } from './shared/components/product-modal/product-modal.component';
import { AuthService } from './shared/services/auth.service';
import { BannerService } from './shared/services/banner.service';
import { BrandService } from './shared/services/brand.service';
import { CartService } from './shared/services/cart.service';
import { CategoryService } from './shared/services/category.service';
import { LoaderService } from './shared/services/loader.service';
import { MaintenanceService } from './shared/services/maintenance.service';
import { ToastService } from './shared/services/toast.service';

@Component({ template: 'Страница', standalone: true })
class PresentationPageComponent {}

describe('Shared customer/admin presentation boundary', () => {
    it('switches root notifications and detached product dialogs with the active route', fakeAsync(() => {
        spyOn(window, 'scrollTo');
        TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: GuestCheckoutService, useValue: { session: null } },
                provideRouter([{ path: '**', component: PresentationPageComponent }]),
                { provide: AuthService, useValue: { getCurrentUser: () => of(null), isLoggedIn: () => false, isAdmin: () => false } },
                { provide: MaintenanceService, useValue: { isMaintenanceModeEnabled: () => of(false) } },
                { provide: BrandService, useValue: { getBrandsList: () => of([]) } },
                { provide: CategoryService, useValue: { getCategoriesList: () => of([]) } },
                { provide: CartService, useValue: { getProductCount: () => of(0), addingVariantId: () => null } },
                { provide: BannerService, useValue: { getPublished: () => of({ data: [] }) } },
            ],
        });
        TestBed.inject(NgbConfig).animation = false;
        const fixture = TestBed.createComponent(AppComponent);
        const router = TestBed.inject(Router);
        const modal = TestBed.inject(NgbModal);
        const loader = TestBed.inject(LoaderService);
        const toast = TestBed.inject(ToastService);
        loader.show();
        toast.visible = true;
        toast.message = 'Готово';
        toast.type = 'success';
        fixture.detectChanges();

        for (const [url, customer] of [
            ['/admin/orders', false],
            ['/products', true],
            ['/admin/order/42', false],
        ] as const) {
            router.navigateByUrl(url);
            tick(200);
            fixture.detectChanges();
            const dialog = modal.open(ProductModalComponent, { size: 'lg', centered: true, scrollable: true });
            dialog.result.catch(() => undefined);
            tick();
            const product = document.querySelector<HTMLElement>('ngb-modal-window app-product-modal')!;
            expect(product.closest('app-root')).withContext(url).toBeNull();
            expect(product.classList.contains('storefront-presentation')).withContext(url).toBe(customer);
            const title = getComputedStyle(product.querySelector<HTMLElement>('.modal-title')!);
            expect(title.fontWeight)
                .withContext(url)
                .toBe(customer ? '400' : '700');
            const spinner = fixture.nativeElement.querySelector('.spinner');
            expect(getComputedStyle(spinner).width)
                .withContext(url)
                .toBe(customer ? '32px' : window.innerWidth <= 768 ? '50px' : '60px');
            const icon = fixture.nativeElement.querySelector('.toast-icon');
            expect(getComputedStyle(icon).display === 'none')
                .withContext(url)
                .toBe(customer);
            for (const selector of ['app-loader', 'app-toast']) {
                expect(fixture.nativeElement.querySelector(selector).classList.contains('storefront-presentation'))
                    .withContext(`${url} ${selector}`)
                    .toBe(customer);
            }
            dialog.close();
            tick();
        }
        loader.hide();
        fixture.destroy();
    }));
});
