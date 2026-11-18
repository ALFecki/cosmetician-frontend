import { ApplicationRef } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NgbConfig, NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';
import { ProductsComponent } from './products.component';
import { ProductModel } from '../../models/product.model';
import { DiscountType, PromotionModel } from '../../models/promotion.model';
import { ProductService } from '../../services/product.service';
import { BrandService } from '../../services/brand.service';
import { CategoryService } from '../../services/category.service';
import { ProductScopeService } from '../../services/product_scope.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { LoginModalService } from '../../services/login-modal.service';

describe('Rendered catalog filters and quick view', () => {
    let fixture: ComponentFixture<ProductsComponent>;
    let products: jasmine.Spy;
    beforeEach(() => {
        spyOnProperty(window, 'innerWidth').and.returnValue(390);
        spyOn(window, 'scrollTo');
        products = jasmine.createSpy('getAll').and.returnValue(of({ data: [], length: 0 }));
        TestBed.configureTestingModule({
            imports: [ProductsComponent],
            providers: [
                provideRouter([]),
                { provide: ProductService, useValue: { getAll: products } },
                { provide: BrandService, useValue: { getAll: () => of({ data: [{ id: 'brand', title: 'Brand' }] }) } },
                { provide: CategoryService, useValue: { getAll: () => of({ data: [] }) } },
                { provide: ProductScopeService, useValue: { getAll: () => of({ data: [] }) } },
                { provide: CartService, useValue: { addingVariantId: () => null } },
                { provide: AuthService, useValue: {} },
                { provide: LoginModalService, useValue: {} },
            ],
        });
        TestBed.inject(NgbConfig).animation = false;
        fixture = TestBed.createComponent(ProductsComponent);
        fixture.detectChanges();
    });
    afterEach(() => {
        TestBed.inject(NgbOffcanvas).dismiss();
        TestBed.inject(NgbModal).dismissAll();
        fixture.destroy();
    });
    function open() {
        const opener: HTMLButtonElement = fixture.nativeElement.querySelector('.open-filters');
        opener.style.display = 'block';
        opener.focus();
        opener.click();
        TestBed.inject(ApplicationRef).tick();
        fixture.detectChanges();
        tick(150);
        return opener;
    }
    for (const action of ['close', 'Escape', 'backdrop']) {
        it(`opens a modal filter panel and restores focus after ${action}`, fakeAsync(() => {
            const opener = open();
            const panel = document.querySelector<HTMLElement>('ngb-offcanvas-panel');
            expect(panel).not.toBeNull();
            expect(panel?.contains(document.activeElement)).toBeTrue();
            expect(document.body.style.overflow).toBe('hidden');
            if (action === 'close') panel?.querySelector<HTMLButtonElement>('[aria-label="Закрыть фильтры"]')?.click();
            if (action === 'Escape') panel?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            if (action === 'backdrop')
                document
                    .querySelector<HTMLElement>('ngb-offcanvas-backdrop')
                    ?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            tick(150);
            fixture.detectChanges();
            expect(document.querySelector('ngb-offcanvas-panel')).toBeNull();
            expect(document.activeElement).toBe(opener);
            expect(document.body.style.overflow).not.toBe('hidden');
        }));
    }
    it('contains keyboard focus inside the mobile panel', fakeAsync(() => {
        open();
        const panel = document.querySelector<HTMLElement>('ngb-offcanvas-panel');
        const close = panel?.querySelector<HTMLButtonElement>('[aria-label="Закрыть фильтры"]');
        const apply = panel?.querySelector<HTMLButtonElement>('.apply-filters');
        expect(close).not.toBeNull();
        expect(apply).not.toBeNull();
        close?.focus();
        close?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(apply ?? null);
        apply?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(close ?? null);
    }));
    it('updates persistent child fields and the next emitted query after a parent reset', fakeAsync(() => {
        const input: HTMLInputElement = fixture.nativeElement.querySelector('#searchName');
        input.value = 'missing';
        input.dispatchEvent(new Event('input'));
        tick();
        fixture.detectChanges();
        expect(fixture.componentInstance.filterOptions.title).toBe('missing');
        const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('#brand-brand');
        checkbox.click();
        tick();
        fixture.detectChanges();
        expect(fixture.componentInstance.filterOptions.brandId).toEqual(['brand']);
        const minimum: HTMLInputElement = fixture.nativeElement.querySelector('#minPrice');
        minimum.value = '10';
        minimum.dispatchEvent(new Event('input'));
        tick();
        fixture.detectChanges();
        products.calls.reset();
        fixture.nativeElement.querySelector('.empty-state button').click();
        tick();
        fixture.detectChanges();
        tick();
        expect(input.value).toBe('');
        expect(checkbox.checked).toBeFalse();
        expect(minimum.value).toBe('');
        expect(products).toHaveBeenCalledTimes(1);
        input.value = 'fresh';
        input.dispatchEvent(new Event('input'));
        tick();
        fixture.detectChanges();
        const query = products.calls.mostRecent().args[0];
        expect(query.title).toBe('fresh');
        expect(query.brandId).toBeUndefined();
        expect(query.minPrice).toBeUndefined();
    }));
    for (const input of ['brandId', 'categoryId'] as const) {
        it(`reloads the current collection and resets pagination when ${input} changes`, fakeAsync(() => {
            fixture.componentRef.setInput(input, 'first');
            fixture.detectChanges();
            tick();
            fixture.componentInstance.currentPage = 3;
            products.calls.reset();
            fixture.componentRef.setInput(input, 'second');
            fixture.detectChanges();
            tick();
            expect(products).toHaveBeenCalledTimes(1);
            expect(products.calls.mostRecent()?.args[0][input]).toEqual(['second']);
            expect(products.calls.mostRecent()?.args[0].page).toBe(1);
            expect(fixture.componentInstance.filterOptions[input]).toEqual(['second']);
        }));
    }
    it('opens quick view with the customer selected variant id', () => {
        const modal = { componentInstance: {} as Record<string, unknown> };
        spyOn(TestBed.inject(NgbModal), 'open').and.returnValue(modal as never);
        (Object.getOwnPropertyDescriptor(window, 'innerWidth')?.get as jasmine.Spy).and.returnValue(1200);
        const product = {
            id: 'care',
            variants: [
                { id: 'small', price: 10, volume: 10 },
                { id: 'large', price: 20, volume: 20 },
            ],
        } as ProductModel;
        fixture.componentInstance.selectVariant(product, 'large');
        fixture.componentInstance.openProductDetails(product);
        expect(modal.componentInstance['selectedVariantId']).toBe('large');
    });
    it('displays the selected variant’s quoted price and ignores old promotions when Go reports no saving', () => {
        const product = {
            id: 'care',
            title: 'Care',
            variants: [
                { id: 'small', price: 10, volume: 10, promotionPrice: { finalCents: 625, savingCents: 375, promotionId: 'best' } },
                { id: 'large', price: 20, volume: 20, promotionPrice: { finalCents: 2000, savingCents: 0, promotionId: null } },
            ],
            promotions: [
                {
                    id: 'legacy',
                    discountType: DiscountType.PERCENTAGE,
                    discountValue: 10,
                    priority: 99,
                    validFrom: new Date('2000-01-01'),
                    validUntil: new Date('2999-01-01'),
                    isActive: true,
                } as PromotionModel,
            ],
        } as unknown as ProductModel;
        fixture.componentInstance.products$ = of([product]);
        fixture.detectChanges();
        const card: HTMLElement = fixture.nativeElement.querySelector('.product-card');
        expect(card.querySelector('.price')?.textContent).toContain('6.25');
        expect(card.querySelector('.discount-badge')?.textContent).toBe('-37,5%');
        card.querySelectorAll<HTMLButtonElement>('.variant')[1].click();
        fixture.detectChanges();
        expect(card.querySelector('.price')?.textContent).toContain('20.00');
        expect(card.querySelector('.discount-badge')).toBeNull();
    });
});
