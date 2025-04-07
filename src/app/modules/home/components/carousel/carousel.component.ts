import { Component, OnDestroy, OnInit } from '@angular/core';

@Component({
    selector: 'app-carousel',
    templateUrl: './carousel.component.html',
    styleUrls: ['./carousel.component.scss'],
})
export class CarouselComponent implements OnInit, OnDestroy {
    currentIndex = 0;
    slides = [
        { title: 'Слайд 1', image: 'assets/images/carousel1.jpg' },
        { title: 'Слайд 2', image: 'assets/images/carousel2.jpg' },
        { title: 'Слайд 3', image: 'assets/images/carousel3.jpg' },
    ];
    interval: any;

    ngOnInit() {
        this.startAutoSlide();
    }

    ngOnDestroy() {
        this.stopAutoSlide();
    }

    startAutoSlide() {
        // this.interval = setInterval(() => {
        //   this.nextSlide();
        // }, 3000); // Переключение каждые 3 секунды
    }

    stopAutoSlide() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    nextSlide() {
        this.currentIndex = (this.currentIndex + 1) % this.slides.length;
    }

    prevSlide() {
        this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
    }

    goToSlide(index: number) {
        this.currentIndex = index;
    }
}
