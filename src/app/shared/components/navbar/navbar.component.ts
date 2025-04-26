import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { BrandModel } from '../../models/brand.model';
import { CategoryModel } from '../../models/category.model';
import { BrandService } from '../../services/brand.service';
import { CategoryService } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
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

    constructor(
        public router: Router,
        private categoryService: CategoryService,
        private brandService: BrandService,
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

    logout() {
        this.authService.logout().subscribe(() => {
            this.router.navigate(['/']);
        });
    }
}
