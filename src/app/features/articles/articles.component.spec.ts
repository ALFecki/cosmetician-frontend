import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { routes } from '../../app.routes';
import { MaintenanceGuard } from '../../shared/guards/maintenance.guard';
import { ArticleService } from '../../shared/services/article.service';

describe('Storefront article routes', () => {
    const url = environment.server_url + '/articles';
    const id = 'db3f1dd6-abca-4eb3-955a-0e459607ae28';
    const olderId = 'af65abd8-1573-4253-9d9e-b888e880c67d';
    const missingId = 'f08b50cd-cce0-4567-9f60-f8d38dcb0f42';

    const coverImage = { image: '/images/00000000-0000-4000-8000-000000000001.jpg', alt: 'Обложка' };
    const bodyImage = { image: '/images/00000000-0000-4000-8000-000000000002.png', alt: 'Нанесение крема' };
    const published = { id, title: 'Уход за кожей', summary: 'Совет по уходу', publishedAt: '2026-11-20T10:00:00Z' };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter(routes.filter(route => route.path === '' || route.path?.startsWith('articles'))),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: MaintenanceGuard, useValue: { canActivate: () => true } },
            ],
        });
    });

    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('renders escaped paragraphs and clears the previous article for a missing link', async () => {
        const harness = await RouterTestingHarness.create();
        const http = TestBed.inject(HttpTestingController);
        const root = () => harness.routeNativeElement!;
        await harness.navigateByUrl('/articles/' + id);
        http.expectOne(url).flush({ status: 'success', length: 0, data: [] });
        http.expectOne(url + '/' + id).flush({
            status: 'success',
            data: {
                id,
                title: 'Уход за кожей',
                summary: '',
                body: 'Первый абзац\n\n<strong>Второй абзац</strong>',
                publishedAt: '2026-11-20T10:00:00Z',
            },
        });
        harness.detectChanges();
        const text = Array.from(root().querySelectorAll('article p')).map(paragraph => paragraph.textContent?.trim());
        expect(text).toEqual(['Первый абзац', '<strong>Второй абзац</strong>']);
        expect(root().querySelector('article strong')).toBeNull();

        await harness.navigateByUrl('/articles/' + missingId);
        expect(root().querySelector('article')).toBeNull();
        http.expectOne(url).flush({ status: 'success', length: 0, data: [] });
        http.expectOne(url + '/' + missingId).flush('Not found', { status: 404, statusText: 'Not Found' });
        harness.detectChanges();
        expect(root().querySelector('h1')?.textContent).toContain('Статья недоступна');
        expect(root().querySelector('a[href="/"]')).not.toBeNull();
        expect(root().querySelector('a[href="/articles"]')).toBeNull();
    });

    it('renders the cover and interleaves actual images after nonempty paragraphs, including stale positions', async () => {
        const harness = await RouterTestingHarness.create();
        const http = TestBed.inject(HttpTestingController);
        await harness.navigateByUrl('/articles/' + id);
        http.expectOne(url).flush({ status: 'success', length: 1, data: [published] });
        http.expectOne(url + '/' + id).flush({
            status: 'success',
            data: {
                ...published,
                body: 'Первый абзац\r\n  \r\u0085\n\uFEFF\r<em>Последний абзац</em>',
                coverImage,
                bodyImages: [
                    { ...bodyImage, afterParagraph: 0 },
                    { ...bodyImage, afterParagraph: 1, caption: 'Как использовать <em>крем</em>' },
                    { ...bodyImage, afterParagraph: 5 },
                ],
            },
        });
        harness.detectChanges();
        const root = harness.routeNativeElement!;
        const images = Array.from(root.querySelectorAll<HTMLImageElement>('article img'));
        expect(images.map(image => [image.getAttribute('src'), image.alt])).toEqual([
            [environment.server_url + coverImage.image, coverImage.alt],
            ...Array.from({ length: 3 }, () => [environment.server_url + bodyImage.image, bodyImage.alt]),
        ]);
        expect(Array.from(root.querySelectorAll('.article-body > *')).map(element => element.tagName)).toEqual([
            'FIGURE',
            'P',
            'FIGURE',
            'P',
            'P',
            'FIGURE',
        ]);
        expect(Array.from(root.querySelectorAll('.article-body > p')).map(element => element.textContent)).toEqual([
            'Первый абзац',
            '\uFEFF',
            '<em>Последний абзац</em>',
        ]);
        expect(root.querySelector('figcaption')?.textContent?.trim()).toBe('Как использовать <em>крем</em>');
        expect(root.querySelector('article em')).toBeNull();
    });

    for (const homepage of ['/', '/articles']) {
        it(`renders the appropriate article cards on ${homepage}`, async () => {
            const harness = await RouterTestingHarness.create();
            const http = TestBed.inject(HttpTestingController);
            const second = { ...published, id: missingId, title: 'Увлажнение', featuredPosition: 1, coverImage };
            const older = { ...published, id: olderId, title: 'Старая статья' };
            const draft = {
                ...published,
                id: 'ec174ca5-cb36-45d0-86ed-7a59e521cfef',
                title: 'Черновик',
                featuredPosition: 3,
                publishedAt: null,
            };
            const nav = TestBed.inject(ArticleService).hasPublished$.subscribe();
            await harness.navigateByUrl(homepage);
            if (homepage === '/') {
                http.match(request => request.url !== url).forEach(request => {
                    request.flush({ status: 'success', length: 0, data: [] });
                });
            }
            const root = harness.routeNativeElement!;
            expect(root.querySelector('#featured-articles-heading')).toBeNull();
            http.expectOne(url).flush({
                status: 'success',
                length: 4,
                data: [{ ...published, featuredPosition: 2 }, older, draft, second],
            });
            harness.detectChanges();

            const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="/articles/"]'));
            expect(links.map(link => link.getAttribute('href'))).toEqual(
                homepage === '/'
                    ? ['/articles/' + missingId, '/articles/' + id]
                    : ['/articles/' + id, '/articles/' + olderId, '/articles/' + missingId],
            );
            const heading = homepage === '/' ? 'h3' : 'h2';
            expect(links.map(link => link.querySelector(heading)?.textContent?.trim())).toEqual(
                homepage === '/' ? ['Увлажнение', 'Уход за кожей'] : ['Уход за кожей', 'Старая статья', 'Увлажнение'],
            );
            expect(root.querySelector<HTMLImageElement>('a[href="/articles/' + missingId + '"] img')?.alt).toBe('Обложка');
            if (homepage === '/') {
                expect(
                    root.querySelector('app-about-me + section[aria-labelledby="featured-articles-heading"] + app-benefits'),
                ).not.toBeNull();
                expect(root.querySelector('section[aria-labelledby="featured-articles-heading"] a[href="/articles"]')).not.toBeNull();

                await harness.navigateByUrl('/articles');
                http.expectOne(url).flush({ status: 'success', length: 1, data: [older] });
                await harness.navigateByUrl('/');
                http.match(request => request.url !== url).forEach(request => {
                    request.flush({ status: 'success', length: 0, data: [] });
                });
                http.expectOne(url).flush({ status: 'success', length: 1, data: [older] });
                harness.detectChanges();
                expect(harness.routeNativeElement!.querySelector('#featured-articles-heading')).toBeNull();
            }
            nav.unsubscribe();
        });
    }
});
