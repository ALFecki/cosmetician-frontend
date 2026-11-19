import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { catchError, forkJoin, map, Observable, of, shareReplay, take } from 'rxjs';
import { IconsModule } from '../../base/icons/icons.module';
import { OrderMinimalModel } from '../../models/order.model';
import { PersonModel } from '../../models/person.model';
import { OrderService } from '../../services/order.service';
import { PersonService } from '../../services/person.service';
import { ToastService } from '../../services/toast.service';
import { AdminOrderDetailsComponent } from '../admin-order-details/admin-order-details.component';
import { adminOrderStatuses, adminOrderStatusLabel } from '../admin-order-details/admin-order-status';

interface OrderMinimalWithUser extends OrderMinimalModel {
    user?: PersonModel;
}

type SortField = 'id' | 'updatedAt' | 'totalPrice' | 'status' | 'user';
type SortDirection = 'asc' | 'desc';

@Component({
    selector: 'app-admin-orders',
    templateUrl: './admin-orders.component.html',
    styleUrl: './admin-orders.component.scss',
    imports: [CommonModule, FormsModule, IconsModule, AdminOrderDetailsComponent],
})
export class AdminOrdersComponent implements OnInit {
    orders$!: Observable<OrderMinimalWithUser[]>;
    filteredOrders$!: Observable<OrderMinimalWithUser[]>;
    loading = true;
    error: string | null = null;
    selectedOrder: OrderMinimalWithUser | null = null;
    updatingStatus = false;

    // Tab and filtering
    activeTab: 'all' | 'checked' = 'all';

    // Sorting
    sortField: SortField = 'updatedAt';
    sortDirection: SortDirection = 'desc';

    readonly statusOptions = adminOrderStatuses;
    readonly getOrderStatusText = adminOrderStatusLabel;

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
                        catchError(() => of(undefined)),
                    ),
                );

                const profiles$ = personRequests.length ? forkJoin(personRequests) : of([]);
                this.orders$ = profiles$.pipe(
                    map(() => {
                        return filteredOrders.map(order => ({
                            ...order,
                            user: personMap[order.personId],
                        }));
                    }),
                    shareReplay({ bufferSize: 1, refCount: true }),
                );

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

                return this.sortOrders(filtered);
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

    openOrderDetails(order: OrderMinimalWithUser, content: TemplateRef<unknown>): void {
        this.selectedOrder = order;
        this.modalService.open(content, {
            size: 'xl',
            centered: true,
            scrollable: true,
            windowClass: 'skviderm-admin-modal',
            ariaLabelledBy: 'admin-order-title',
        });
    }

    readonly onOrderDetailsSaved = (updated: OrderMinimalModel): void => {
        this.orders$.pipe(take(1)).subscribe(orders => {
            const order = orders.find(entry => entry.id === updated.id);
            if (order) {
                order.status = updated.status;
                order.updatedAt = updated.updatedAt;
                this.updateFilteredOrders();
            }
        });
    };

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
            const updated = await this.orderService.updateStatus(order.personId, order.id, newStatus).toPromise();
            if (updated) this.onOrderDetailsSaved(updated);
        } catch (error) {
            this.toastService.show('Ошибка при обновлении статуса заказа', 'error');
            console.error('Error updating order status:', error);
        } finally {
            this.updatingStatus = false;
        }
    }
}
