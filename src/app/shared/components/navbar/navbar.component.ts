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
import { CartModalComponent } from '../cart-modal/cart-modal.component';
import { LoginComponent } from '../login/login.component';
import { ImageUrlPipe } from '../../utils/image-url.pipe';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.scss',
    standalone: true,
    imports: [CommonModule, RouterModule, IconsModule, ImageUrlPipe],
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
        public router: Router,
        private categoryService: CategoryService,
        private brandService: BrandService,
        private cartService: CartService,
        private readonly modalService: NgbModal,
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
        if (this.isMobile()) {
            this.router.navigate(['/cart']);
        } else {
            this.modalService.open(CartModalComponent, {
                size: 'lg',
                centered: true,
                backdrop: 'static',
                windowClass: 'cart-modal-window',
            });
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
