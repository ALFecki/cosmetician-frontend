import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
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
