import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { homeBannerId } from '../../../../shared/models/banner.model';
import { CarouselComponent } from './carousel.component';

describe('Published homepage banners', () => {
    let fixture: ComponentFixture<CarouselComponent>;
    let http: HttpTestingController;
    const slide = {
        id: 'banner-1',
        image: '/images/banner.png',
        title: 'Новый слайд',
        subtitle: '',
        buttonText: 'Каталог',
        buttonLink: '/products',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CarouselComponent],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(CarouselComponent);
        fixture.detectChanges();
    });

    afterEach(() => http.verify());

    it('uses server content and resolves uploaded images in both layers', () => {
        http.expectOne(`${environment.server_url}/banner?home=true`).flush({ status: 'success', data: [slide], length: 1 });
        fixture.detectChanges();
        const element: HTMLElement = fixture.nativeElement;
        expect(element.querySelector('h2')?.textContent).toBe(slide.title);
        expect(element.querySelector('a')?.getAttribute('href')).toBe('/products');
        expect(element.querySelector('img')?.getAttribute('src')).toBe(`${environment.server_url}/images/banner.png`);
        expect(element.querySelector<HTMLElement>('.background-slide')?.style.backgroundImage).toContain(
            `${environment.server_url}/images/banner.png`,
        );
        expect(element.querySelector('.carousel-control')).toBeNull();
        expect(element.querySelector('.carousel-indicators')).toBeNull();
    });

    it('keeps only the selected banner accessible while navigating and wrapping', () => {
        http.expectOne(`${environment.server_url}/banner?home=true`).flush({
            status: 'success',
            length: 2,
            data: [slide, { ...slide, id: 'banner-2', title: 'Второй' }],
        });
        fixture.detectChanges();
        const element: HTMLElement = fixture.nativeElement;
        expect(element.querySelectorAll('.carousel-item[aria-hidden="false"]').length).toBe(1);
        element.querySelector<HTMLButtonElement>('.carousel-control-prev')!.click();
        fixture.detectChanges();
        expect(element.querySelector('.carousel-item[aria-hidden="false"] h2')?.textContent).toBe('Второй');
        element.querySelector<HTMLButtonElement>('.carousel-control-next')!.click();
        fixture.detectChanges();
        expect(element.querySelector('.carousel-item[aria-hidden="false"] h2')?.textContent).toBe(slide.title);
    });

    for (const failed of [false, true]) {
        it(`hides the carousel when the API is ${failed ? 'unavailable' : 'empty'}`, () => {
            const request = http.expectOne(`${environment.server_url}/banner?home=true`);
            if (failed) request.flush({}, { status: 503, statusText: 'Unavailable' });
            else request.flush({ status: 'success', data: [], length: 0 });
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.carousel')).toBeNull();
        });
    }

    it('navigates in server order and omits an empty button', () => {
        http.expectOne(`${environment.server_url}/banner?home=true`).flush({
            status: 'success',
            length: 2,
            data: [slide, { ...slide, id: 'banner-2', title: 'Второй', buttonText: '', buttonLink: '' }],
        });
        fixture.detectChanges();
        fixture.nativeElement.querySelector('.carousel-control-next').click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.carousel-item.active h2').textContent).toBe('Второй');
        expect(fixture.nativeElement.querySelector('.carousel-item.active a')).toBeNull();
    });
});

describe('Banner prerender', () => {
    it('never embeds changeable banners into static HTML', async () => {
        await TestBed.configureTestingModule({
            imports: [CarouselComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: PLATFORM_ID, useValue: 'server' }],
        }).compileComponents();
        const fixture = TestBed.createComponent(CarouselComponent);
        fixture.detectChanges();
        TestBed.inject(HttpTestingController).expectNone(`${environment.server_url}/banner?home=true`);
        expect(fixture.nativeElement.querySelector('.carousel')).toBeNull();
    });
});

