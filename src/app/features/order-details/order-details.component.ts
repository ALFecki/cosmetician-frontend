import { GuestCheckoutService } from '../../shared/services/guest-checkout.service';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { PaymentService } from '../../shared/services/payment.service';
import { apiMessage } from '../../shared/utils/api-message';
import { catchError, switchMap } from 'rxjs/operators';
import { SingleResponse } from '../../shared/base/schemas/base_schema';
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
    guestMode = false;
    loading = true;
    error: string | null = null;
    cancellingOrder = false;
    currentUser: BehaviorSubject<PersonModel | null> = new BehaviorSubject<PersonModel | null>(null);
    changingPaymentMethod = false;
    retryingPayment = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        public authService: AuthService,
        private orderService: OrderService,
        private personService: PersonService,
        private toastService: ToastService,
        private paymentService: PaymentService,
        private guestCheckout: GuestCheckoutService,
    ) {
        this.authService.getCurrentUser().subscribe(user => {
            if (user) {
                this.currentUser.next(user);
            }
        });
    }

    async ngOnInit(): Promise<void> {
        try {
            await this.authService.ready;
            await firstValueFrom(this.authService.checkAuth());
        } catch {
            this.error = 'Не удалось проверить вход. Обновите страницу.';
            this.loading = false;
            return;
        }
        await this.guestCheckout.ready;
        this.guestMode = (!!this.guestCheckout.session && this.route.snapshot.data['guest'] === true) || !this.authService.isLoggedIn();
        if (this.guestMode && !this.guestCheckout.session) {
            this.error = 'Доступ к заказу в этом браузере не найден. Войдите в аккаунт или свяжитесь с магазином.';
            this.loading = false;
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
                    if (this.guestMode)
                        return this.guestCheckout.getOrder(orderId).pipe(
                            catchError(error => {
                                if (error.status !== 404 || !this.authService.isLoggedIn()) throw error;
                                this.guestMode = false;
                                return this.orderService.getById(orderId);
                            }),
                        );
                    return this.orderService.getById(orderId).pipe(
                        catchError(error => {
                            if (![403, 404].includes(error.status) || !this.guestCheckout.session) throw error;
                            this.guestMode = true;
                            return this.guestCheckout.getOrder(orderId);
                        }),
                    );
                }),
            )
            .subscribe(
                order => {
                    this.order.next(order.data);

                    // Load recipient information if available
                    if (order.data.contactSnapshot) {
                        const contact = order.data.contactSnapshot;
                        this.orderRecipient.next({
                            firstName: contact.firstName,
                            secondName: contact.secondName,
                            phone: contact.phone,
                            email: contact.email,
                            surname: null,
                        } as PersonModel);
                    } else if (!this.guestMode && order.data.personId) {
                        this.personService.getById(order.data.personId).subscribe(
                            person => {
                                const snapshot = order.data.contactSnapshot;
                                this.orderRecipient.next(
                                    snapshot
                                        ? {
                                              ...person.data,
                                              firstName: snapshot.firstName,
                                              secondName: snapshot.secondName,
                                              phone: snapshot.phone,
                                              email: snapshot.email,
                                              surname: null,
                                          }
                                        : person.data,
                                );
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
                return 'Выполнен';
            case 'checked':
                return 'Оформлен';
            case 'cancelled':
                return 'Отменен';
            case 'processing':
                return 'В обработке';
            case 'indelivery':
                return 'В доставке';
            case 'delivered':
                return 'Доставлен';
            default:
                return 'Неизвестный статус';
        }
    }

    getStatusIcon(status: string): string {
        switch (status?.toLowerCase()) {
            case 'сompleted':
                return 'bi-check-circle-fill';
            case 'checked':
                return 'bi-clipboard-check';
            case 'сancelled':
                return 'bi-x-circle-fill';
            case 'pending':
                return 'bi-clock-history';
            case 'processing':
                return 'bi-arrow-repeat';
            default:
                return 'bi-question-circle';
        }
    }

    getPaymentStatusClass(status: string): string {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'bg-success';
            case 'pending':
                return 'bg-warning';
            case 'processing':
                return 'bg-primary';
            case 'failed':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    }

    getPaymentStatusText(status: string): string {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'Оплачено';
            case 'pending':
                return 'Ожидает оплаты';
            case 'processing':
                return 'Обработка оплаты';
            case 'failed':
                return 'Ошибка оплаты';
            default:
                return 'Не указано';
        }
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

    canChangePaymentMethod(): boolean {
        const order = this.order.value;
        if (!order || this.guestMode || order.contactSnapshot) return false;

        return (
            order.paymentMethod?.toLowerCase() === 'online' &&
            (order.paymentStatus?.toLowerCase() === 'failed' || order.paymentStatus?.toLowerCase() === 'pending')
        );
    }

    canRetryPayment(): boolean {
        const order = this.order.value;
        if (!order) return false;

        return (
            order.paymentMethod === 'online' &&
            !['Cancelled', 'Completed'].includes(order.status) &&
            ['Pending', 'Processing', 'NotPaid'].includes(order.paymentStatus)
        );
    }

    changePaymentMethod(paymentMethod: string): void {
        const order = this.order.value;
        if (!order || this.changingPaymentMethod) {
            return;
        }
        if (!confirm('Вы уверены, что хотите сменить способ оплаты на ' + this.getPaymentMethodText(paymentMethod) + '?')) {
            return;
        }

        this.changingPaymentMethod = true;

        this.orderService.update(order.id, { paymentMethod }).then(
            (response: SingleResponse<OrderModel>) => {
                if (response.status) {
                    this.toastService.show(`Способ оплаты успешно изменен на ${this.getPaymentMethodText(paymentMethod)}`, 'success');
                    this.loadOrderDetails();
                } else {
                    this.toastService.show('Не удалось изменить способ оплаты', 'error');
                }
                this.changingPaymentMethod = false;
            },
            (error: Error) => {
                this.toastService.show('Ошибка при смене способа оплаты: ' + (error.message || 'Неизвестная ошибка'), 'error');
                this.changingPaymentMethod = false;
            },
        );
    }

    async retryPayment(): Promise<void> {
        const order = this.order.value;
        if (!order || this.retryingPayment || !this.canRetryPayment()) return;
        this.retryingPayment = true;
        try {
            const payment = await firstValueFrom(
                this.guestMode ? this.guestCheckout.pay(order.id) : this.paymentService.processPayment(order),
            );
            window.location.assign(payment.formUrl);
        } catch (error) {
            this.toastService.show(apiMessage(error, 'Не удалось перейти к оплате. Попробуйте позже.'), 'error');
        } finally {
            this.retryingPayment = false;
        }
    }
}
