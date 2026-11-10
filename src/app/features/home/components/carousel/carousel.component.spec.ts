import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
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
        http.expectOne(`${environment.server_url}/banner`).flush({ status: 'success', data: [slide], length: 1 });
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
        http.expectOne(`${environment.server_url}/banner`).flush({
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
            const request = http.expectOne(`${environment.server_url}/banner`);
            if (failed) request.flush({}, { status: 503, statusText: 'Unavailable' });
            else request.flush({ status: 'success', data: [], length: 0 });
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.carousel')).toBeNull();
        });
    }

    it('navigates in server order and omits an empty button', () => {
        http.expectOne(`${environment.server_url}/banner`).flush({
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
        TestBed.inject(HttpTestingController).expectNone(`${environment.server_url}/banner`);
        expect(fixture.nativeElement.querySelector('.carousel')).toBeNull();
    });
});

@Component({
    standalone: true,
    imports: [CarouselComponent],
    template: `<app-carousel [showIntro]="true"
        ><div carouselIntro>
            <h1>Внимание к коже. Забота о себе.</h1>
            <a href="/products">Найти свой уход</a>
        </div></app-carousel
    >`,
})
class HeroHostComponent {}

describe('Approved main hero composition', () => {
    let fixture: ComponentFixture<HeroHostComponent>;
    let http: HttpTestingController;
    const slides = [
        {
            id: 'first',
            title: 'Первый серверный баннер',
            subtitle: 'Первый текст',
            image: '/images/first.png',
            buttonText: 'Первый переход',
            buttonLink: '/first',
        },
        {
            id: 'second',
            title: 'Второй серверный баннер',
            subtitle: 'Второй текст',
            image: '/images/second.png',
            buttonText: 'Второй переход',
            buttonLink: '/second',
        },
    ];
    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [HeroHostComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(HeroHostComponent);
        fixture.detectChanges();
    });
    afterEach(() => http.verify());
    function publish() {
        http.expectOne(`${environment.server_url}/banner`).flush({ data: slides, length: 2 });
        fixture.detectChanges();
    }
    function active(): HTMLElement | null {
        return fixture.nativeElement.querySelector('.carousel-item[aria-hidden="false"]');
    }
    it('starts with the introduction and cycles through live banners in server order', () => {
        publish();
        expect(active()?.querySelector('h1')?.textContent).toContain('Внимание к коже');
        expect(fixture.nativeElement.querySelectorAll('.indicator').length).toBe(3);
        fixture.nativeElement.querySelector('.carousel-control-next').click();
        fixture.detectChanges();
        expect(active()?.querySelector('h2')?.textContent).toBe(slides[0].title);
        expect(active()?.querySelector('a')?.getAttribute('href')).toBe('/first');
        fixture.nativeElement.querySelector('.carousel-control-next').click();
        fixture.detectChanges();
        expect(active()?.querySelector('h2')?.textContent).toBe(slides[1].title);
        fixture.nativeElement.querySelector('.carousel-control-next').click();
        fixture.detectChanges();
        expect(active()?.querySelector('h1')?.textContent).toContain('Внимание к коже');
        expect(fixture.nativeElement.querySelectorAll('.carousel-item[aria-hidden="false"]').length).toBe(1);
    });
    it('accepts horizontal swipes while leaving vertical page scrolling alone', () => {
        publish();
        const hero: HTMLElement = fixture.nativeElement.querySelector('.carousel');
        function touch(type: string, x: number, y: number) {
            const event = new Event(type);
            Object.defineProperty(event, 'changedTouches', { value: [{ screenX: x, screenY: y }] });
            hero.dispatchEvent(event);
            fixture.detectChanges();
        }
        touch('touchstart', 200, 100);
        touch('touchend', 180, 250);
        expect(active()?.querySelector('h1')?.textContent).toContain('Внимание к коже');
        touch('touchstart', 220, 100);
        touch('touchend', 100, 110);
        expect(active()?.querySelector('h2')?.textContent).toBe(slides[0].title);
        touch('touchstart', 100, 100);
        touch('touchend', 220, 110);
        expect(active()?.querySelector('h1')?.textContent).toContain('Внимание к коже');
    });
    for (const unavailable of [false, true]) {
        it(`retains the introduction without redundant controls when API is ${unavailable ? 'unavailable' : 'empty'}`, () => {
            const request = http.expectOne(`${environment.server_url}/banner`);
            if (unavailable) request.flush({}, { status: 503, statusText: 'Unavailable' });
            else request.flush({ data: [], length: 0 });
            fixture.detectChanges();
            expect(active()?.querySelector('h1')?.textContent).toContain('Внимание к коже');
            expect(fixture.nativeElement.querySelector('.carousel-control')).toBeNull();
        });
    }
});

describe('Main hero prerender', () => {
    it('keeps the introduction in static HTML without embedding changeable API banners', () => {
        TestBed.configureTestingModule({
            imports: [HeroHostComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: PLATFORM_ID, useValue: 'server' }],
        });
        const fixture = TestBed.createComponent(HeroHostComponent);
        fixture.detectChanges();
        TestBed.inject(HttpTestingController).expectNone(`${environment.server_url}/banner`);
        expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Внимание к коже');
        expect(fixture.nativeElement.querySelector('.carousel-control')).toBeNull();
    });
});
