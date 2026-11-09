import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NgbConfig, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../services/auth.service';
import { BrandService } from '../../services/brand.service';
import { CategoryService } from '../../services/category.service';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { LoginModalService } from '../../services/login-modal.service';
import { FeedbackModalService } from '../../services/feedback-modal.service';

@Component({ template: '', standalone: true })
class EmptyPage {}

describe('Rendered storefront navigation', () => {
    let fixture: ComponentFixture<NavbarComponent>;
    let width: number;
    beforeEach(() => {
        width = 1200;
        spyOnProperty(window, 'innerWidth').and.callFake(() => width);
        TestBed.configureTestingModule({
            imports: [NavbarComponent],
            providers: [
                provideRouter([
                    { path: '', component: EmptyPage },
                    { path: 'products', component: EmptyPage },
                ]),
                { provide: AuthService, useValue: { getCurrentUser: () => of(null), isLoggedIn: () => false, isAdmin: () => false } },
                { provide: BrandService, useValue: { getBrandsList: () => of([{ id: 'brand', title: 'Brand' }]) } },
                { provide: CategoryService, useValue: { getCategoriesList: () => of([{ id: 'care', title: 'Care' }]) } },
                { provide: CartService, useValue: { getProductCount: () => of(0) } },
                { provide: ProductService, useValue: { getAll: () => of({ data: [] }) } },
                { provide: LoginModalService, useValue: {} },
                { provide: FeedbackModalService, useValue: {} },
            ],
        });
        TestBed.inject(NgbConfig).animation = false;
        fixture = TestBed.createComponent(NavbarComponent);
        fixture.detectChanges();
    });
    afterEach(() => {
        TestBed.inject(NgbModal).dismissAll();
        fixture.destroy();
    });
    function resize(value: number) {
        fixture.nativeElement.querySelector('.menu-toggle').style.display = value <= 700 ? 'block' : '';
        width = value;
        window.dispatchEvent(new Event('resize'));
        fixture.detectChanges();
    }
    function button(control: string): HTMLButtonElement {
        return fixture.nativeElement.querySelector(`[aria-controls="${control}"]`);
    }
    it('keeps the whole closed mobile navigation inert and restores its opener on Escape', () => {
        resize(390);
        const opener = button('storefront-navigation');
        const panel: HTMLElement = fixture.nativeElement.querySelector('#storefront-navigation');
        expect(panel.inert).toBeTrue();
        opener.click();
        fixture.detectChanges();
        expect(panel.inert).toBeFalse();
        button('brand-navigation').click();
        fixture.detectChanges();
        fixture.nativeElement.querySelector('#brand-navigation a').focus();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        fixture.detectChanges();
        expect(panel.inert).toBeTrue();
        expect(document.activeElement).toBe(opener);
    });
    it('returns desktop mega-menu focus to its visible trigger on Escape', () => {
        const trigger = button('brand-navigation');
        trigger.click();
        fixture.detectChanges();
        fixture.nativeElement.querySelector('#brand-navigation a').focus();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#brand-navigation').inert).toBeTrue();
        expect(document.activeElement).toBe(trigger);
    });
    it('closes desktop content on a mobile breakpoint and moves hidden focus to the menu opener', () => {
        button('brand-navigation').click();
        fixture.detectChanges();
        fixture.nativeElement.querySelector('#brand-navigation a').focus();
        resize(390);
        expect(fixture.nativeElement.querySelector('#storefront-navigation').inert).toBeTrue();
        expect(fixture.nativeElement.querySelector('#brand-navigation').inert).toBeTrue();
        expect(document.activeElement).toBe(button('storefront-navigation'));
        resize(1200);
        expect(fixture.nativeElement.querySelector('#storefront-navigation').inert).toBeFalse();
    });
    it('closes an open mobile navigation after route navigation', fakeAsync(() => {
        resize(390);
        button('storefront-navigation').click();
        fixture.detectChanges();
        fixture.nativeElement.querySelector('.category-nav a').focus();
        TestBed.inject(Router).navigateByUrl('/products');
        tick();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#storefront-navigation').inert).toBeTrue();
        expect(document.activeElement).toBe(button('storefront-navigation'));
    }));
    it('opens the real search dialog with a shortcut and restores focus after Escape', fakeAsync(() => {
        const opener: HTMLButtonElement = fixture.nativeElement.querySelector('.nav-search');
        opener.focus();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
        fixture.detectChanges();
        tick(150);
        const dialog = document.querySelector<HTMLElement>('ngb-modal-window');
        expect(dialog).not.toBeNull();
        expect(document.activeElement).toBe(dialog?.querySelector('input') ?? null);
        document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        tick(150);
        fixture.detectChanges();
        expect(document.querySelector('ngb-modal-window')).toBeNull();
        expect(document.activeElement).toBe(opener);
    }));
    it('links About to the real homepage owner section', () => {
        const link: HTMLAnchorElement = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>).find(a =>
            a.textContent?.includes('О SkViDerm'),
        )!;
        expect(link.getAttribute('href')).toBe('/#about');
    });
});
