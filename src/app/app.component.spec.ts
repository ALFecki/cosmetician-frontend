import { ViewportScroller } from '@angular/common';
import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { HomeComponent } from './features/home/home.component';
import { AuthService } from './shared/services/auth.service';
import { MaintenanceService } from './shared/services/maintenance.service';
import { BrandService } from './shared/services/brand.service';
import { CategoryService } from './shared/services/category.service';
import { CartService } from './shared/services/cart.service';
import { ProductService } from './shared/services/product.service';
import { BannerService } from './shared/services/banner.service';

@Component({ template: 'Каталог', standalone: true })
class CatalogPage {}

describe('About navigation in the real storefront shell', () => {
    it('reaches the actual owner section after navigation and the existing scroll timers', fakeAsync(() => {
        const scroller = jasmine.createSpyObj<ViewportScroller>('ViewportScroller', ['scrollToPosition', 'scrollToAnchor', 'setOffset']);
        spyOn(window, 'scrollTo');
        TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [
                provideRouter([
                    { path: '', component: HomeComponent },
                    { path: 'products', component: CatalogPage },
                    { path: '**', redirectTo: '' },
                ]),
                { provide: ViewportScroller, useValue: scroller },
                { provide: AuthService, useValue: { getCurrentUser: () => of(null), isLoggedIn: () => false, isAdmin: () => false } },
                { provide: MaintenanceService, useValue: { isMaintenanceModeEnabled: () => of(false) } },
                { provide: BrandService, useValue: { getBrandsList: () => of([]) } },
                { provide: CategoryService, useValue: { getCategoriesList: () => of([]) } },
                { provide: CartService, useValue: { getProductCount: () => of(0) } },
                { provide: ProductService, useValue: { getAll: () => of({ data: [], length: 0 }) } },
                { provide: BannerService, useValue: { getPublished: () => of({ data: [] }) } },
            ],
        });
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        const router = TestBed.inject(Router);
        router.navigateByUrl('/products');
        tick();
        fixture.detectChanges();
        tick(200);
        const links = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>).filter(a =>
            a.textContent?.includes('О SkViDerm'),
        );
        expect(links.length).toBe(2);
        for (const link of links) expect(link.getAttribute('href')).toBe('/#about');
        scroller.scrollToPosition.calls.reset();
        scroller.scrollToAnchor.calls.reset();
        links[0].click();
        tick();
        fixture.detectChanges();
        tick(200);
        fixture.detectChanges();
        tick(300);
        expect(router.url).toBe('/#about');
        expect(document.getElementById('about')).not.toBeNull();
        expect(scroller.scrollToAnchor).toHaveBeenCalledWith('about');
        expect(scroller.scrollToPosition).not.toHaveBeenCalled();
        fixture.destroy();
    }));
});
