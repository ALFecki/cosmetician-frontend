import { ProductSearchComponent } from '../../../features/home/components/product-search/product-search.component';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, Subscription } from 'rxjs';
import { IconsModule } from '../../base/icons/icons.module';
import { BrandModel } from '../../models/brand.model';
import { CategoryModel } from '../../models/category.model';
import { PersonModel } from '../../models/person.model';
import { AuthService } from '../../services/auth.service';
import { BrandService } from '../../services/brand.service';
import { CartService } from '../../services/cart.service';
import { CategoryService } from '../../services/category.service';
import { FeedbackModalService } from '../../services/feedback-modal.service';
import { LoginModalService } from '../../services/login-modal.service';
import { CartModalComponent } from '../cart-modal/cart-modal.component';
import { LoginComponent } from '../login/login.component';

@Component({
    selector: 'app-navbar',
    imports: [CommonModule, RouterModule, IconsModule],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnDestroy, OnInit, AfterViewInit {
    @ViewChild('menuToggle') private menuToggle?: ElementRef<HTMLButtonElement>;
    isMobileNavigation = false;
    private headerObserver?: ResizeObserver;
    isMenuOpen = false;
    isSearchOpen = false;
    isScrolled = false;
    activeMenu: 'care' | 'brands' | null = null;
    private navigationSubscription?: Subscription;
    categories$!: Observable<CategoryModel[]>;
    brands$!: Observable<BrandModel[]>;
    authService: AuthService = inject(AuthService);
    authSubscribtion: Subscription | null = null;
    currentUser: PersonModel | null = null;

    constructor(
        private brandService: BrandService,
        private categoryService: CategoryService,
        private cartService: CartService,
        private readonly modalService: NgbModal,
        private router: Router,
        private loginModalService: LoginModalService,
        private feedbackModalService: FeedbackModalService,
        private host: ElementRef<HTMLElement>,
    ) {
        this.categories$ = this.categoryService.getCategoriesList();
        this.brands$ = this.brandService.getBrandsList();
    }

    ngOnInit() {
        this.onBreakpointChange();
        this.navigationSubscription = this.router.events.subscribe(event => {
            if (event instanceof NavigationEnd) this.closeMenu();
        });
        this.authSubscribtion = this.authService.getCurrentUser().subscribe(user => {
            this.currentUser = user;
        });
    }

    ngOnDestroy() {
        this.headerObserver?.disconnect();
        this.navigationSubscription?.unsubscribe();
        if (this.authSubscribtion) {
            this.authSubscribtion.unsubscribe();
        }
    }

    @HostListener('window:scroll', ['$event'])
    onWindowScroll() {
        this.isScrolled = window.scrollY > 50;
    }

    openSearch(): void {
        if (this.isSearchOpen) return;
        this.closeMenu();
        this.isSearchOpen = true;
        const modal = this.modalService.open(ProductSearchComponent, {
            size: 'lg',
            windowClass: 'storefront-search-window',
            ariaLabelledBy: 'storefront-search-title',
        });
        modal.componentInstance.closeSearch.subscribe(() => modal.close());
        modal.hidden.subscribe(() => {
            this.isSearchOpen = false;
        });
    }

    ngAfterViewInit(): void {
        if (typeof ResizeObserver === 'undefined') return;
        this.headerObserver = new ResizeObserver(() => {
            const shell = this.host.nativeElement.closest<HTMLElement>('.storefront');
            shell?.style.setProperty('--sf-header-height', `${this.host.nativeElement.getBoundingClientRect().height}px`);
        });
        this.headerObserver.observe(this.host.nativeElement);
    }

    @HostListener('window:resize')
    onBreakpointChange(): void {
        const mobile = typeof window !== 'undefined' && window.innerWidth <= 700;
        if (mobile !== this.isMobileNavigation) {
            const focusWasInside =
                typeof document !== 'undefined' &&
                !!this.host.nativeElement.querySelector('#storefront-navigation')?.contains(document.activeElement);
            this.closeMenu();
            this.isMobileNavigation = mobile;
            if (focusWasInside) {
                if (mobile) this.menuToggle?.nativeElement.focus();
                else this.host.nativeElement.querySelector<HTMLAnchorElement>('.category-nav a')?.focus();
            }
        }
    }

    @HostListener('document:keydown', ['$event'])
    handleSearchShortcut(event: KeyboardEvent): void {
        const active = document.activeElement;
        const isEditing =
            active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.getAttribute('contenteditable') === 'true';
        if ((event.key === '/' && !isEditing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) {
            event.preventDefault();
            this.openSearch();
        }
    }

    toggleMenu() {
        if (this.isMenuOpen) {
            this.closeMenu();
            this.menuToggle?.nativeElement.focus();
        } else this.isMenuOpen = true;
    }

    openLoginModal() {
        this.modalService.dismissAll();
        this.modalService.open(LoginComponent, {
            size: 'lg',
            centered: true,
            scrollable: true,
        });
    }

    openFeedbackModal() {
        this.feedbackModalService.openFeedbackModal();
    }

    getProductCount(): Observable<number> {
        return this.cartService.getProductCount();
    }

    getUserDisplayName(): string {
        if (this.currentUser) {
            return `${this.currentUser.firstName} ${this.currentUser.secondName}`;
        }
        return 'Гость';
    }

    private isMobile(): boolean {
        return window.innerWidth <= 768;
    }

    closeNavbarOnMobile(): void {
        this.closeMenu();
    }

    closeMenu(): void {
        const panel = this.host.nativeElement.querySelector('#storefront-navigation');
        const focusWasInside = typeof document !== 'undefined' && !!panel?.contains(document.activeElement);
        const trigger = this.isMobileNavigation
            ? this.menuToggle?.nativeElement
            : this.activeMenu
              ? this.host.nativeElement.querySelector<HTMLButtonElement>(
                    `button[aria-controls="${this.activeMenu === 'care' ? 'care-navigation' : 'brand-navigation'}"]`,
                )
              : null;
        this.isMenuOpen = false;
        this.activeMenu = null;
        if (focusWasInside) trigger?.focus();
    }

    toggleSection(section: 'care' | 'brands'): void {
        this.activeMenu = this.activeMenu === section ? null : section;
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        const trigger =
            this.isMobileNavigation && this.isMenuOpen
                ? this.menuToggle?.nativeElement
                : this.host.nativeElement.querySelector<HTMLButtonElement>(
                      `.category-nav button[aria-controls="${this.activeMenu === 'care' ? 'care-navigation' : 'brand-navigation'}"]`,
                  );
        const wasOpen = this.isMenuOpen || !!this.activeMenu;
        this.closeMenu();
        if (wasOpen) trigger?.focus();
    }

    navigateToCart(): void {
        if (this.authService.isLoggedIn()) {
            if (this.isMobile()) {
                this.router.navigate(['/cart']);
            } else {
                this.modalService.open(CartModalComponent, {
                    size: 'lg',
                    centered: true,
                    scrollable: true,
                });
            }
        } else {
            this.loginModalService.openLoginModal();
        }
    }

    navigateToProfile(): void {
        this.router.navigate(['/profile']);
    }

    async logout() {
        await this.cartService.syncOrder();
        this.authService.logout().subscribe(() => {
            this.router.navigate(['/']);
        });
        if (this.authSubscribtion) {
            this.authSubscribtion.unsubscribe();
        }
    }
}
