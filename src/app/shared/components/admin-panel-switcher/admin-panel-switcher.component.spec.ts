import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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

describe('Article administration', () => {
    const url = environment.server_url + '/admin/articles';
    const publicUrl = environment.server_url + '/articles';
    const first = { id: 'db3f1dd6-abca-4eb3-955a-0e459607ae28', title: 'Первая', summary: '', publishedAt: null };
    const second = { id: 'f08b50cd-cce0-4567-9f60-f8d38dcb0f42', title: 'Вторая', summary: '', publishedAt: null };
    let fixture: ComponentFixture<AdminPanelSwitcherComponent>;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [AdminPanelSwitcherComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
        });
        fixture = TestBed.createComponent(AdminPanelSwitcherComponent);
        spyOn(fixture.componentInstance, 'loadData');
        spyOn(fixture.componentInstance, 'loadMaintenanceStatus');
        fixture.detectChanges();
        http = TestBed.inject(HttpTestingController);
        http.expectOne(environment.server_url + '/admin/catalog-prices').flush({ status: 'success', data: { enabled: false } });
    });

    afterEach(() => http.verify());

    function click(label: string) {
        const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
        const button = Array.from(buttons).find(control => control.textContent?.trim() === label);
        expect(button).withContext(label).toBeDefined();
        button?.click();
        fixture.detectChanges();
    }

    function enter(label: string, value: string) {
        const control = labeledControl<HTMLInputElement | HTMLTextAreaElement>(label)!;
        control.value = value;
        control.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    }

    function labeledControl<T extends HTMLElement>(label: string): T | undefined {
        const labels: NodeListOf<HTMLLabelElement> = fixture.nativeElement.querySelectorAll('label');
        return Array.from(labels).find(element => element.textContent?.trim() === label)?.control as T | undefined;
    }

    function upload(label: string, path: string) {
        const control = labeledControl<HTMLInputElement>(label);
        expect(control).withContext(label).toBeDefined();
        if (!control) return;
        const transfer = new DataTransfer();
        transfer.items.add(new File(['image'], 'photo.png', { type: 'image/png' }));
        control.files = transfer.files;
        control.dispatchEvent(new Event('change'));
        const request = http.expectOne(environment.server_url + '/upload/image');
        expect(request.request.method).toBe('POST');
        expect(request.request.body.get('file').name).toBe('photo.png');
        request.flush({ status: 'success', data: { path } });
        fixture.detectChanges();
    }

    it('publishes the selected draft and removes only its publication', () => {
        click('Статьи');
        http.expectOne(url).flush({ status: 'success', length: 2, data: [first, second] });
        fixture.detectChanges();
        click('Вторая');
        const body = 'Абзац\nЕщё один абзац';
        http.expectOne(`${url}/${second.id}`).flush({ status: 'success', data: { ...second, body } });
        fixture.detectChanges();

        click('Опубликовать');
        const publishing = http.expectOne(`${url}/${second.id}`);
        expect(publishing.request.method).toBe('PUT');
        expect(publishing.request.body).toEqual({ title: 'Вторая', summary: '', body, isPublished: true });
        const published = { ...second, publishedAt: '2026-11-23T10:00:00Z', body };
        publishing.flush({ status: 'success', data: published });
        http.expectOne(publicUrl).flush({ status: 'success', length: 1, data: [published] });
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('input[type="checkbox"]')).toBeNull();
        click('Вторая');
        http.expectOne(`${url}/${second.id}`).flush({ status: 'success', data: published });
        fixture.detectChanges();
        click('Снять с публикации');
        const unpublishing = http.expectOne(`${url}/${second.id}`);
        expect(unpublishing.request.method).toBe('PUT');
        expect(unpublishing.request.body).toEqual({ title: 'Вторая', summary: '', body, isPublished: false });
        unpublishing.flush({ status: 'success', data: { ...second, body } });
        http.expectOne(publicUrl).flush({ status: 'success', length: 0, data: [] });
    });

    it('keeps a new draft in the editor if saving fails', () => {
        click('Статьи');
        http.expectOne(url).flush({ status: 'success', length: 0, data: [] });
        fixture.detectChanges();
        click('Новая статья');
        enter('Заголовок', '  Черновик  ');

        click('Сохранить черновик');
        const saving = http.expectOne(url);
        expect(saving.request.method).toBe('POST');
        expect(saving.request.body).toEqual({ title: 'Черновик', summary: '', body: '', isPublished: false });
        saving.flush('Error', { status: 500, statusText: 'API failure' });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('input').value).toBe('  Черновик  ');
        expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
        http.expectNone(publicUrl);
    });

    it('uploads a cover and preserves text order and photo placement through edits and removal', () => {
        const coverImage = { image: '/images/00000000-0000-4000-8000-000000000001.jpg', alt: 'Обложка' };
        const oldImage = { image: '/images/00000000-0000-4000-8000-000000000002.png', alt: 'Старая иллюстрация', afterParagraph: 1 };
        const image = '/images/00000000-0000-4000-8000-000000000003.png';
        const article = {
            ...first,
            coverImage: null,
            featuredPosition: null,
            body: 'Первый абзац\r\n\u0085\r\n\uFEFF\nСледующий\nПоследний',
            bodyImages: [oldImage],
        };
        click('Статьи');
        http.expectOne(url).flush({ status: 'success', length: 1, data: [article] });
        fixture.detectChanges();
        click('Первая');
        http.expectOne(`${url}/${article.id}`).flush({ status: 'success', data: article });
        fixture.detectChanges();

        upload('Загрузить обложку', coverImage.image);
        enter('Описание обложки', coverImage.alt);
        click('Удалить иллюстрацию');
        const text = fixture.nativeElement.querySelector('textarea[id="article-body"]') as HTMLTextAreaElement;
        expect(text.value).toBe('Первый абзац\n\u0085\n\uFEFF\nСледующий\nПоследний');
        click('Добавить иллюстрацию');
        const placement = labeledControl<HTMLSelectElement>('Вставить после');
        expect(placement).toBeDefined();
        if (!placement) return;
        expect(placement.options.length).toBe(5);
        expect(placement.selectedIndex).toBe(4);
        expect(placement.options[3].textContent).toContain('Следующий');
        placement.selectedIndex = 3;
        placement.dispatchEvent(new Event('change'));
        upload('Выбрать файл', image);
        enter('Описание иллюстрации', 'Как нанести крем');
        enter('Подпись к иллюстрации', 'Дневной уход');
        enter('Текст после иллюстрации 1', 'Новый последний абзац');
        click('Сохранить черновик');
        const save = http.expectOne(`${url}/${article.id}`);
        const bodyImages = [{ image, alt: 'Как нанести крем', caption: 'Дневной уход', afterParagraph: 3 }];
        expect(save.request.body).toEqual({
            title: 'Первая',
            summary: '',
            body: 'Первый абзац\r\n\u0085\r\n\uFEFF\nСледующий\nНовый последний абзац',
            isPublished: false,
            media: { coverImage, bodyImages },
        });
        const updated = { ...article, coverImage, bodyImages, body: save.request.body.body };
        save.flush({ status: 'success', data: updated });
        http.expectOne(publicUrl).flush({ status: 'success', length: 0, data: [] });
        fixture.detectChanges();

        click('Первая');
        http.expectOne(`${url}/${article.id}`).flush({ status: 'success', data: updated });
        fixture.detectChanges();
        click('Удалить обложку');
        click('Сохранить черновик');
        const removal = http.expectOne(`${url}/${article.id}`);
        expect(removal.request.body.media).toEqual({ coverImage: null, bodyImages });
        expect(removal.request.body.body).toBe(updated.body);
        removal.flush({ status: 'success', data: { ...updated, coverImage: null } });
        http.expectOne(publicUrl).flush({ status: 'success', length: 0, data: [] });
    });

    it('previews unsaved text and an inline photo in reader order and resumes editing', () => {
        click('Статьи');
        http.expectOne(url).flush({ status: 'success', length: 0, data: [] });
        fixture.detectChanges();
        click('Новая статья');
        enter('Заголовок', 'Новый заголовок');
        enter('Краткое описание', 'Краткое описание статьи');
        enter('Текст статьи', 'Первый абзац\n\nВторой абзац');
        click('Предпросмотр');
        const reader: HTMLElement | null = fixture.nativeElement.querySelector('app-article-content article');
        expect(reader).toBeTruthy();
        if (!reader) return;
        expect(reader.querySelector('h1')?.textContent).toBe('Новый заголовок');
        expect(reader.textContent).toContain('Краткое описание статьи');
        click('Вернуться к редактированию');
        click('Добавить иллюстрацию');
        const placement = labeledControl<HTMLSelectElement>('Вставить после')!;
        placement.selectedIndex = 1;
        placement.dispatchEvent(new Event('change'));
        upload('Выбрать файл', '/images/00000000-0000-4000-8000-000000000004.png');
        enter('Описание иллюстрации', 'Флакон крема');
        enter('Подпись к иллюстрации', 'Дневной уход');
        click('Предпросмотр');
        const content: HTMLElement = fixture.nativeElement.querySelector('app-article-content article');
        const paragraphs = Array.from(content.querySelectorAll('p')).slice(-2);
        const figure = content.querySelector('figure')!;
        expect(paragraphs.map(paragraph => paragraph.textContent)).toEqual(['Первый абзац', 'Второй абзац']);
        expect(paragraphs[0].nextElementSibling).toBe(figure);
        expect(figure.nextElementSibling).toBe(paragraphs[1]);
        expect(figure.querySelector('img')?.alt).toBe('Флакон крема');
        expect(figure.querySelector('img')?.getAttribute('src')).toContain('/images/00000000-0000-4000-8000-000000000004.png');
        expect(figure.querySelector('figcaption')?.textContent).toBe('Дневной уход');
        http.expectNone(() => true);

        click('Редактор');
        expect(labeledControl<HTMLInputElement>('Заголовок')?.value).toBe('Новый заголовок');
        expect(labeledControl<HTMLTextAreaElement>('Текст после иллюстрации 1')?.value).toBe('\nВторой абзац');
        expect(labeledControl<HTMLInputElement>('Подпись к иллюстрации')?.value).toBe('Дневной уход');
        expect(fixture.nativeElement.querySelector('app-article-content')).toBeNull();
    });

    it('requires choosing the insertion position again when the paragraphs change', () => {
        click('Статьи');
        http.expectOne(url).flush({ status: 'success', length: 0, data: [] });
        fixture.detectChanges();
        click('Новая статья');
        enter('Текст статьи', 'Первый\nВторой');
        click('Добавить иллюстрацию');
        const placement = labeledControl<HTMLSelectElement>('Вставить после')!;
        expect(placement.selectedOptions[0].textContent).toContain('Второй');

        enter('Текст статьи', 'Новый\nПервый\nВторой');
        expect(placement.selectedOptions[0]?.textContent).toContain('Выберите позицию');
        const file = labeledControl<HTMLInputElement>('Выбрать файл')!;
        expect(file.disabled).toBeTrue();

        placement.selectedIndex = Array.from(placement.options).findIndex(option => option.textContent?.trim() === '3. Второй');
        placement.dispatchEvent(new Event('change'));
        fixture.detectChanges();
        expect(file.disabled).toBeFalse();
    });

    it('keeps the original body bytes when editing image metadata and removing an illustration', () => {
        const body = ' \r\nПервый абзац\r\nВторой абзац\r\n  ';
        const bodyImage = { image: '/images/00000000-0000-4000-8000-000000000001.jpg', alt: 'Иллюстрация', afterParagraph: 1 };
        const article = { ...first, body, coverImage: null, bodyImages: [bodyImage], featuredPosition: null };
        click('Статьи');
        http.expectOne(url).flush({ status: 'success', length: 1, data: [article] });
        fixture.detectChanges();

        click('Первая');
        http.expectOne(`${url}/${article.id}`).flush({ status: 'success', data: article });
        fixture.detectChanges();
        enter('Подпись к иллюстрации', 'Новая подпись');
        click('Сохранить черновик');
        const update = http.expectOne(`${url}/${article.id}`);
        const updated = { ...article, bodyImages: [{ ...bodyImage, caption: 'Новая подпись' }] };
        expect(update.request.body.body).toBe(body);
        expect(update.request.body.media).toEqual({ coverImage: null, bodyImages: updated.bodyImages });
        update.flush({ status: 'success', data: updated });
        http.expectOne(publicUrl).flush({ status: 'success', length: 0, data: [] });
        fixture.detectChanges();

        click('Первая');
        http.expectOne(`${url}/${article.id}`).flush({ status: 'success', data: updated });
        fixture.detectChanges();
        click('Удалить иллюстрацию');
        click('Сохранить черновик');
        const removal = http.expectOne(`${url}/${article.id}`);
        expect(removal.request.body.body).toBe(body);
        expect(removal.request.body.media).toEqual({ coverImage: null, bodyImages: [] });
        removal.flush({ status: 'success', data: { ...article, bodyImages: [] } });
        http.expectOne(publicUrl).flush({ status: 'success', length: 0, data: [] });
    });

    it('rejects publication when the existing body contains only whitespace', () => {
        const body = ' \r\n\u0085 ';
        click('Статьи');
        http.expectOne(url).flush({ status: 'success', length: 1, data: [first] });
        fixture.detectChanges();
        click('Первая');
        http.expectOne(`${url}/${first.id}`).flush({ status: 'success', data: { ...first, body } });
        fixture.detectChanges();

        click('Опубликовать');
        expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
        http.expectNone(`${url}/${first.id}`);
    });

    for (const legacyList of [false, true]) {
        it(`hides media uploads after a legacy response from ${legacyList ? 'the list' : 'article details'}`, () => {
            const coverSelector = '#article-cover-upload';
            click('Статьи');
            const listItem = legacyList ? first : { ...first, coverImage: null, featuredPosition: null };
            http.expectOne(url).flush({ status: 'success', length: 1, data: [listItem] });
            fixture.detectChanges();
            if (legacyList) {
                click('Новая статья');
            } else {
                click('Первая');
                http.expectOne(`${url}/${first.id}`).flush({ status: 'success', data: { ...first, body: 'Текст' } });
                fixture.detectChanges();
            }
            expect(fixture.nativeElement.querySelector(coverSelector)).toBeNull();
            const addIllustration: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
            expect(Array.from(addIllustration).some(button => button.textContent?.trim() === 'Добавить иллюстрацию')).toBeFalse();
        });
    }

    it('reloads the selection after a featured article is removed by another editor', () => {
        const date = '2026-11-23T10:00:00Z';
        const existing = { ...first, publishedAt: date, coverImage: null, featuredPosition: 1 };
        const removed = { ...second, publishedAt: date, coverImage: null, featuredPosition: null };
        click('Статьи');
        http.expectOne(url).flush({ status: 'success', length: 2, data: [existing, removed] });
        fixture.detectChanges();
        const choices: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
        choices[1].click();
        fixture.detectChanges();
        click('Сохранить подборку');
        http.expectOne(url + '/featured').flush('Invalid article', { status: 400, statusText: 'Bad Request' });
        http.expectOne(url).flush({ status: 'success', length: 1, data: [existing] });
        fixture.detectChanges();
        const remaining: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
        expect(remaining.length).toBe(1);
        expect(remaining[0].checked).toBeTrue();
        expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
        http.expectNone(publicUrl);
    });

    it('hides the selection when the API rolls back while the article list is open', () => {
        const article = { ...first, publishedAt: '2026-11-23T10:00:00Z' };
        click('Статьи');
        http.expectOne(url).flush({ status: 'success', length: 1, data: [{ ...article, coverImage: null, featuredPosition: null }] });
        fixture.detectChanges();
        const choice: HTMLInputElement = fixture.nativeElement.querySelector('input[type="checkbox"]');
        choice.click();
        fixture.detectChanges();
        click('Сохранить подборку');
        http.expectOne(url + '/featured').flush('Not found', { status: 404, statusText: 'Not Found' });
        http.expectOne(url).flush({ status: 'success', length: 1, data: [article] });
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('#admin-featured-heading')).toBeNull();
        expect(fixture.nativeElement.querySelector('.article-list')?.textContent).toContain(article.title);
        http.expectNone(publicUrl);
    });

    it('saves no more than three published articles in selection order and can clear them', () => {
        const date = '2026-11-23T10:00:00Z';
        const thirdId = '90ba97b2-c1ff-477b-a99f-8a650b0db8a0';
        const items = [
            { ...first, publishedAt: date, featuredPosition: null, coverImage: null },
            { ...second, publishedAt: date, featuredPosition: null, coverImage: null },
            { ...first, id: thirdId, title: 'Третья', publishedAt: date, featuredPosition: null, coverImage: null },
            {
                ...first,
                id: '64882815-e06e-4bb1-8b53-f4029d9fdb4e',
                title: 'Четвёртая',
                publishedAt: date,
                featuredPosition: null,
                coverImage: null,
            },
            { ...first, id: 'ec174ca5-cb36-45d0-86ed-7a59e521cfef', title: 'Черновик', featuredPosition: null, coverImage: null },
        ];
        click('Статьи');
        http.expectOne(url).flush({ status: 'success', length: items.length, data: items });
        fixture.detectChanges();
        const selection = Array.from(fixture.nativeElement.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
        expect(selection.length).toBe(4);
        for (const index of [2, 0, 1]) {
            selection[index].click();
            fixture.detectChanges();
        }
        expect(selection[3].disabled).toBeTrue();
        click('Сохранить подборку');
        const update = http.expectOne(url + '/featured');
        expect(update.request.method).toBe('PUT');
        expect(update.request.body).toEqual({ ids: [thirdId, first.id, second.id] });
        update.flush({ status: 'success', data: update.request.body });
        http.expectOne(publicUrl).flush({ status: 'success', length: 0, data: [] });
        fixture.detectChanges();

        for (const index of [2, 0, 1]) {
            selection[index].click();
            fixture.detectChanges();
        }
        click('Сохранить подборку');
        const clear = http.expectOne(url + '/featured');
        expect(clear.request.body).toEqual({ ids: [] });
        clear.flush({ status: 'success', data: { ids: [] } });
        http.expectOne(publicUrl).flush({ status: 'success', length: 0, data: [] });
    });
});
