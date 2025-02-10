import { Component } from '@angular/core';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss']
})
export class CarouselComponent {
  currentIndex = 0;
  slides = [
    { title: 'Слайд 1', image: 'assets/images/carousel1.jpg' },
    { title: 'Слайд 2', image: 'assets/images/carousel2.jpg' },
    { title: 'Слайд 3', image: 'assets/images/carousel3.jpg' },
  ];

  nextSlide() {
    this.currentIndex = (this.currentIndex + 1) % this.slides.length;
  }

  prevSlide() {
    this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
  }
}
