import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { routes } from '../../app.routes';
import { MaintenanceGuard } from '../../shared/guards/maintenance.guard';

describe('Storefront article routes', () => {
    const url = environment.server_url + '/articles';
    const id = 'db3f1dd6-abca-4eb3-955a-0e459607ae28';
    const missingId = 'f08b50cd-cce0-4567-9f60-f8d38dcb0f42';

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter(routes.filter(route => route.path?.startsWith('articles'))),
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
});
