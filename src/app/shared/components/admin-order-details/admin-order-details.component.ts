import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { catchError, distinctUntilChanged, firstValueFrom, map, Observable, of, switchMap, tap } from 'rxjs';
import { IconsModule } from '../../base/icons/icons.module';
import { OrderMinimalModel, OrderModel } from '../../models/order.model';
import { PersonModel } from '../../models/person.model';
import { ProductModel } from '../../models/product.model';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { PersonService } from '../../services/person.service';
import { ToastService } from '../../services/toast.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';
import { ProductModalComponent } from '../product-modal/product-modal.component';
import { adminOrderStatuses, adminOrderStatusLabel } from './admin-order-status';

const deliveryMethods: Record<string, string> = {
    standart: 'Стандартная доставка',
    post: 'Европочта',
    pickup: 'Самовывоз',
};

const paymentMethods: Record<string, string> = {
    card: 'Картой при получении',
    cash: 'Наличными',
    online: 'Онлайн картой',
};

const paymentStatuses: Record<string, string> = {
    completed: 'Оплачено',
    pending: 'Ожидает оплаты',
    notpaid: 'Ожидает оплаты',
    processing: 'Обработка оплаты',
    failed: 'Ошибка оплаты',
};

@Component({
    selector: 'app-admin-order-details',
    templateUrl: './admin-order-details.component.html',
    styleUrl: './admin-order-details.component.scss',
    imports: [CommonModule, FormsModule, RouterLink, ImageUrlPipe, IconsModule],
})
export class AdminOrderDetailsComponent implements OnInit {
    @Input() orderId?: string;
    @Input() customer?: PersonModel;
    @Output() closeDetails = new EventEmitter<void>();
    @Input() onStatusSaved?: (order: OrderMinimalModel) => void;

    private readonly destroyRef = inject(DestroyRef);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    private readonly orderService = inject(OrderService);
    private readonly personService = inject(PersonService);
    private readonly toastService = inject(ToastService);
    private readonly modalService = inject(NgbModal);

    readonly orderStatuses = adminOrderStatuses;
    readonly statusLabel = adminOrderStatusLabel;
    order: OrderModel | null = null;
    contact: OrderModel['contactSnapshot'] | PersonModel = null;
    loading = true;
    error = '';
    statusError = '';
    selectedStatus = '';
    saving = false;

    ngOnInit(): void {
        if (!this.authService.isAdmin()) {
            this.router.navigate(['/']);
            return;
        }

        const ids = this.orderId ? of(this.orderId) : this.route.paramMap.pipe(map(params => params.get('id')));
        ids.pipe(
            distinctUntilChanged(),
            tap(() => {
                this.order = null;
                this.contact = null;
                this.loading = true;
                this.error = '';
                this.statusError = '';
            }),
            switchMap(id => {
                const order: Observable<OrderModel | null> = id
                    ? this.orderService.getById(id).pipe(map(response => response.data ?? null))
                    : of(null);
                return order.pipe(
                    catchError(() => of(null)),
                    tap(entry => {
                        this.loading = false;
                        this.order = entry;
                        if (!entry) {
                            this.error = 'Не удалось загрузить заказ';
                            return;
                        }
                        this.selectedStatus =
                            this.orderStatuses.find(option => option.value.toLowerCase() === entry.status.toLowerCase())?.value ??
                            entry.status;
                    }),
                    switchMap(entry => this.loadContact(entry)),
                );
            }),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe(contact => (this.contact = contact));
    }

    private loadContact(order: OrderModel | null): Observable<OrderModel['contactSnapshot'] | PersonModel> {
        if (!order) return of(null);
        if (order.contactSnapshot) return of(order.contactSnapshot);
        if (this.customer) return of(this.customer);
        if (!order.personId) return of(null);
        return this.personService.getById(order.personId).pipe(
            map(response => response.data),
            catchError(() => of(null)),
        );
    }

    get canSaveStatus(): boolean {
        return (
            !!this.order &&
            !this.saving &&
            this.order.status.toLowerCase() !== this.selectedStatus.toLowerCase() &&
            this.orderStatuses.some(option => option.value === this.selectedStatus)
        );
    }

    async saveStatus(): Promise<void> {
        const order = this.order;
        if (!order || !this.canSaveStatus) return;

        this.saving = true;
        this.statusError = '';
        try {
            const updatedOrder = await firstValueFrom(this.orderService.updateStatus(order.personId, order.id, this.selectedStatus));
            if (!updatedOrder) {
                if (this.order === order) this.statusError = 'Не удалось изменить статус заказа';
                return;
            }
            this.onStatusSaved?.(updatedOrder);
            if (this.order !== order || this.destroyRef.destroyed) return;
            this.order = { ...order, status: updatedOrder.status, updatedAt: updatedOrder.updatedAt };
            this.selectedStatus = updatedOrder.status;
        } catch {
            if (this.order === order) this.statusError = 'Не удалось изменить статус заказа';
        } finally {
            this.saving = false;
        }
    }

    async copyLink(order: OrderModel): Promise<void> {
        const path = this.router.serializeUrl(this.router.createUrlTree(['/admin/order', order.id]));
        try {
            await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
            this.toastService.show('Ссылка скопирована в буфер обмена', 'success');
        } catch {
            this.toastService.show('Не удалось скопировать ссылку', 'error');
        }
    }

    openProduct(product: ProductModel): void {
        this.modalService.dismissAll();
        if (window.innerWidth < 768) {
            this.router.navigate(['/product', product.id]);
            return;
        }
        const modal = this.modalService.open(ProductModalComponent, { size: 'lg', centered: true, scrollable: true });
        modal.componentInstance.selectedProduct = product;
    }

    getDeliveryMethod(method: string): string {
        return deliveryMethods[method?.toLowerCase()] ?? 'Не указан';
    }

    getPaymentMethod(method: string): string {
        return paymentMethods[method?.toLowerCase()] ?? 'Не указан';
    }

    getPaymentStatus(status: string): string {
        return paymentStatuses[status?.toLowerCase()] ?? 'Не указан';
    }
}
