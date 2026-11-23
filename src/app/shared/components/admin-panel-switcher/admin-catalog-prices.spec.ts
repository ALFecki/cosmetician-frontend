import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '../../../../environments/environment';
import { AdminPanelSwitcherComponent } from './admin-panel-switcher.component';

const baseUrl = environment.server_url + '/admin/catalog-prices';
const receiptStorageKey = 'skviderm.admin.catalog-prices.pending';
const brands = [
    { id: 'brand-a', title: 'SkViDerm', isDeleted: false },
    { id: 'brand-b', title: 'Другой бренд', isDeleted: false },
    { id: 'brand-archive', title: 'Архивный бренд', isDeleted: true },
];
const products = [
    { id: 'product-a', title: 'Крем', fullTitle: 'Крем для лица', brandId: 'brand-a', brand: brands[0], isDeleted: false, variants: [] },
    {
        id: 'product-b',
        title: 'Сыворотка',
        fullTitle: 'Сыворотка для лица',
        brandId: 'brand-b',
        brand: brands[1],
        isDeleted: false,
        variants: [],
    },
    {
        id: 'archived',
        title: 'Архивный крем',
        fullTitle: 'Архивный крем для лица',
        brandId: 'brand-a',
        brand: brands[0],
        isDeleted: true,
        variants: [],
    },
];
const items = [
    { variantId: 'variant-a', productId: 'product-a', title: 'Крем', volume: 50, oldPriceCents: 9990, newPriceCents: 10490 },
    { variantId: 'variant-b', productId: 'product-b', title: 'Сыворотка', volume: 25, oldPriceCents: 1, newPriceCents: 1 },
];

