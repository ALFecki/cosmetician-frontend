import { Component, OnInit, OnDestroy } from '@angular/core';

interface Slide {
    image: string;
    title: string;
}

@Component({
    selector: 'app-carousel',
    templateUrl: './carousel.component.html',
    styleUrls: ['./carousel.component.scss'],
})
export class CarouselComponent implements OnInit, OnDestroy {
    slides: Slide[] = [
        { image: 'assets/images/carousel1.jpg', title: 'Slide 1' },
        { image: 'assets/images/carousel2.jpg', title: 'Slide 2' },
        { image: 'assets/images/carousel3.jpg', title: 'Slide 3' },
    ];

    currentIndex = 0;
    private intervalId: ReturnType<typeof setInterval> | null = null;

    ngOnInit() {
        this.startAutoSlide();
    }

    ngOnDestroy() {
        this.stopAutoSlide();
    }

    private startAutoSlide() {
        // this.stopAutoSlide();
        // this.intervalId = setTimeout(() => {
        //     this.nextSlide();
        // }, 500);
        // this.intervalId = setInterval(() => {
        //     this.nextSlide();
        // }, 5000);
    }

    private stopAutoSlide() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            // this.intervalId = null;
        }
    }

    prevSlide() {
        // this.stopAutoSlide();
        this.currentIndex = this.currentIndex === 0 ? this.slides.length - 1 : this.currentIndex - 1;
        // this.startAutoSlide();
    }

    nextSlide() {
        // this.stopAutoSlide();
        this.currentIndex = this.currentIndex === this.slides.length - 1 ? 0 : this.currentIndex + 1;
        // this.startAutoSlide();
    }

    goToSlide(index: number) {
        // this.stopAutoSlide();
        this.currentIndex = index;
        // this.startAutoSlide();
    }
}
