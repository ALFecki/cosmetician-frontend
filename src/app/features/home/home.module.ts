import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconsModule } from '../../shared/base/icons/icons.module';
import { ProductCarouselComponent } from '../../shared/components/product-carousel/product-carousel.component';
import { BenefitsComponent } from './components/benefits/benefits.component';
import { CarouselComponent } from './components/carousel/carousel.component';
import { HomeComponent } from './home.component';
import { BrandsComponent } from './components/brands/brands.component';

@NgModule({
    declarations: [HomeComponent, CarouselComponent, BenefitsComponent],
    imports: [CommonModule, RouterModule, IconsModule, ProductCarouselComponent, BrandsComponent],
    exports: [HomeComponent, CarouselComponent, BenefitsComponent],
})
export class HomeModule {}
