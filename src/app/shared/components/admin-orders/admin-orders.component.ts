import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of } from 'rxjs';
import { OrderModel } from '../../models/order.model';
import { OrderService } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';
import { IconsModule } from '../../base/icons/icons.module';

@Component({
    selector: 'app-admin-orders',
    templateUrl: './admin-orders.component.html',
    styleUrl: './admin-orders.component.scss',
    standalone: true,
    imports: [CommonModule, FormsModule, ImageUrlPipe, IconsModule],
})
export class AdminOrdersComponent implements OnInit {
    orders$!: Observable<OrderModel[]>;
    loading = true;
    error: string | null = null;
    selectedOrder: OrderModel | null = null;
    updatingStatus = false;

    statusOptions = [
        { value: 'New', label: 'Новый' },
        { value: 'Checked', label: 'Подтвержден' },
        { value: 'Processing', label: 'В обработке' },
        { value: 'InDelivery', label: 'В доставке' },
        { value: 'Delivered', label: 'Доставлен' },
        { value: 'Completed', label: 'Завершен' },
        { value: 'Cancelled', label: 'Отменен' },
    ];

    constructor(
        private orderService: OrderService,
        private toastService: ToastService,
        private modalService: NgbModal,
    ) {}

    ngOnInit(): void {
        this.loadOrders();
    }

    loadOrders(): void {
        this.loading = true;
        this.error = null;
        this.orderService.getAll().subscribe({
            next: (orders) => {
                this.orders$ = of(orders.data.filter(order => order.status !== 'NotChecked'));
            },
            error: (error) => {
                this.error = 'Ошибка при загрузке заказов';
                console.error('Error loading orders:', error);
            },
            complete: () => {
                this.loading = false;
            }
        });
    }

    getOrderStatusClass(status: string): string {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'bg-success';
            case 'delivered':
                return 'bg-info';
            case 'shipped':
                return 'bg-primary';
            case 'processing':
                return 'bg-warning';
            case 'checked':
                return 'bg-secondary';
            case 'cancelled':
                return 'bg-danger';
            case 'new':
            default:
                return 'bg-light text-dark';
        }
    }

    getOrderStatusText(status: string): string {
        const option = this.statusOptions.find(opt => opt.value.toLowerCase() === status?.toLowerCase());
        return option ? option.label : status;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    openOrderDetails(order: OrderModel, content: any): void {
        this.selectedOrder = order;
        this.modalService.open(content, { size: 'xl', centered: true });
    }

    async updateOrderStatus(order: OrderModel, newStatus: string): Promise<void> {
        if (this.updatingStatus || !order.id) return;

        this.updatingStatus = true;
        try {
            await this.orderService.updateStatus(order.id, newStatus).toPromise();
            order.status = newStatus;
            this.toastService.show('Статус заказа успешно обновлен', 'success');
        } catch (error) {
            this.toastService.show('Ошибка при обновлении статуса заказа', 'error');
            console.error('Error updating order status:', error);
        } finally {
            this.updatingStatus = false;
        }
    }

    getTotalOrderValue(order: OrderModel): number {
        return order.products?.reduce((total, item) => total + (item.historicalPrice * item.quantity), 0) || 0;
    }

    getOrderItemsCount(order: OrderModel): number {
        return order.products?.reduce((total, item) => total + item.quantity, 0) || 0;
    }
}
