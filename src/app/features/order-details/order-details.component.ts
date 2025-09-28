import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ProfileSidebarComponent } from '../../shared/components/profile-sidebar/profile-sidebar.component';
import { OrderModel } from '../../shared/models/order.model';
import { PersonModel } from '../../shared/models/person.model';
import { AuthService } from '../../shared/services/auth.service';
import { OrderService } from '../../shared/services/order.service';
import { PersonService } from '../../shared/services/person.service';
import { ToastService } from '../../shared/services/toast.service';
import { ImageUrlPipe } from '../../shared/utils/image-url.pipe';

@Component({
    selector: 'app-order-details',
    templateUrl: './order-details.component.html',
    styleUrl: './order-details.component.scss',
    imports: [CommonModule, RouterModule, ProfileSidebarComponent, ImageUrlPipe],
})
export class OrderDetailsComponent implements OnInit {
    order: BehaviorSubject<OrderModel | null> = new BehaviorSubject<OrderModel | null>(null);
    orderRecipient: BehaviorSubject<PersonModel | null> = new BehaviorSubject<PersonModel | null>(null);
    loading = true;
    error: string | null = null;
    cancellingOrder = false;
    currentUser: BehaviorSubject<PersonModel | null> = new BehaviorSubject<PersonModel | null>(null);

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        public authService: AuthService,
        private orderService: OrderService,
        private personService: PersonService,
        private toastService: ToastService,
    ) {
        this.authService.getCurrentUser().subscribe(user => {
            if (user) {
                this.currentUser.next(user);
            }
        });
    }

    ngOnInit(): void {
        if (!this.authService.isLoggedIn()) {
            this.router.navigate(['/']);
            return;
        }

        this.loadOrderDetails();
    }

    loadOrderDetails(): void {
        this.loading = true;
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
            .subscribe(
                order => {
                    this.order.next(order.data);

                    // Load recipient information if available
                    if (order.data.personId) {
                        this.personService.getById(order.data.personId).subscribe(
                            person => {
                                this.orderRecipient.next(person.data);
                            },
                            error => {
                                console.warn('Failed to load recipient information:', error);
                                this.orderRecipient.next(null);
                            },
                        );
                    }

                    this.loading = false;
                },
                error => {
                    this.error = 'Не удалось загрузить информацию о заказе: ' + (error.message || 'Неизвестная ошибка');
                    this.loading = false;
                },
            );
    }

    // cancelOrder(): void {
    //     if (!this.order || this.cancellingOrder) {
    //         return;
    //     }

    //     if (!confirm('Вы уверены, что хотите отменить этот заказ?')) {
    //         return;
    //     }

    //     this.cancellingOrder = true;
    //     this.orderService.cancelOrder(this.order.id).subscribe(
    //         () => {
    //             this.toastService.show('Заказ успешно отменен', 'success');
    //             this.loadOrderDetails();
    //             this.cancellingOrder = false;
    //         },
    //         error => {
    //             this.toastService.show('Не удалось отменить заказ', 'error');
    //             this.cancellingOrder = false;
    //         },
    //     );
    // }

    getOrderStatusClass(status: string): string {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'сompleted':
                return 'bg-success';
            case 'checked':
                return 'bg-info';
            case 'cancelled':
            case 'сancelled':
                return 'bg-danger';
            case 'pending':
            case 'new':
                return 'bg-warning';
            case 'processing':
                return 'bg-primary';
            default:
                return 'bg-secondary';
        }
    }

    getOrderStatusText(status: string): string {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'сompleted':
                return 'Выполнен';
            case 'checked':
                return 'Оформлен';
            case 'cancelled':
            case 'сancelled':
                return 'Отменен';
            case 'pending':
            case 'new':
                return 'Ожидает обработки';
            case 'processing':
                return 'В обработке';
            default:
                return 'Неизвестный статус';
        }
    }

    // canCancelOrder(): boolean {
    //     if (!this.order) return false;

    //     const status = this.order.status.toLowerCase();
    //     return status !== 'completed' && status !== 'cancelled' && status !== 'shipped';
    // }

    logout(): void {
        this.authService.logout().subscribe(() => {
            this.router.navigate(['/']);
        });
    }
}