@Component({
    standalone: true,
    imports: [CarouselComponent],
    template: `<app-carousel [homeBanner]="hero"></app-carousel>
        <ng-template #hero let-slide>
            <h2>{{ slide.title }}</h2>
            <p>{{ slide.subtitle }}</p>
            @if (slide.buttonText && slide.buttonLink) {
                <a [href]="slide.buttonLink">{{ slide.buttonText }}</a>
            }
        </ng-template>`,
})
class HeroHostComponent {}

describe('Editable home banner', () => {
    let fixture: ComponentFixture<HeroHostComponent>;
    let http: HttpTestingController;
    const hero = {
        id: homeBannerId,
        title: 'Обновлённый заголовок',
        subtitle: 'Текст из админки',
        image: '/images/hero.png',
        buttonText: 'Новый переход',
        buttonLink: '/updated',
        sortOrder: 0,
        isActive: true,
    };
    const second = {
        ...hero,
        id: 'second',
        title: 'Второй баннер',
        buttonLink: '/second',
        sortOrder: 20,
    };

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [HeroHostComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(HeroHostComponent);
        fixture.detectChanges();
    });
    afterEach(() => http.verify());

    function publish(slides = [hero, second]) {
        http.expectOne(`${environment.server_url}/banner?home=true`).flush({ data: slides, length: slides.length });
        fixture.detectChanges();
    }

    function active(): HTMLElement | null {
        return fixture.nativeElement.querySelector('.carousel-item[aria-hidden="false"]');
    }

    it('reserves the home layout while loading and clears it when the feed is empty', () => {
        expect(fixture.nativeElement.querySelector('.carousel-placeholder')).not.toBeNull();
        publish([]);
        expect(fixture.nativeElement.querySelector('.carousel-placeholder')).toBeNull();
        expect(fixture.nativeElement.querySelector('.carousel')).toBeNull();
    });

    it('renders edited content in the welcome layout exactly once and follows the saved order', () => {
        publish([second, { ...hero, sortOrder: 30 }]);
        expect(active()?.querySelector('h2')?.textContent).toBe(second.title);
        expect(fixture.nativeElement.querySelectorAll('.indicator').length).toBe(2);
        fixture.nativeElement.querySelector('.carousel-control-next').click();
        fixture.detectChanges();
        expect(active()?.classList.contains('intro-slide')).toBeTrue();
        expect(active()?.querySelector('h2')?.textContent).toBe(hero.title);
        expect(active()?.querySelector('p')?.textContent).toBe(hero.subtitle);
        expect(active()?.querySelector('a')?.getAttribute('href')).toBe(hero.buttonLink);
        fixture.nativeElement.querySelector('.carousel-control-next').click();
        fixture.detectChanges();
        expect(active()?.querySelector('h2')?.textContent).toBe(second.title);
    });

    it('accepts horizontal swipes while leaving vertical page scrolling alone', () => {
        publish();
        const carousel: HTMLElement = fixture.nativeElement.querySelector('.carousel');
        function touch(type: string, x: number, y: number) {
            const event = new Event(type);
            Object.defineProperty(event, 'changedTouches', { value: [{ screenX: x, screenY: y }] });
            carousel.dispatchEvent(event);
            fixture.detectChanges();
        }
        touch('touchstart', 200, 100);
        touch('touchend', 180, 250);
        expect(active()?.querySelector('h2')?.textContent).toBe(hero.title);
        touch('touchstart', 220, 100);
        touch('touchend', 100, 110);
        expect(active()?.querySelector('h2')?.textContent).toBe(second.title);
        touch('touchstart', 100, 100);
        touch('touchend', 220, 110);
        expect(active()?.querySelector('h2')?.textContent).toBe(hero.title);
    });

    it('omits the welcome slide and redundant controls when the welcome slide is hidden', () => {
        publish([second]);
        expect(active()?.querySelector('h2')?.textContent).toBe(second.title);
        expect(fixture.nativeElement.querySelector('.intro-slide')).toBeNull();
        expect(fixture.nativeElement.querySelector('.carousel-control')).toBeNull();
    });
});
