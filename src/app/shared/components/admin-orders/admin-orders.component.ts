import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IconsModule } from '../../base/icons/icons.module';
import { OrderMinimalModel, OrderModel } from '../../models/order.model';
import { PersonModel } from '../../models/person.model';
import { ProductModel } from '../../models/product.model';
import { OrderService } from '../../services/order.service';
import { PersonService } from '../../services/person.service';
import { ToastService } from '../../services/toast.service';
import { ImageUrlPipe } from '../../utils/image-url.pipe';
import { ProductModalComponent } from '../product-modal/product-modal.component';

interface OrderMinimalWithUser extends OrderMinimalModel {
    user?: PersonModel;
}

interface OrderWithUser extends OrderModel {
    user?: PersonModel;
}

type SortField = 'id' | 'updatedAt' | 'totalPrice' | 'status' | 'user';
type SortDirection = 'asc' | 'desc';

@Component({
    selector: 'app-admin-orders',
    templateUrl: './admin-orders.component.html',
    styleUrl: './admin-orders.component.scss',
    imports: [CommonModule, FormsModule, ImageUrlPipe, IconsModule],
})
export class AdminOrdersComponent implements OnInit {
    orders$!: Observable<OrderMinimalWithUser[]>;
    filteredOrders$!: Observable<OrderMinimalWithUser[]>;
    loading = true;
    error: string | null = null;
    selectedOrder: OrderWithUser | null = null;
    updatingStatus = false;

    // Tab and filtering
    activeTab: 'all' | 'checked' = 'all';

    // Sorting
    sortField: SortField = 'updatedAt';
    sortDirection: SortDirection = 'desc';

    statusOptions = [
        { value: 'Checked', label: 'Подтвержден' },
        { value: 'Processing', label: 'В обработке' },
        { value: 'InDelivery', label: 'В доставке' },
        { value: 'Delivered', label: 'Доставлен' },
        { value: 'Completed', label: 'Завершен' },
        { value: 'Cancelled', label: 'Отменен' },
    ];

    constructor(
        private router: Router,
        private orderService: OrderService,
        private personService: PersonService,
        private toastService: ToastService,
        private modalService: NgbModal,
    ) {}

    ngOnInit(): void {
        this.loadOrders();
    }

    loadOrders(): void {
        this.loading = true;
        this.error = null;
        this.orderService.getAllMinimal().subscribe({
            next: orders => {
                const filteredOrders = orders.filter(order => order.status !== 'NotChecked');

                const personIds = Array.from(new Set(filteredOrders.map(order => order.personId).filter(id => id)));
                const personMap: Record<string, PersonModel> = {};

                const personRequests = personIds.map(id =>
                    this.personService.getById(id).pipe(
                        map(response => {
                            personMap[id] = response.data;
                        }),
                    ),
                );

                const ordersWithUsers$ = forkJoin(personRequests).pipe(
                    map(() => {
                        return filteredOrders.map(order => ({
                            ...order,
                            user: personMap[order.personId!],
                        }));
                    }),
                );

                this.orders$ = ordersWithUsers$.pipe(map(orders => this.sortOrders(orders)));

                this.updateFilteredOrders();
            },
            error: error => {
                this.error = 'Ошибка при загрузке заказов';
                console.error('Error loading orders:', error);
            },
            complete: () => {
                this.loading = false;
            },
        });
    }

    setActiveTab(tab: 'all' | 'checked'): void {
        this.activeTab = tab;
        this.updateFilteredOrders();
    }

    updateFilteredOrders(): void {
        if (!this.orders$) return;

        this.filteredOrders$ = this.orders$.pipe(
            map(orders => {
                let filtered = orders;

                if (this.activeTab === 'checked') {
                    filtered = orders.filter(order => order.status === 'Checked');
                }

                return filtered;
            }),
        );
    }

    sortBy(field: SortField): void {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }

        this.orders$ = this.orders$.pipe(map(orders => this.sortOrders(orders)));

        this.updateFilteredOrders();
    }

    private sortOrders(orders: OrderMinimalWithUser[]): OrderMinimalWithUser[] {
        return [...orders].sort((a, b) => {
            let aValue;
            let bValue;

            switch (this.sortField) {
                case 'id':
                    aValue = a.id;
                    bValue = b.id;
                    break;
                case 'updatedAt':
                    aValue = new Date(a.updatedAt);
                    bValue = new Date(b.updatedAt);
                    break;
                case 'totalPrice':
                    aValue = a.totalPrice;
                    bValue = b.totalPrice;
                    break;
                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                case 'user':
                    aValue = `${a.user?.firstName || ''} ${a.user?.secondName || ''}`.trim();
                    bValue = `${b.user?.firstName || ''} ${b.user?.secondName || ''}`.trim();
                    break;
                default:
                    aValue = a.updatedAt;
                    bValue = b.updatedAt;
            }

            if (aValue < bValue) {
                return this.sortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return this.sortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    getSortIcon(field: SortField) {
        if (this.sortField !== field) {
            return 'arrow-down-up';
        }
        return this.sortDirection === 'asc' ? 'arrow-up' : 'arrow-down';
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
    openOrderDetails(order: OrderMinimalWithUser, content: any): void {
        this.orderService
            .getById(order.id)
            .toPromise()
            .then(response => {
                this.selectedOrder = { ...response!.data, user: order.user };
            });
        this.modalService.open(content, { size: 'xl', centered: true });
    }

    openProductDetails(product: ProductModel) {
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            this.router.navigate([`/product/${product.id}`]);
        } else {
            this.modalService.dismissAll();
            const activeModal = this.modalService.open(ProductModalComponent, {
                size: 'lg',
                centered: true,
                scrollable: true,
            });
            activeModal.componentInstance.selectedProduct = product;
        }
    }

    viewOrderDetails(order: OrderMinimalWithUser): void {
        this.router.navigate(['/admin/order', order.id]);
    }

    copyOrderLink(order: OrderMinimalWithUser): void {
        const link = `${window.location.origin}/admin/order/${order.id}`;
        navigator.clipboard
            .writeText(link)
            .then(() => {
                this.toastService.show('Ссылка скопирована в буфер обмена', 'success');
            })
            .catch(() => {
                this.toastService.show('Не удалось скопировать ссылку', 'error');
            });
    }

    async updateOrderStatus(order: OrderMinimalModel, newStatus: string): Promise<void> {
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
        return order.products?.reduce((total, item) => total + item.historicalPrice * item.quantity, 0) || 0;
    }

    getOrderItemsCount(order: OrderModel): number {
        return order.products?.reduce((total, item) => total + item.quantity, 0) || 0;
    }

    getPaymentMethodText(method: string): string {
        switch (method?.toLowerCase()) {
            case 'card':
                return 'Банковская карта';
            case 'cash':
                return 'Наличные';
            case 'online':
                return 'Онлайн оплата';
            default:
                return 'Не указано';
        }
    }

    getDeliveryMethodText(method: string): string {
        switch (method?.toLowerCase()) {
            case 'standart':
                return 'Стандартная доставка';
            case 'post':
                return 'Европочта';
            case 'pickup':
                return 'Самовывоз';
            default:
                return 'Не указано';
        }
    }
}
