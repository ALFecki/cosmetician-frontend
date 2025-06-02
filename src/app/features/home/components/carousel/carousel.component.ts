import { Component, OnDestroy, OnInit } from '@angular/core';

interface Slide {
    image: string;
    title: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
}

@Component({
    selector: 'app-carousel',
    templateUrl: './carousel.component.html',
    styleUrls: ['./carousel.component.scss'],
})
export class CarouselComponent implements OnInit, OnDestroy {
    slides: Slide[] = [
        {
            image: 'assets/images/carousel1.jpg',
            title: 'Мы открылись!',
            subtitle: 'В первый месяц после открытия доставка БЕСПЛАТНО!',
            buttonText: 'Смотреть каталог',
            buttonLink: '/products',
        },
        {
            image: 'assets/images/carousel2.jpg',
            title: 'Профессиональные консультации',
            subtitle: 'Консультации проводит Скворцова Виктория, врач, к.м.н., практикующий косметолог',
            buttonText: 'Записаться на консультацию',
            buttonLink:
                'https://apnt.app/skvorcova_viktoriya3?fbclid=PAQ0xDSwKli-VleHRuA2FlbQIxMAABp6AV960erBxS8DMQpTuLAE_1JXXrza9KJW4KG3BwtMLX3rG2oVmGlWWGIyTH_aem_txkMk0eQ6Zj09wPmjRtNxg',
        },
        {
            image: 'assets/images/carousel3.jpg',
            title: 'Скоро в продаже',
            subtitle: 'Летние наборы для домашнего ухода',
            buttonText: 'Смотреть каталог',
            buttonLink: '/products',
        },
    ];

    puzzlePieces = Array(16)
        .fill(0)
        .map((_, i) => i);

    currentIndex = 0;
    private intervalId: number | null = null;
    isPaused = false;

    ngOnInit() {
        this.startAutoSlide();
    }

    ngOnDestroy() {
        this.stopAutoSlide();
    }

    private startAutoSlide() {
        this.stopAutoSlide();
        this.intervalId = window.setInterval(() => {
            if (!this.isPaused) {
                this.nextSlide();
            }
        }, 5000);
    }

    private stopAutoSlide() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    prevSlide() {
        this.currentIndex = this.currentIndex === 0 ? this.slides.length - 1 : this.currentIndex - 1;
    }

    nextSlide() {
        this.currentIndex = this.currentIndex === this.slides.length - 1 ? 0 : this.currentIndex + 1;
    }

    getPreviousIndex(): number {
        return this.currentIndex === 0 ? this.slides.length - 1 : this.currentIndex - 1;
    }

    goToSlide(index: number) {
        this.currentIndex = index;
    }

    pauseCarousel() {
        this.isPaused = true;
    }

    resumeCarousel() {
        this.isPaused = false;
    }
}
