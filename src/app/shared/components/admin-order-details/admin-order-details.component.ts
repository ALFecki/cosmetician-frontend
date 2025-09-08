import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { IconsModule } from '../../base/icons/icons.module';
import { OrderModel } from '../../models/order.model';
import { PersonModel } from '../../models/person.model';
import { ProductModel } from '../../models/product.model';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { PersonService } from '../../services/person.service';
import { ToastService } from '../../services/toast.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';
import { ProductModalComponent } from '../product-modal/product-modal.component';

@Component({
    selector: 'app-admin-order-details',
    templateUrl: './admin-order-details.component.html',
    styleUrl: './admin-order-details.component.scss',
    imports: [CommonModule, RouterModule, ImageUrlPipe, IconsModule]
})
export class AdminOrderDetailsComponent implements OnInit {
    order: BehaviorSubject<OrderModel | null> = new BehaviorSubject<OrderModel | null>(null);
    orderUser: BehaviorSubject<PersonModel | null> = new BehaviorSubject<PersonModel | null>(null);
    loading = true;
    error: string | null = null;
    updatingStatus = false;

    statusOptions = [
        { value: 'Checked', label: 'Подтвержден' },
        { value: 'Processing', label: 'В обработке' },
        { value: 'InDelivery', label: 'В доставке' },
        { value: 'Delivered', label: 'Доставлен' },
        { value: 'Completed', label: 'Завершен' },
        { value: 'Cancelled', label: 'Отменен' },
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private authService: AuthService,
        private orderService: OrderService,
        private personService: PersonService,
        private toastService: ToastService,
        private modalService: NgbModal,
    ) {}

    ngOnInit(): void {
        if (!this.authService.isAdmin()) {
            this.router.navigate(['/']);
            return;
        }

        this.loadOrderDetails();
    }

    loadOrderDetails(): void {
        this.loading = true;
        this.error = null;

        this.route.paramMap
            .pipe(
                switchMap(params => {
                    const orderId = params.get('id');
                    if (!orderId) {
                        throw new Error('Order ID is required');
                    }
                    return this.orderService.getById(orderId);
                }),
            )
            .subscribe({
                next: response => {
                    this.order.next(response.data);
                    this.loadOrderUser(response.data.personId);
                },
                error: error => {
                    this.error = 'Не удалось загрузить информацию о заказе: ' + (error.message || 'Неизвестная ошибка');
                    this.loading = false;
                },
            });
    }

    loadOrderUser(personId: string): void {
        if (!personId) {
            this.loading = false;
            return;
        }

        this.personService.getById(personId).subscribe({
            next: response => {
                this.orderUser.next(response.data);
                this.loading = false;
            },
            error: error => {
                console.error('Error loading user:', error);
                this.loading = false;
            },
        });
    }

    async updateOrderStatus(newStatus: string): Promise<void> {
        const currentOrder = this.order.value;
        if (this.updatingStatus || !currentOrder?.id) return;

        this.updatingStatus = true;
        try {
            await this.orderService.updateStatus(currentOrder.id, newStatus).toPromise();
            currentOrder.status = newStatus;
            this.order.next(currentOrder);
            this.toastService.show('Статус заказа успешно обновлен', 'success');
        } catch (error) {
            this.toastService.show('Ошибка при обновлении статуса заказа', 'error');
            console.error('Error updating order status:', error);
        } finally {
            this.updatingStatus = false;
        }
    }

    getOrderStatusClass(status: string): string {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'bg-success';
            case 'delivered':
                return 'bg-info';
            case 'indelivery':
                return 'bg-primary';
            case 'processing':
                return 'bg-warning';
            case 'checked':
                return 'bg-secondary';
            case 'cancelled':
                return 'bg-danger';
            default:
                return 'bg-light text-dark';
        }
    }

    getOrderStatusText(status: string): string {
        const option = this.statusOptions.find(opt => opt.value.toLowerCase() === status?.toLowerCase());
        return option ? option.label : status;
    }

    getTotalOrderValue(order: OrderModel): number {
        return order.products?.reduce((total, item) => total + item.historicalPrice * item.quantity, 0) || 0;
    }

    getOrderItemsCount(order: OrderModel): number {
        return order.products?.reduce((total, item) => total + item.quantity, 0) || 0;
    }

    goBackToAdmin(): void {
        this.router.navigate(['/admin']);
    }

    openProductDetails(product: ProductModel) {
        this.modalService.dismissAll();
        const activeModal = this.modalService.open(ProductModalComponent, {
            size: 'lg',
            centered: true,
            scrollable: true,
        });
        activeModal.componentInstance.selectedProduct = product;
    }
}
