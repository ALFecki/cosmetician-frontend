import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NgbModal, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { OrderModel } from '../../models/order.model';
import { PersonModel } from '../../models/person.model';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { PersonService } from '../../services/person.service';
import { ToastService } from '../../services/toast.service';
import { AdminOrdersComponent } from '../admin-orders/admin-orders.component';
import { AdminOrderDetailsComponent } from './admin-order-details.component';

const time = new Date('2026-11-19T06:30:00Z');
const person: PersonModel = {
    id: 'customer',
    firstName: 'Старое имя',
    secondName: 'Из профиля',
    surname: null,
    email: 'profile@example.com',
    phone: '+375291111111',
    is_admin: false,
    is_moderator: false,
    isEmailVerified: false,
    createdAt: time,
    updatedAt: time,
};
const order: OrderModel = {
    id: 'order',
    orderId: '1042',
    personId: person.id,
    status: 'Checked',
    paymentStatus: 'Completed',
    paymentId: null,
    paymentFormUrl: null,
    totalPrice: 176,
    createdAt: time,
    updatedAt: time,
    products: [],
    deliveryMethod: 'post',
    deliveryDate: time,
    deliveryAddress: '',
    deliveryPostAddress: 'Отделение № 42',
    promoCodeId: null,
    discountAmount: 10,
    deliveryCost: 6,
    isCourierDelivery: false,
    paymentMethod: 'online',
    comment: 'Позвонить перед отправкой',
    contactSnapshot: {
        firstName: 'Мария',
        secondName: 'Примерова',
        email: null,
        phone: '+375292222222',
        phoneVerified: false,
        deliveryMethod: 'post',
        paymentMethod: 'online',
        isCourierDelivery: false,
        address: null,
        postPlacementId: 42,
        deliveryPostAddress: 'Отделение № 42',
        comment: 'Позвонить перед отправкой',
        offerConsent: true,
    },
};

