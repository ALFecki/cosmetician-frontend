import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../services/auth.service';
import { BrandService } from '../../services/brand.service';
import { CategoryService } from '../../services/category.service';
import { CartService } from '../../services/cart.service';
import { LoginModalService } from '../../services/login-modal.service';
import { FeedbackModalService } from '../../services/feedback-modal.service';

describe('Storefront navigation', () => {
    let component: NavbarComponent;
    let events: Subject<NavigationEnd>;
    beforeEach(() => {
        events = new Subject();
        TestBed.configureTestingModule({
            providers: [
                NavbarComponent,
                { provide: Router, useValue: { events, navigate: jasmine.createSpy('navigate') } },
                { provide: AuthService, useValue: { getCurrentUser: () => of(null) } },
                { provide: BrandService, useValue: { getBrandsList: () => of([]) } },
                { provide: CategoryService, useValue: { getCategoriesList: () => of([]) } },
                { provide: CartService, useValue: {} },
                { provide: NgbModal, useValue: {} },
                { provide: LoginModalService, useValue: {} },
                { provide: FeedbackModalService, useValue: {} },
            ],
        });
        TestBed.overrideComponent(NavbarComponent, { set: { template: '' } });
        component = TestBed.inject(NavbarComponent);
        component.ngOnInit();
    });
    afterEach(() => component.ngOnDestroy());
    it('opens the catalog search and closes navigation', () => {
        component.toggleMenu();
        component.openSearch();
        expect(component.isSearchOpen).toBeTrue();
        expect(component.isMenuOpen).toBeFalse();
    });
    it('opens search with the keyboard shortcut', () => {
        const fixture = TestBed.createComponent(NavbarComponent);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
        expect(fixture.componentInstance.isSearchOpen).toBeTrue();
        fixture.destroy();
    });
    it('closes the open menu after route navigation', () => {
        component.toggleMenu();
        events.next(new NavigationEnd(1, '/products', '/products'));
        expect(component.isMenuOpen).toBeFalse();
    });
    it('closes the menu on Escape', () => {
        const fixture = TestBed.createComponent(NavbarComponent);
        fixture.componentInstance.toggleMenu();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(fixture.componentInstance.isMenuOpen).toBeFalse();
        fixture.destroy();
    });
});
