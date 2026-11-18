import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ProductModel } from '../../../../shared/models/product.model';
import { ProductService } from '../../../../shared/services/product.service';
import { ProductSearchComponent } from './product-search.component';

describe('Catalog search keyboard interaction', () => {
    let fixture: ComponentFixture<ProductSearchComponent>;
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ProductSearchComponent],
            providers: [
                { provide: ProductService, useValue: { getAll: () => of({ data: [] }) } },
                { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
            ],
        });
        fixture = TestBed.createComponent(ProductSearchComponent);
    });
    for (const highlighted of [-1, 0]) {
        it(`keeps native Close+Enter local with selected index ${highlighted}`, fakeAsync(() => {
            let closes = 0;
            fixture.componentInstance.closeSearch.subscribe(() => closes++);
            fixture.detectChanges();
            tick(100);
            fixture.componentInstance.searchResults = [{ id: 'highlighted', title: 'Highlighted' }] as ProductModel[];
            fixture.componentInstance.selectedIndex = highlighted;
            const close: HTMLButtonElement = fixture.nativeElement.querySelector('.close-button');
            close.focus();
            const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
            close.dispatchEvent(event);
            expect(event.defaultPrevented).toBeFalse();
            if (!event.defaultPrevented) close.click();
            expect(closes).toBe(1);
            expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
            fixture.destroy();
        }));
    }
    it('activates the focused result once rather than the highlighted different result', fakeAsync(() => {
        fixture.detectChanges();
        tick(100);
        fixture.componentInstance.searchQuery = 'care';
        fixture.componentInstance.searchResults = [
            { id: 'focused', image: 'assets/images/owner/portrait1.jpg', title: 'Focused', description: '', brand: { title: 'Brand' } },
            {
                id: 'highlighted',
                image: 'assets/images/owner/portrait1.jpg',
                title: 'Highlighted',
                description: '',
                brand: { title: 'Brand' },
            },
        ] as ProductModel[];
        fixture.componentInstance.selectedIndex = 1;
        fixture.detectChanges();
        const result: HTMLElement = fixture.nativeElement.querySelector('.search-result-item');
        result.focus();
        result.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        expect(TestBed.inject(Router).navigate).toHaveBeenCalledOnceWith(['/product', 'focused']);
        fixture.destroy();
    }));
    it('closes once on Escape while the search input has focus', fakeAsync(() => {
        let closes = 0;
        fixture.componentInstance.closeSearch.subscribe(() => closes++);
        fixture.detectChanges();
        tick(100);
        const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
        input.focus();
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(closes).toBe(1);
        fixture.destroy();
    }));
    it('uses the authoritative search result price when visible and honors hidden prices', () => {
        const product = {
            id: 'care',
            variants: [
                { id: 'archived-default', isDefault: true, isDeleted: true, price: 1 },
                { id: 'active', price: 20, promotionPrice: { finalCents: 1250, savingCents: 750, promotionId: 'best' } },
            ],
        } as ProductModel;
        expect(fixture.componentInstance.getProductPrice(product)).toBe('12.50 р.');
        expect(fixture.componentInstance.getProductPrice({ ...product, isPriceHidden: true })).toBe('Цена по запросу');
    });
});
