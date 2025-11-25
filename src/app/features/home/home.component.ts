import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconsModule } from '../../shared/base/icons/icons.module';
import { ProductCarouselComponent } from '../../shared/components/product-carousel/product-carousel.component';
import { AboutMeComponent } from './components/about-me/about-me.component';
import { BenefitsComponent } from './components/benefits/benefits.component';
import { BrandsComponent } from './components/brands/brands.component';
import { CarouselComponent } from './components/carousel/carousel.component';
import { ProductSearchComponent } from './components/product-search/product-search.component';

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
        ProductSearchComponent,
    ],
})
export class HomeComponent {
    isSearchOpen = false;
    isSearchVisible = true;
    private lastScrollTop = 0;
    private scrollThreshold = 50; // Минимальная прокрутка для срабатывания

    constructor(private cdr: ChangeDetectorRef) { }

    @HostListener('window:scroll', [])
    onWindowScroll(): void {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        // Всегда показываем кнопку в самом верху страницы
        if (currentScroll <= 100) {
            if (!this.isSearchVisible) {
                this.isSearchVisible = true;
                this.cdr.detectChanges();
            }
            this.lastScrollTop = currentScroll;
            return;
        }

        // Скрываем при прокрутке вниз, показываем при прокрутке вверх
        if (Math.abs(currentScroll - this.lastScrollTop) > this.scrollThreshold) {
            const shouldBeVisible = currentScroll < this.lastScrollTop;

            if (this.isSearchVisible !== shouldBeVisible) {
                this.isSearchVisible = shouldBeVisible;
                this.cdr.detectChanges();
            }

            this.lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
        }
    }

    @HostListener('document:keydown', ['$event'])
    handleKeyboardShortcut(event: KeyboardEvent): void {
        // Открываем поиск по нажатию / или Ctrl+K (Cmd+K на Mac)
        if (
            (event.key === '/' && !this.isInputFocused()) ||
            ((event.ctrlKey || event.metaKey) && event.key === 'k')
        ) {
            event.preventDefault();
            this.openSearch();
        }
    }

    openSearch(): void {
        this.isSearchOpen = true;
    }

    closeSearch(): void {
        this.isSearchOpen = false;
    }

    private isInputFocused(): boolean {
        const activeElement = document.activeElement;
        return (
            activeElement?.tagName === 'INPUT' ||
            activeElement?.tagName === 'TEXTAREA' ||
            activeElement?.getAttribute('contenteditable') === 'true'
        );
    }
}
