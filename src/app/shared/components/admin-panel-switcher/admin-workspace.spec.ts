import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '../../../../environments/environment';
import { AdminPanelSwitcherComponent } from './admin-panel-switcher.component';

const product = {
    id: 'p1',
    title: 'Крем',
    fullTitle: 'Крем для лица',
    description: 'Описание',
    image: '',
    brandId: 'b1',
    brand: { id: 'b1', title: 'SkinLab' },
    categories: [{ id: 'c1', title: 'Лицо' }],
    countries: [],
    productScopes: [],
    productTypeId: 't1',
    composition: 'Состав',
    methodOfUse: 'Утром',
    isPriceHidden: false,
    isDeleted: false,
    variants: [
        { id: 'v1', volume: 50, price: 40, costPrice: 20, isDeleted: false },
        { id: 'v2', volume: 100, price: 60, costPrice: 30, isDeleted: false },
        { id: 'v3', volume: 10, price: 5, costPrice: 2, isDeleted: true },
    ],
};

describe('Admin workspace', () => {
    let fixture: ComponentFixture<AdminPanelSwitcherComponent>;
    let component: AdminPanelSwitcherComponent;
    let http: HttpTestingController;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AdminPanelSwitcherComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: NgbModal, useValue: { open: jasmine.createSpy(), dismissAll: jasmine.createSpy() } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(AdminPanelSwitcherComponent);
        component = fixture.componentInstance;
        component.setupModelConfigs();
        spyOn(component, 'loadData');
        spyOn(component, 'loadMaintenanceStatus');
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => http.verify());

    it('searches the brand and combines archive/category filters before pagination', () => {
        component.currentModelData = [
            product,
            { ...product, id: 'p2', isDeleted: true },
            { ...product, id: 'p3', categories: [{ id: 'c2', title: 'Тело' }] },
        ];
        component.searchText = 'skinlab';
        component.productStatus = 'active';
        component.categoryFilter = 'c1';
        component.onSearchChange();
        expect(component.filteredData.map(item => item.id)).toEqual(['p1']);
        component.page = 3;
        component.clearSearch();
        expect(component.page).toBe(1);
    });
    it('derives prices and volumes only from active variants', () => {
        expect(component.productPrice(product)).toBe('от 40,00');
        expect(component.productVolumes(product)).toBe('50 · 100 мл');
        expect(component.productPrice({ ...product, variants: [] })).toBe('Нет вариантов');
        expect(component.productPrice({ ...product, isPriceHidden: true })).toBe('Скрыта');
    });
    it('opens an inline product editor and preserves unsaved data when leaving is cancelled', () => {
        component.editItem(product);
        expect(component.editorOpen).toBeTrue();
        expect(TestBed.inject(NgbModal).open).not.toHaveBeenCalled();
        component.itemForm.get('title')!.setValue('Изменено');
        component.itemForm.markAsDirty();
        spyOn(window, 'confirm').and.returnValue(false);
        component.switchModel('banners');
        expect(component.currentModel).toBe('products');
        expect(component.itemForm.value.title).toBe('Изменено');
    });
    it('keeps all fields on API failure and allows clearing optional product text', async () => {
        component.editItem(product);
        component.itemForm.patchValue({ composition: '', methodOfUse: '' });
        const saving = component.saveItem();
        const request = http.expectOne(`${environment.server_url}/product/p1`);
        expect(request.request.body.composition).toBe('');
        expect(request.request.body.methodOfUse).toBe('');
        expect(request.request.body.categoryIds).toBe('["c1"]');
        expect(request.request.body.isPriceHidden).toBeFalse();
        expect(request.request.body.variants).toBeUndefined();
        request.flush('Ошибка', { status: 500, statusText: 'Server error' });
        await saving;
        expect(component.editorOpen).toBeTrue();
        expect(component.itemForm.value.description).toBe('Описание');
        expect(component.error).toBeTruthy();
    });
    it('requires product type and sends false as the default price visibility when creating', () => {
        component.openAddModal();
        expect(component.itemForm.value.isPriceHidden).toBeFalse();
        expect(component.itemForm.get('productTypeId')!.hasError('required')).toBeTrue();
    });
    it('keeps entered text across editor tabs and disables fields during a save', () => {
        fixture.detectChanges();
        component.editItem(product);
        fixture.detectChanges();
        const input: HTMLInputElement = fixture.nativeElement.querySelector('#title');
        input.value = 'Новый заголовок';
        input.dispatchEvent(new Event('input'));
        component.editorTab = 'description';
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#composition').value).toBe('Состав');
        component.editorTab = 'main';
        component.saving = true;
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#title').value).toBe('Новый заголовок');
        expect(fixture.nativeElement.querySelector('fieldset').disabled).toBeTrue();
        expect(component.canLeave()).toBeFalse();
    });
    it('opens variants after successful creation and sends every required product field', async () => {
        component.openAddModal();
        component.itemForm.patchValue({ title: 'Крем', description: 'Описание', brandId: 'b1', categoryIds: ['c1'], productTypeId: 't1' });
        const saving = component.saveItem();
        const create = http.expectOne(`${environment.server_url}/product`);
        expect(create.request.body.isPriceHidden).toBeFalse();
        expect(create.request.body.countryIds).toBe('[]');
        expect(create.request.body.productScopeIds).toBe('[]');
        expect(create.request.body.productTypeId).toBe('t1');
        create.flush({ status: 'success', data: { id: 'p1' } });
        http.expectOne(`${environment.server_url}/product/p1`).flush({ status: 'success', data: product });
        await saving;
        expect(component.editorOpen).toBeTrue();
        expect(component.editorTab).toBe('prices');
        expect(component.currentProductId).toBe('p1');
    });
    it('ignores a product response after the selected editor changes', async () => {
        component.editItem(product);
        const reloading = component.reloadProductVariants();
        const request = http.expectOne(`${environment.server_url}/product/p1`);
        component.editItem({ ...product, id: 'p2', title: 'Другой товар' });
        request.flush({ status: 'success', data: { ...product, title: 'Поздний ответ' } });
        await reloading;
        expect(component.editingItem.id).toBe('p2');
        expect(component.itemForm.value.title).toBe('Другой товар');
    });
    it('does not switch sections or unload during variant deletion', async () => {
        component.editItem(product);
        const removing = component.removeVariant(0);
        const request = http.expectOne(`${environment.server_url}/product_variant/v1`);
        component.switchModel('banners');
        expect(component.currentModel).toBe('products');
        const event = new Event('beforeunload', { cancelable: true });
        component.beforeUnload(event as BeforeUnloadEvent);
        expect(event.defaultPrevented).toBeTrue();
        request.flush('failed', { status: 500, statusText: 'Server error' });
        await removing;
        expect(component.deletingVariant).toBeFalse();
        expect(component.editingItem.variants.length).toBe(3);
    });
    it('does not replace a newer section with an earlier list response', () => {
        component.loadMainData();
        const request = http.expectOne(req => req.url.endsWith('/product'));
        component.switchModel('banners');
        request.flush({ status: 'success', data: [product] });
        expect(component.currentModel).toBe('banners');
        expect(component.filteredData).toEqual([]);
    });
});