describe('Bulk retail price adjustment', () => {
    let fixture: ComponentFixture<AdminPanelSwitcherComponent>;
    let http: HttpTestingController;

    beforeEach(async () => {
        sessionStorage.removeItem(receiptStorageKey);
        await createCatalog();
    });

    afterEach(() => {
        sessionStorage.removeItem(receiptStorageKey);
        http.verify();
    });

    async function createCatalog() {
        await TestBed.configureTestingModule({
            imports: [AdminPanelSwitcherComponent],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();
        TestBed.inject(NgbModalConfig).animation = false;
        fixture = TestBed.createComponent(AdminPanelSwitcherComponent);
        http = TestBed.inject(HttpTestingController);
        const component = fixture.componentInstance;
        spyOn(component, 'loadData');
        spyOn(component, 'loadMaintenanceStatus');
        component.currentModelData = products;
        fixture.detectChanges();
        const brandField = component.currentModelFields.find(field => field.key === 'brandId')!;
        brandField.options = brands;
        component.onSearchChange();
        detectChanges();
    }

    async function recreateCatalog() {
        fixture.destroy();
        http.verify();
        TestBed.resetTestingModule();
        await createCatalog();
    }

    function detectChanges() {
        fixture.detectChanges();
        TestBed.inject(ApplicationRef).tick();
    }

    function button(label: string): HTMLButtonElement | undefined {
        return Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(el => el.textContent?.trim() === label);
    }

    function click(label: string) {
        button(label)!.click();
        detectChanges();
    }

    function field(id: string): HTMLInputElement {
        return document.querySelector('#' + id)!;
    }

    function fill(id: string, value: string) {
        const input = field(id);
        input.value = value;
        input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
        detectChanges();
    }

    function open() {
        http.expectOne({ method: 'GET', url: baseUrl }).flush({ status: 'success', data: { enabled: true } });
        detectChanges();
        click('Изменить цены');
    }

    function selectBrand() {
        fill('bulk-price-scope', 'brand');
        fill('bulk-price-brand', 'brand-a');
    }

    function flushPreview(changedCount = 1) {
        const request = http.expectOne({ method: 'POST', url: baseUrl + '/preview' });
        request.flush({
            status: 'success',
            data: { operationId: 'operation', revision: 'revision', items: changedCount ? items : [items[1]], changedCount },
        });
        detectChanges();
        return request.request.body;
    }

    it('keeps the existing catalog controls when the server returns 404 for the capability', () => {
        http.expectOne({ method: 'GET', url: baseUrl }).flush(null, { status: 404, statusText: 'Not Found' });
        detectChanges();
        expect(button('Изменить цены')).toBeUndefined();
        expect(button('Добавить товар')?.disabled).toBeFalse();
    });

    it('selects active products across searches and displays each preview row with the server change count', () => {
        open();
        expect(document.activeElement?.id).toBe('bulk-price-scope');
        fill('bulk-price-search', 'skviderm');
        expect(document.querySelector('ngb-modal-window')?.textContent).not.toContain('Архивный крем');
        field('bulk-price-product-product-a').click();
        fill('bulk-price-search', 'Сыворотка');
        field('bulk-price-product-product-b').click();
        fill('bulk-price-percent', '+5,00');
        click('Рассчитать цены');

        expect(flushPreview()).toEqual({ productIds: ['product-a', 'product-b'], changeBasisPoints: 500 });
        const rows = Array.from(document.querySelectorAll('ngb-modal-window tbody tr'));
        expect(rows.length).toBe(2);
        const firstRow = rows[0].textContent!.replaceAll(/\s+/g, ' ');
        for (const text of ['Крем', '50 мл', '99,90 BYN', '104,90 BYN']) expect(firstRow).toContain(text);
        expect(rows[1].textContent).toContain('Сыворотка');
        expect(document.querySelector('ngb-modal-window [role="status"]')?.textContent).toContain('1 из 2');

        fill('bulk-price-percent', '-1.25');
        expect(document.querySelector('ngb-modal-window tbody')).toBeNull();
        expect(button('Применить цены')?.disabled).toBeTrue();
    });

    for (const [percent, basisPoints] of [
        ['0,01', 1],
        ['-100', -10000],
        ['+21474836.47', 2147483647],
    ] as const) {
        it(`sends the exact basis points for ${percent} and only the brand selector`, () => {
            open();
            selectBrand();
            fill('bulk-price-percent', percent);
            click('Рассчитать цены');
            expect(flushPreview()).toEqual({ brandId: 'brand-a', changeBasisPoints: basisPoints });
        });
    }

    it('rejects zero, excessive precision, exponent notation and values outside the supported range', () => {
        open();
        selectBrand();
        expect(document.querySelector('ngb-modal-window option[value="brand-archive"]')).toBeNull();
        for (const invalid of ['0', '-0.00', '+0,001', '-100,01', '21474836.48', '1e1']) {
            fill('bulk-price-percent', invalid);
            expect(button('Рассчитать цены')!.disabled).withContext(invalid).toBeTrue();
        }
        http.expectNone(baseUrl + '/preview');
    });

    it('cannot apply a preview with zero changed rows', () => {
        open();
        selectBrand();
        fill('bulk-price-percent', '0,01');
        click('Рассчитать цены');
        flushPreview(0);
        expect(button('Применить цены')?.disabled).toBeTrue();
        http.expectNone(baseUrl + '/apply');
    });

    it('discards a stale receipt and recalculates on request', () => {
        open();
        selectBrand();
        fill('bulk-price-percent', '5');
        click('Рассчитать цены');
        flushPreview();
        click('Применить цены');
        http.expectOne(baseUrl + '/apply').flush(null, { status: 409, statusText: 'Conflict' });
        detectChanges();

        expect(document.querySelector('ngb-modal-window [role="alert"]')?.textContent).toContain('Рассчитайте цены заново');
        expect(button('Применить цены')?.disabled).toBeTrue();
        click('Рассчитать цены');
        expect(flushPreview()).toEqual({ brandId: 'brand-a', changeBasisPoints: 500 });
    });

    it('prevents repeated submission and Escape during apply, retries the same receipt, and reloads prices after success', async () => {
        open();
        selectBrand();
        fill('bulk-price-percent', '5');
        click('Рассчитать цены');
        flushPreview();
        click('Применить цены');
        expect(button('Применить цены')?.disabled).toBeTrue();
        click('Применить цены');
        const modal = document.querySelector<HTMLElement>('ngb-modal-window')!;
        modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        detectChanges();
        expect(document.querySelector('ngb-modal-window')).not.toBeNull();
        const request = http.expectOne({ method: 'POST', url: baseUrl + '/apply' });
        expect(request.request.body).toEqual({
            brandId: 'brand-a',
            changeBasisPoints: 500,
            operationId: 'operation',
            revision: 'revision',
        });
        request.error(new ProgressEvent('error'));
        detectChanges();
        expect(field('bulk-price-percent').closest('fieldset')?.disabled).toBeTrue();
        expect(button('Рассчитать цены')?.disabled).toBeTrue();

        click('Закрыть');
        expect(document.querySelector('ngb-modal-window')).toBeNull();
        click('Изменить цены');
        click('Повторить подтверждение');
        const retry = http.expectOne(baseUrl + '/apply');
        expect(retry.request.body).toEqual(request.request.body);
        retry.flush({ status: 'success', data: { updatedCount: 1 } });

        http.expectOne(req => req.url.endsWith('/product') && req.params.get('includeDeleted') === 'true').flush({
            status: 'success',
            length: products.length,
            data: products,
        });
        detectChanges();
        expect(document.querySelector('ngb-modal-window')).toBeNull();
    });

    function applyBrandChange() {
        open();
        selectBrand();
        fill('bulk-price-percent', '5');
        click('Рассчитать цены');
        flushPreview();
        click('Применить цены');
        return http.expectOne({ method: 'POST', url: baseUrl + '/apply' });
    }

    it('keeps the same unresolved operation across catalog sections with storage unavailable', () => {
        spyOn(Storage.prototype, 'setItem').and.throwError('Storage unavailable');
        const request = applyBrandChange();
        request.error(new ProgressEvent('error'));
        detectChanges();

        click('Закрыть');
        fixture.componentInstance.switchModel('banners');
        detectChanges();
        fixture.componentInstance.switchModel('products');
        detectChanges();
        open();

        expect(document.querySelector('#bulk-price-percent')).toBeNull();
        click('Повторить подтверждение');
        const retry = http.expectOne(baseUrl + '/apply');
        expect(retry.request.body).toEqual(request.request.body);
        retry.flush(null, { status: 409, statusText: 'Conflict' });
        detectChanges();
        expect(button('Применить цены')?.disabled).toBeTrue();
        expect(document.querySelector('#bulk-price-percent')).not.toBeNull();
    });

    it('recovers an in-flight confirmation after reloading and retains it if the retry loses authorization', async () => {
        const request = applyBrandChange();
        await recreateCatalog();
        expect(request.cancelled).toBeTrue();
        fixture.componentInstance.error = 'Каталог не загрузился';
        detectChanges();

        open();
        expect(document.querySelector('#bulk-price-percent')).toBeNull();
        expect(button('Рассчитать цены')?.disabled).toBeTrue();
        click('Повторить подтверждение');
        const retry = http.expectOne(baseUrl + '/apply');
        expect(retry.request.body).toEqual(request.request.body);
        retry.flush(null, { status: 401, statusText: 'Unauthorized' });
        detectChanges();

        click('Закрыть');
        click('Изменить цены');
        click('Повторить подтверждение');
        const afterSignIn = http.expectOne(baseUrl + '/apply');
        expect(afterSignIn.request.body).toEqual(request.request.body);
        afterSignIn.flush(null, { status: 409, statusText: 'Conflict' });
        detectChanges();

        await recreateCatalog();
        open();
        expect(button('Повторить подтверждение')).toBeUndefined();
        expect(document.querySelector('#bulk-price-percent')).not.toBeNull();
    });

    it('starts a fresh price change after a definitive rejection of the first apply attempt', () => {
        applyBrandChange().flush(null, { status: 403, statusText: 'Forbidden' });
        detectChanges();
        click('Закрыть');
        click('Изменить цены');
        expect(button('Повторить подтверждение')).toBeUndefined();
        expect(document.querySelector('#bulk-price-percent')).not.toBeNull();
    });
});
