import { Component, OnInit } from '@angular/core';
import { CategoryModel } from '../../models/category.model';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { CommonModule, NgFor } from '@angular/common';
import { CategoryService } from '../../services/category.service';
import { BrandModel } from '../../models/brand.model';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [NgFor, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  isMenuOpen = false;
  categories$!: Observable<CategoryModel[]>;
  brands$!: Observable<BrandModel[]>;

  constructor(private router: Router, private categoryService: CategoryService, private brandService: BrandService) {
    this.categoryService.getAll().subscribe((data) => {
      this.categories$ = of(data.data);
    });
    this.brandService.getAll().subscribe((data) => {
      this.brands$ = of(data.data);
    });
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
