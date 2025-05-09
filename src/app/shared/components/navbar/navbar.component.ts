import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
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

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.scss',
    standalone: true,
    imports: [CommonModule],
})
export class NavbarComponent {
    isMenuOpen = false;
    categories$!: Observable<CategoryModel[]>;
    brands$!: Observable<BrandModel[]>;
    authService: AuthService = inject(AuthService);
    authSubscribtion: Subscription | null = null;

    constructor(
        public router: Router,
        private categoryService: CategoryService,
        private brandService: BrandService,
        private cartService: CartService,
        private readonly modalService: NgbModal,
    ) {
        this.categoryService.getAll().subscribe(data => {
            this.categories$ = of(data.data);
        });
        this.brandService.getAll().subscribe(data => {
            this.brands$ = of(data.data);
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

    navigateToCart() {
        this.authSubscribtion = this.authService
            .checkAuth()
            .pipe(
                tap(isAuth => {
                    if (isAuth) {
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
