import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BenefitsComponent } from './components/benefits/benefits.component';
import { AboutMeComponent } from './components/about-me/about-me.component';
import { CarouselComponent } from './components/carousel/carousel.component';
import { BrandsComponent } from './components/brands/brands.component';
import { ProductCarouselComponent } from '../../shared/components/product-carousel/product-carousel.component';
import { RouterModule } from '@angular/router';
import { IconsModule } from '../../shared/base/icons/icons.module';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
    imports: [
        CommonModule,
        RouterModule,
        IconsModule,
        BenefitsComponent,
        AboutMeComponent,
        CarouselComponent,
        BrandsComponent,
        ProductCarouselComponent,
    ],
})
export class HomeComponent {}