describe('Admin order details', () => {
    let orderService: jasmine.SpyObj<OrderService>;
    let personService: jasmine.SpyObj<PersonService>;
    let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    let fixture: ComponentFixture<AdminOrderDetailsComponent>;

    beforeEach(() => {
        orderService = jasmine.createSpyObj<OrderService>('OrderService', ['getById', 'getAllMinimal', 'updateStatus']);
        personService = jasmine.createSpyObj<PersonService>('PersonService', ['getById']);
        orderService.getById.and.callFake(id => of({ status: 'success', data: { ...order, id } }));
        orderService.getAllMinimal.and.returnValue(of([{ ...order }]));
        personService.getById.and.returnValue(of({ status: 'success', data: person }));
        params = new BehaviorSubject(convertToParamMap({ id: order.id }));
        TestBed.configureTestingModule({
            imports: [AdminOrderDetailsComponent, AdminOrdersComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: params, snapshot: { queryParams: {} } } },
                { provide: OrderService, useValue: orderService },
                { provide: PersonService, useValue: personService },
                { provide: AuthService, useValue: { isAdmin: () => true } },
                { provide: ToastService, useValue: { show: jasmine.createSpy('show') } },
            ],
        });
        TestBed.inject(NgbModalConfig).animation = false;
    });

    afterEach(() => TestBed.inject(NgbModal).dismissAll());

    function openPage(): HTMLElement {
        fixture = TestBed.createComponent(AdminOrderDetailsComponent);
        fixture.detectChanges();
        return fixture.nativeElement;
    }

    function chooseStatus(root: ParentNode, value: string): void {
        const select = root.querySelector<HTMLSelectElement>('select')!;
        select.value = value;
        select.dispatchEvent(new Event('change'));
    }

    function saveButton(root: ParentNode): HTMLButtonElement {
        return Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent?.trim() === 'Сохранить')!;
    }

    it('shows the checkout snapshot, pickup point and amounts without a customer profile', () => {
        personService.getById.and.returnValue(throwError(() => new Error('Profile unavailable')));
        const page = openPage();
        expect(page.textContent).toContain('Мария Примерова');
        expect(page.textContent).toContain('Номер не подтверждён');
        expect(page.textContent).toContain('Отделение № 42');
        expect(page.textContent).toContain('Скидка');
        expect(page.textContent).toContain('Оплачено');
        expect(page.textContent).toContain('176');
        expect(page.querySelector<HTMLAnchorElement>('.order-navigation a')?.getAttribute('href')).toBe('/admin?section=orders');
    });

    it('uses the profile for older orders and still shows a load error for a missing order', () => {
        orderService.getById.and.returnValue(of({ status: 'success', data: { ...order, contactSnapshot: null } }));
        const page = openPage();
        expect(page.textContent).toContain('Старое имя Из профиля');
        expect(page.textContent).toContain('profile@example.com');

        orderService.getById.and.returnValue(throwError(() => new Error('Order unavailable')));
        params.next(convertToParamMap({ id: 'missing' }));
        fixture.detectChanges();
        expect(page.querySelector('[role="alert"]')?.textContent).toContain('Не удалось загрузить заказ');
        expect(page.textContent).not.toContain('Старое имя');
    });

    it('ignores a late profile from the preceding order after direct navigation', () => {
        const firstProfile = new Subject<{ status: string; data: PersonModel }>();
        const nextProfile = new Subject<{ status: string; data: PersonModel }>();
        const nextOrder = new Subject<{ status: string; data: OrderModel }>();
        orderService.getById.and.callFake(id =>
            id === order.id ? of({ status: 'success', data: { ...order, contactSnapshot: null } }) : nextOrder,
        );
        personService.getById.and.callFake(id => (id === person.id ? firstProfile : nextProfile));
        const page = openPage();
        params.next(convertToParamMap({ id: 'next' }));
        firstProfile.next({ status: 'success', data: person });
        nextOrder.next({ status: 'success', data: { ...order, id: 'next', personId: 'another', contactSnapshot: null } });
        fixture.detectChanges();
        expect(page.textContent).not.toContain(person.email!);
        nextProfile.next({ status: 'success', data: { ...person, firstName: 'Другой', secondName: 'Клиент', email: null } });
        fixture.detectChanges();
        expect(page.textContent).toContain('Другой Клиент');
    });

    it('only sends the status when saved and keeps the saved status visible on failure', async () => {
        const page = openPage();
        await fixture.whenStable();
        const update = new Subject<OrderModel | null>();
        orderService.updateStatus.and.returnValue(update);
        chooseStatus(page, 'Processing');
        fixture.detectChanges();
        expect(orderService.updateStatus).not.toHaveBeenCalled();
        const save = saveButton(page);
        expect(save).toBeDefined();
        if (!save) return;
        save.click();
        fixture.detectChanges();
        expect(save.disabled).toBeTrue();
        expect(page.querySelector('.order-navigation a')?.getAttribute('href')).toBeNull();
        expect(orderService.updateStatus).toHaveBeenCalledOnceWith(order.personId, order.id, 'Processing');
        update.next(null);
        update.complete();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(page.querySelector('[role="alert"]')?.textContent).toContain('Не удалось изменить статус');
        expect(page.querySelector('.order-status')?.textContent).toContain('Подтверждён');
        expect(save.disabled).toBeFalse();
    });

    it('opens the shared details from the list and reflects a saved status when closed', async () => {
        const list = TestBed.createComponent(AdminOrdersComponent);
        list.detectChanges();
        const row = list.nativeElement.querySelector('tbody tr') as HTMLElement;
        expect(row).not.toBeNull();
        row.querySelector<HTMLButtonElement>('[title="Подробности"]')!.click();
        list.detectChanges();
        await list.whenStable();
        const dialog = document.querySelector('ngb-modal-window');
        expect(dialog).not.toBeNull();
        if (!dialog) return;
        expect(dialog.querySelector('app-admin-order-details')).not.toBeNull();
        expect(dialog.textContent).toContain('Мария Примерова');
        expect(dialog.textContent).toContain('Отделение № 42');
        orderService.updateStatus.and.returnValue(of({ ...order, status: 'InDelivery' }));
        chooseStatus(dialog, 'InDelivery');
        await list.whenStable();
        const save = saveButton(dialog);
        expect(save).toBeDefined();
        if (!save) return;
        save.click();
        await list.whenStable();
        list.detectChanges();
        expect(orderService.updateStatus).toHaveBeenCalledOnceWith(order.personId, order.id, 'InDelivery');
        expect(dialog.querySelector('.order-status')?.textContent).toContain('В доставке');
        dialog.querySelector<HTMLButtonElement>('[aria-label="Закрыть"]')!.click();
        await list.whenStable();
        list.detectChanges();
        expect(row.textContent).toContain('В доставке');

        list.componentInstance.setActiveTab('checked');
        list.detectChanges();
        expect(list.nativeElement.querySelector('tbody tr')).toBeNull();
        list.componentInstance.setActiveTab('all');
        list.componentInstance.sortBy('status');
        list.detectChanges();
        expect(list.nativeElement.querySelector('tbody tr').textContent).toContain('В доставке');
    });

    it('updates the list when a quick-view save finishes after the dialog is closed', async () => {
        const list = TestBed.createComponent(AdminOrdersComponent);
        list.detectChanges();
        list.nativeElement.querySelector('[title="Подробности"]').click();
        list.detectChanges();
        await list.whenStable();
        const dialog = document.querySelector('ngb-modal-window')!;
        const update = new Subject<OrderModel | null>();
        orderService.updateStatus.and.returnValue(update);
        chooseStatus(dialog, 'Completed');
        await list.whenStable();
        saveButton(dialog).click();
        await list.whenStable();
        expect(orderService.updateStatus).toHaveBeenCalled();
        dialog.querySelector<HTMLButtonElement>('[aria-label="Закрыть"]')!.click();
        await list.whenStable();
        expect(document.querySelector('ngb-modal-window')).toBeNull();

        update.next({ ...order, status: 'Completed' });
        update.complete();
        await list.whenStable();
        list.detectChanges();
        expect(list.nativeElement.querySelector('tbody tr').textContent).toContain('Завершён');
    });
});
