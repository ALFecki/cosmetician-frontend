import { CommonModule, NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { BrandModel } from '../../models/brand.model';
import { CategoryModel } from '../../models/category.model';
import { BrandService } from '../../services/brand.service';
import { CategoryService } from '../../services/category.service';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [NgFor, CommonModule],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
    isMenuOpen = false;
    categories$!: Observable<CategoryModel[]>;
    brands$!: Observable<BrandModel[]>;

    constructor(
        private router: Router,
        private categoryService: CategoryService,
        private brandService: BrandService,
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
}
