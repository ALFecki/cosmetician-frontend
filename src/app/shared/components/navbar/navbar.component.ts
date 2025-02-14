import { Component, OnInit } from '@angular/core';
import { CategoryModel } from '../../models/category.model';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { CommonModule, NgFor } from '@angular/common';
import { CategoryService } from '../../services/category.service';
import { BrandModel } from '../../models/brand.model';

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

  constructor(private router: Router, private categoryService: CategoryService, private brandService: CategoryService) {
    this.categoryService.getAll().subscribe(data => {
      this.categories$ = data;
    });

    this.brandService.getAll().subscribe(data => {
      this.brands$ = data;
    });
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
