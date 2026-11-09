import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconsModule } from '../../../../shared/base/icons/icons.module';
import { ImageUrlPipe } from '../../../../shared/utils/image-url.pipe';
import { Subscription } from 'rxjs';
import { BannerModel } from '../../../../shared/models/banner.model';
import { BannerService } from '../../../../shared/services/banner.service';

@Component({
    selector: 'app-carousel',
    templateUrl: './carousel.component.html',
    styleUrls: ['./carousel.component.scss'],
    imports: [ImageUrlPipe, CommonModule, IconsModule, RouterModule],
})
export class CarouselComponent implements OnInit, OnDestroy {
    slides: BannerModel[] = [];
    private subscription?: Subscription;

    constructor(private bannerService: BannerService) {}

    puzzlePieces = Array(16)
        .fill(0)
        .map((_, i) => i);

    currentIndex = 0;
    private intervalId: number | null = null;
    isPaused = false;

    ngOnInit() {
        this.subscription = this.bannerService.getPublished().subscribe({
            next: response => {
                this.slides = response.data;
                this.currentIndex = 0;
                this.startAutoSlide();
            },
            error: () => {
                this.slides = [];
            },
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
        this.stopAutoSlide();
    }

    private startAutoSlide() {
        this.stopAutoSlide();
        // IMPORTANT TODO: enable auto slide
        // this.intervalId = window.setInterval(() => {
        //     if (!this.isPaused) {
        //         this.nextSlide();
        //     }
        // }, 5000);
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
