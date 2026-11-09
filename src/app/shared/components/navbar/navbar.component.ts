import { ProductSearchComponent } from '../../../features/home/components/product-search/product-search.component';
import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
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
    imports: [CommonModule, RouterModule, IconsModule, ProductSearchComponent],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnDestroy, OnInit {
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
    ) {
        this.categories$ = this.categoryService.getCategoriesList();
        this.brands$ = this.brandService.getBrandsList();
    }

    ngOnInit() {
        this.navigationSubscription = this.router.events.subscribe(event => {
            if (event instanceof NavigationEnd) this.closeMenu();
        });
        this.authSubscribtion = this.authService.getCurrentUser().subscribe(user => {
            this.currentUser = user;
        });
    }

    ngOnDestroy() {
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
        this.closeMenu();
        this.isSearchOpen = true;
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
        this.isMenuOpen = !this.isMenuOpen;
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
        this.isMenuOpen = false;
        this.activeMenu = null;
    }

    toggleSection(section: 'care' | 'brands'): void {
        this.activeMenu = this.activeMenu === section ? null : section;
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        this.closeMenu();
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
