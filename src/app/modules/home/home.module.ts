import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BenefitsComponent } from './components/benefits/benefits.component';
import { CarouselComponent } from './components/carousel/carousel.component';
import { HomeComponent } from './home.component';

@NgModule({
    declarations: [HomeComponent, CarouselComponent, BenefitsComponent],
    imports: [CommonModule],
    exports: [CarouselComponent, BenefitsComponent],
})
export class HomeModule {}
