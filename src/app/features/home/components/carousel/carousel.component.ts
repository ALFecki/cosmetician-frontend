import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, Input, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
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
    @Input() showIntro = false;
    slides: BannerModel[] = [];
    private subscription?: Subscription;
    private platformId = inject(PLATFORM_ID);

    constructor(private bannerService: BannerService) {}

    currentIndex = 0;
    private touchStartX = 0;
    private touchStartY = 0;
    get introOffset(): number {
        return this.showIntro ? 1 : 0;
    }
    get slideCount(): number {
        return this.slides.length + this.introOffset;
    }
    get slidePositions(): number[] {
        return Array.from({ length: this.slideCount }, (_, index) => index);
    }

    onTouchStart(event: TouchEvent): void {
        const touch = event.changedTouches[0];
        if (!touch) return;
        this.touchStartX = touch.screenX;
        this.touchStartY = touch.screenY;
    }

    onTouchEnd(event: TouchEvent): void {
        const touch = event.changedTouches[0];
        if (!touch) return;
        const horizontal = touch.screenX - this.touchStartX;
        const vertical = touch.screenY - this.touchStartY;
        if (Math.abs(horizontal) > 60 && Math.abs(horizontal) > Math.abs(vertical) * 1.3) {
            if (horizontal < 0) this.nextSlide();
            else this.prevSlide();
        }
    }
    private intervalId: number | null = null;
    isPaused = false;

    ngOnInit() {
        if (!isPlatformBrowser(this.platformId)) return;
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
        this.currentIndex = this.currentIndex === 0 ? this.slideCount - 1 : this.currentIndex - 1;
    }

    nextSlide() {
        this.currentIndex = this.currentIndex === this.slideCount - 1 ? 0 : this.currentIndex + 1;
    }

    getPreviousIndex(): number {
        return this.currentIndex === 0 ? this.slideCount - 1 : this.currentIndex - 1;
    }

    goToSlide(index: number) {
        if (index >= 0 && index < this.slideCount) this.currentIndex = index;
    }

    pauseCarousel() {
        this.isPaused = true;
    }

    resumeCarousel() {
        this.isPaused = false;
    }
}
