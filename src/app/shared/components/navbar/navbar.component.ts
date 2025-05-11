import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { catchError, Observable, of, Subscription, tap } from 'rxjs';
import { BrandModel } from '../../models/brand.model';
import { CategoryModel } from '../../models/category.model';
import { AuthService } from '../../services/auth.service';
import { BrandService } from '../../services/brand.service';
import { CartService } from '../../services/cart.service';
import { CategoryService } from '../../services/category.service';
import { CartComponent } from '../cart/cart.component';
import { LoginComponent } from '../login/login.component';
import { PersonModel } from '../../models/person.model';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.scss',
    standalone: true,
    imports: [CommonModule, RouterModule],
})
export class NavbarComponent {
    isMenuOpen = false;
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

    navigateToCart() {
        this.authSubscribtion = this.authService
            .checkAuth()
            .pipe(
                tap(user => {
                    if (user) {
                        this.modalService.dismissAll();
                        this.modalService.open(CartComponent, {
                            size: 'lg',
                            centered: true,
                            scrollable: true,
                        });
                    } else {
                        this.openLoginModal();
                    }
                }),
                catchError(() => {
                    this.openLoginModal();
                    return of(false);
                }),
            )
            .subscribe();
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
