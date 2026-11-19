import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '../../../../environments/environment';
import { homeBannerId } from '../../models/banner.model';
import { AdminPanelSwitcherComponent } from './admin-panel-switcher.component';

describe('Banner administration', () => {
    let fixture: ComponentFixture<AdminPanelSwitcherComponent>;
    let component: AdminPanelSwitcherComponent;
    let http: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AdminPanelSwitcherComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: NgbModal, useValue: { dismissAll: jasmine.createSpy() } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(AdminPanelSwitcherComponent);
        component = fixture.componentInstance;
        component.setupModelConfigs();
        component.currentModel = 'banners';
        spyOn(component, 'loadData');
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('preserves false and zero and submits cleared optional fields', async () => {
        component.isEditMode = true;
        component.selectedItemId = 'banner-1';
        component.itemForm = component.buildForm({
            title: 'Слайд',
            image: '/images/banner.png',
            subtitle: 'Старый текст',
            buttonText: 'Каталог',
            buttonLink: '/products',
            sortOrder: 0,
            isActive: false,
        });
        expect(component.itemForm.value.isActive).toBeFalse();
        expect(component.itemForm.value.sortOrder).toBe(0);
        component.itemForm.patchValue({ subtitle: '', buttonText: '', buttonLink: '' });
        const saving = component.saveItem();
        const request = http.expectOne(`${environment.server_url}/admin/banner/banner-1`);
        expect(request.request.method).toBe('PATCH');
        expect(request.request.body).toEqual({
            title: 'Слайд',
            image: '/images/banner.png',
            subtitle: '',
            buttonText: '',
            buttonLink: '',
            sortOrder: 0,
            isActive: false,
        });
        request.flush({ status: 'success', data: {} });
        await saving;
        expect(component.loadData).toHaveBeenCalled();
    });

    it('edits the welcome banner with its line break and saves revised visibility', async () => {
        spyOn(component, 'loadMaintenanceStatus');
        fixture.detectChanges();
        const banner = {
            id: homeBannerId,
            title: 'Внимание к коже.\nЗабота о себе.',
            subtitle: 'Описание',
            image: 'assets/images/hero-still-life.jpg',
            buttonText: 'Найти свой уход',
            buttonLink: '/products',
            sortOrder: 0,
            isActive: true,
        };
        component.isEditMode = true;
        component.selectedItemId = banner.id;
        component.editingItem = banner;
        component.itemForm = component.buildForm(banner);
        const view = component.itemModal.createEmbeddedView({});
        view.detectChanges();
        const form = view.rootNodes.find((node: HTMLElement) => node.querySelector?.('textarea#title'));
        const title = form.querySelector('textarea#title') as HTMLTextAreaElement;
        expect(title.value).toBe(banner.title);
        title.value = 'Новый заголовок\nНовый акцент';
        title.dispatchEvent(new Event('input'));
        component.itemForm.patchValue({ isActive: false, sortOrder: 30 });

        const saving = component.saveItem();
        const request = http.expectOne(`${environment.server_url}/admin/banner/${homeBannerId}`);
        expect(request.request.method).toBe('PATCH');
        expect(request.request.body.title).toBe('Новый заголовок\nНовый акцент');
        expect(request.request.body.sortOrder).toBe(30);
        expect(request.request.body.isActive).toBeFalse();
        request.flush({ status: 'success', data: { ...banner, ...request.request.body } });
        await saving;
        view.destroy();
    });

    it('creates hidden banners and uploads the selected image through the existing API', fakeAsync(() => {
        component.itemForm = component.buildForm();
        expect(component.itemForm.value.isActive).toBeFalse();
        expect(component.itemForm.value.sortOrder).toBe(0);
        component.itemForm.patchValue({ title: 'Новый', sortOrder: '0' });
        const file = new File(['image'], 'banner.png', { type: 'image/png' });
        component.onFileSelected({ target: { files: [file] } } as unknown as Event, 'image');
        expect(component.itemForm.valid).toBeTrue();
        void component.saveItem();
        const upload = http.expectOne(`${environment.server_url}/upload/image`);
        expect(upload.request.body.get('file')).toBe(file);
        upload.flush({ status: 'success', data: { path: '/images/new.png' } });
        flushMicrotasks();
        const request = http.expectOne(`${environment.server_url}/admin/banner`);
        expect(request.request.body.image).toBe('/images/new.png');
        expect(request.request.body.sortOrder).toBe(0);
        expect(request.request.body.isActive).toBeFalse();
        request.flush({ status: 'success', data: {} });
        flushMicrotasks();
        expect(component.saving).toBeFalse();
    }));
    it('shows the API validation message without closing the form', async () => {
        component.itemForm = component.buildForm({ image: '/images/banner.png', sortOrder: 0, isActive: false });
        const saving = component.saveItem();
        http.expectOne(`${environment.server_url}/admin/banner`).flush('Укажите и текст, и ссылку кнопки', {
            status: 400,
            statusText: 'Bad Request',
        });
        await saving;
        expect(component.error).toBe('Укажите и текст, и ссылку кнопки');
        expect(component.loadData).not.toHaveBeenCalled();
    });
    it('renders a newly selected image without treating the File as a URL', () => {
        spyOn(component, 'loadMaintenanceStatus');
        fixture.detectChanges();
        component.itemForm = component.buildForm({ image: '/images/old.png', sortOrder: 0, isActive: false });
        component.onFileSelected({ target: { files: [new File(['image'], 'new.png')] } } as unknown as Event, 'image');
        const view = component.itemModal.createEmbeddedView({});
        expect(() => view.detectChanges()).not.toThrow();
        view.destroy();
    });

    for (const original of ['', '/images/old.png']) {
        it(`cancels the selected upload and restores ${original || 'the empty image'}`, () => {
            component.editingItem = original ? { image: original } : null;
            component.itemForm = component.buildForm({ image: original, sortOrder: 0, isActive: false });
            component.onFileSelected({ target: { files: [new File(['image'], 'new.png')] } } as unknown as Event, 'image');
            component.cancelFileSelection('image');
            expect(component.selectedFiles['image']).toBeUndefined();
            expect(component.filePreviewUrls['image']).toBeUndefined();
            expect(component.itemForm.value.image).toBe(original);
        });
    }
});
