import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AdminPanelSwitcherComponent } from './admin-panel-switcher.component';

const api = environment.server_url;
const promotionsUrl = api + '/admin/promotion';
const product = {
    id: 'p1',
    title: 'Крем',
    fullTitle: 'Увлажняющий крем',
    brandTitle: 'SkinLab',
    priceCents: 4000,
};

describe('Promotion administration', () => {
    let fixture: ComponentFixture<AdminPanelSwitcherComponent>;
    let http: HttpTestingController;
    let root: HTMLElement;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [AdminPanelSwitcherComponent],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        fixture = TestBed.createComponent(AdminPanelSwitcherComponent);
        root = fixture.nativeElement;
        http = TestBed.inject(HttpTestingController);
        const loadData = spyOn(fixture.componentInstance, 'loadData');
        spyOn(fixture.componentInstance, 'loadMaintenanceStatus');
        fixture.detectChanges();
        http.expectOne(api + '/admin/catalog-prices').flush(null, { status: 404, statusText: 'Not Found' });
        loadData.and.callThrough();
    });

    afterEach(() => http.verify());

    function enterPromotions(): void {
        fixture.componentInstance.switchModel('promotions');
        fixture.detectChanges();
    }

    function clickButton(label: string): void {
        const button = Array.from(root.querySelectorAll('button')).find(item => item.textContent?.trim() === label);
        expect(button).withContext(label).toBeDefined();
        button!.click();
        fixture.detectChanges();
    }

    function enterValue(name: string, value: string): void {
        const input = root.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    }

    it('keeps the legacy Promotions editor when the new route returns 404', () => {
        enterPromotions();
        http.expectOne(promotionsUrl).flush('not found', { status: 404, statusText: 'Not Found' });
        http.expectOne(request => request.url === api + '/product').flush({ status: 'success', length: 0, data: [] });
        http.expectOne(request => request.url === api + '/promotion').flush({
            status: 'success',
            length: 1,
            data: [
                {
                    id: 'old',
                    title: 'Старая акция',
                    discountType: 'percentage',
                    discountValue: 15,
                    targetType: 'all',
                    productIds: [],
                    validFrom: '2026-11-01T09:00:00Z',
                    validUntil: '2099-01-01T09:00:00Z',
                    isActive: true,
                },
            ],
        });
        fixture.detectChanges();
        expect(root.querySelector('app-generic-table')).toBeTruthy();
    });

    it('shows a retry on server failure while leaving the Promocodes tab available', () => {
        enterPromotions();
        http.expectOne(promotionsUrl).flush('failed', { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();
        expect(root.querySelector('[role=alert]')?.textContent).toContain('Не удалось загрузить акции');
        http.expectNone(request => request.url === api + '/promotion');
        clickButton('Промокоды');
        http.expectOne(request => request.url === api + '/promo-code').flush({ status: 'success', length: 0, data: [] });
        fixture.detectChanges();
        expect(root.querySelector('h1')?.textContent).toContain('Промокоды');
    });

    it('saves a title-only draft with blank dates', () => {
        enterPromotions();
        http.expectOne(promotionsUrl).flush({ status: 'success', length: 0, data: [] });
        fixture.detectChanges();
        clickButton('Создать акцию');
        http.expectOne(promotionsUrl + '/products').flush({ status: 'success', length: 1, data: [product] });
        enterValue('title', 'Черновик');
        clickButton('Сохранить черновик');
        const save = http.expectOne({ method: 'POST', url: promotionsUrl });
        expect(save.request.body).toEqual({
            title: 'Черновик',
            targetType: 'all',
            productIds: [],
            discountType: 'percentage',
            discountValue: 0,
            validFrom: null,
            validUntil: null,
            isDraft: true,
            isActive: false,
        });
        save.flush({ status: 'success', data: { ...save.request.body, id: 'pending' } });
        fixture.detectChanges();
        expect(root.querySelector('tbody')?.textContent).toContain('Черновик');
    });

    it('searches products by brand, keeps selected names, and sends Minsk time with the campaign', fakeAsync(() => {
        enterPromotions();
        http.expectOne(promotionsUrl).flush({ status: 'success', length: 0, data: [] });
        fixture.detectChanges();
        clickButton('Создать акцию');
        http.expectOne(promotionsUrl + '/products').flush({ status: 'success', length: 1, data: [product] });
        root.querySelector<HTMLInputElement>('input[value=product]')!.click();
        fixture.detectChanges();
        clickButton('Добавить товары');
        enterValue('productSearch', 'Skin');
        enterValue('productSearch', 'SkinLab');
        http.expectNone(request => request.params.has('q'));
        tick(300);
        http.expectOne(request => request.url === promotionsUrl + '/products' && request.params.get('q') === 'SkinLab').flush({
            status: 'success',
            length: 1,
            data: [product],
        });
        fixture.detectChanges();
        const option = root.querySelector<HTMLButtonElement>('.product-option')!;
        expect(option.textContent).toContain('SkinLab');
        option.click();
        fixture.detectChanges();
        expect(root.querySelector('.product-chip')?.textContent).toContain('Увлажняющий крем');
        enterValue('title', 'Уход');
        enterValue('discountValue', '25');
        enterValue('validFrom', '2099-01-01T09:15');
        enterValue('validUntil', '2099-01-02T10:00');
        expect(root.querySelector('.price-total')?.textContent).toContain('30,00');
        clickButton('Запланировать');
        const save = http.expectOne({ method: 'POST', url: promotionsUrl });
        expect(save.request.body.productIds).toEqual(['p1']);
        expect(save.request.body.validFrom).toBe('2099-01-01T06:15:00.000Z');
        expect(save.request.body.validUntil).toBe('2099-01-02T07:00:00.000Z');
        expect(save.request.body.isActive).toBeTrue();
        save.flush({ status: 'success', data: { ...save.request.body, id: 'planned' } });
        fixture.detectChanges();
        expect(root.querySelector('tbody')?.textContent).toContain('Запланирована');
    }));

    it('restores chosen product names and previews the best sale at the planned start', () => {
        enterPromotions();
        http.expectOne(promotionsUrl).flush({
            status: 'success',
            length: 3,
            data: [
                {
                    id: 'edit',
                    title: 'Уход',
                    discountType: 'percentage',
                    discountValue: 25,
                    targetType: 'product',
                    productIds: ['p1'],
                    validFrom: '2099-01-02T05:00:00Z',
                    validUntil: '2099-01-04T08:00:00Z',
                    isDraft: true,
                    isActive: false,
                },
                {
                    id: 'other',
                    title: 'Акция с меньшим приоритетом',
                    priority: 1,
                    discountType: 'fixed',
                    discountValue: 15,
                    targetType: 'all',
                    productIds: [],
                    validFrom: '2099-01-01T09:00:00Z',
                    validUntil: '2099-01-03T09:00:00Z',
                    isDraft: false,
                    isActive: true,
                },
                {
                    id: 'more-important',
                    title: 'Другая акция',
                    priority: 2,
                    discountType: 'percentage',
                    discountValue: 37.5,
                    targetType: 'all',
                    productIds: [],
                    validFrom: '2099-01-01T09:00:00Z',
                    validUntil: '2099-01-03T09:00:00Z',
                    isDraft: false,
                    isActive: true,
                },
            ],
        });
        fixture.detectChanges();
        root.querySelector<HTMLButtonElement>('button[aria-label="Открыть акцию «Уход»"]')!.click();
        fixture.detectChanges();
        http.expectOne(promotionsUrl + '/products').flush({ status: 'success', length: 0, data: [] });
        http.expectOne(req => req.url === promotionsUrl + '/products' && req.params.get('ids') === 'p1').flush({
            status: 'success',
            length: 1,
            data: [product],
        });
        fixture.detectChanges();
        expect(root.querySelector('.product-chip')?.textContent).toContain('Увлажняющий крем');
        expect(root.querySelector('.price-total')?.textContent).toContain('25,00');
        expect(root.querySelector('[aria-live=polite]')?.textContent).toContain('Другая акция');
    });

    it('pauses a legacy campaign using its original targeting and exact timestamps', () => {
        const legacy = {
            id: 'legacy',
            title: 'Скидка на бренд',
            description: 'Исходное описание',
            targetType: 'brand',
            productIds: [],
            discountType: 'fixed',
            discountValue: 12.5,
            validFrom: '2026-11-17T06:15:07.001234Z',
            validUntil: '2099-01-02T07:00:05.000101Z',
            isDraft: false,
            isActive: true,
        };
        enterPromotions();
        http.expectOne(promotionsUrl).flush({ status: 'success', length: 1, data: [legacy] });
        fixture.detectChanges();
        clickButton('Открыть');
        expect(root.querySelector('input[name=title]')).toBeNull();
        clickButton('Выключить акцию');
        const pause = http.expectOne({ method: 'PUT', url: promotionsUrl + '/legacy' });
        expect(pause.request.body).toEqual({
            title: 'Скидка на бренд',
            targetType: 'brand',
            productIds: [],
            discountType: 'fixed',
            discountValue: 12.5,
            validFrom: '2026-11-17T06:15:07.001234Z',
            validUntil: '2099-01-02T07:00:05.000101Z',
            isDraft: false,
            isActive: false,
        });
        pause.flush({ status: 'success', data: { ...legacy, isActive: false } });
        fixture.detectChanges();
        expect(root.querySelector('tbody')?.textContent).toContain('Выключена');
    });

    it('uses the lowest current variant price with matching ordinary price and hides all price fields when requested', () => {
        const variants = [
            { id: 'v1', volume: 50, price: 40, costPrice: 22, isDeleted: false },
            {
                id: 'v2',
                volume: 100,
                price: 60,
                costPrice: 30,
                isDeleted: false,
                promotionPrice: { finalCents: 3000, savingCents: 3000, promotionId: 'promotion-1' },
            },
            {
                id: 'v3',
                volume: 10,
                price: 20,
                costPrice: 18,
                isDeleted: true,
                promotionPrice: { finalCents: 1000, savingCents: 1000, promotionId: 'promotion-1' },
            },
        ];
        fixture.componentInstance.currentModelData = [
            { id: 'p1', title: 'Крем', variants },
            { id: 'p2', title: 'Сыворотка', variants, isPriceHidden: true },
        ];
        fixture.componentInstance.applyFilters();
        fixture.detectChanges();
        const prices = root.querySelectorAll('.price-cell');
        expect(prices[0].textContent).toContain('от 30,00');
        expect(prices[0].querySelector('s')?.textContent).toContain('60,00');
        expect(prices[0].querySelector('.price-discount')?.textContent).toContain('−50%');
        expect(prices[1].textContent?.trim()).toBe('Скрыта');
    });
});
