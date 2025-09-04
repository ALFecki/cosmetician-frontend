import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
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
import { LoginModalService } from '../../services/login-modal.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';
import { LoginComponent } from '../login/login.component';
import { CartModalComponent } from '../cart-modal/cart-modal.component';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterModule, ImageUrlPipe, IconsModule],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnDestroy, OnInit {
    isMenuOpen = false;
    isScrolled = false;
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
    ) {
        this.categories$ = this.categoryService.getCategoriesList();
        this.brands$ = this.brandService.getBrandsList();
        this.authService.getCurrentUser().subscribe(user => {
            if (user) {
                this.currentUser = user;
            }
        });
    }

    ngOnInit() {
        this.authSubscribtion = this.authService.getCurrentUser().subscribe(user => {
            this.currentUser = user;
        });
    }

    ngOnDestroy() {
        if (this.authSubscribtion) {
            this.authSubscribtion.unsubscribe();
        }
    }

    @HostListener('window:scroll', ['$event'])
    onWindowScroll() {
        this.isScrolled = window.scrollY > 50;
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
