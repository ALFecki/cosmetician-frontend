import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
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
});
