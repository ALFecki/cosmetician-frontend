import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarouselComponent } from './components/carousel/carousel.component';
import { BenefitsComponent } from './components/benefits/benefits.component';



@NgModule({
  declarations: [CarouselComponent, BenefitsComponent],
  imports: [
    CommonModule
  ],
  exports: [CarouselComponent, BenefitsComponent]
})
export class HomeModule { }
