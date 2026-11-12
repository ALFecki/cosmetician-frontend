import { CartService } from '../../shared/services/cart.service';
import { GuestCheckoutService } from '../../shared/services/guest-checkout.service';
import { PhoneAuthComponent } from '../../shared/components/phone-auth/phone-auth.component';
import { LoginModalService } from '../../shared/services/login-modal.service';
import { apiMessage } from '../../shared/utils/api-message';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BehaviorSubject, firstValueFrom, Observable, of } from 'rxjs';
import { ProfileSidebarComponent } from '../../shared/components/profile-sidebar/profile-sidebar.component';
import { OrderMinimalModel } from '../../shared/models/order.model';
import { PersonModel } from '../../shared/models/person.model';
import { AuthService } from '../../shared/services/auth.service';
import { OrderService } from '../../shared/services/order.service';

@Component({
    selector: 'app-order-history',
    templateUrl: './order-history.component.html',
    styleUrl: './order-history.component.scss',
    imports: [CommonModule, RouterModule, ProfileSidebarComponent, PhoneAuthComponent],
})
export class OrderHistoryComponent implements OnInit {
    guestMode = false;
    page = 1;
    hasNextPage = false;
    claiming = false;
    claimMessage: string | null = null;
    orders$!: Observable<OrderMinimalModel[]>;
    loading = true;
    error: string | null = null;
    currentUser: BehaviorSubject<PersonModel | null> = new BehaviorSubject<PersonModel | null>(null);

    constructor(
        public authService: AuthService,
        private orderService: OrderService,
        public router: Router,
        private route: ActivatedRoute,
        public guestCheckout: GuestCheckoutService,
        public loginModalService: LoginModalService,
        private cartService: CartService,
    ) {
        this.authService.getCurrentUser().subscribe(user => {
            if (user) {
                this.currentUser.next(user);
            }
        });
    }

    async ngOnInit(): Promise<void> {
        this.guestMode = this.route.snapshot.data['guest'] === true;
        await this.authService.ready;
        if (this.guestMode) {
            await this.guestCheckout.ready;
        } else if (!this.authService.isLoggedIn()) {
            await this.router.navigate(['/']);
            return;
        }
        await this.loadOrders();
    }

    async loadOrders(page = 1): Promise<void> {
        this.loading = true;
        this.error = null;
        try {
            if (this.guestMode) {
                if (!this.guestCheckout.session)
                    throw new Error(
                        'В этом браузере нет сохранённого доступа к заказам. После очистки cookies или через 30 дней свяжитесь с магазином.',
                    );
                const response = await this.guestCheckout.getOrders(page);
                this.orders$ = of(response.data);
                this.page = page;
                this.hasNextPage = page * 20 < response.length;
            } else {
                const orders = await firstValueFrom(this.orderService.getUserMinimalOrders(this.currentUser.value!.id));
                this.orders$ = of(
                    orders
                        .filter(order => order.status !== 'NotChecked')
                        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
                );
            }
        } catch (error) {
            this.error = apiMessage(error, 'Не удалось загрузить историю заказов. Попробуйте ещё раз.');
        } finally {
            this.loading = false;
        }
    }

    async claimOrders(): Promise<void> {
        if (this.claiming) return;
        this.claiming = true;
        this.error = null;
        try {
            const result = await this.cartService.claimGuestOrders();
            this.claimMessage = result.claimed
                ? 'Заказы добавлены в историю вашего аккаунта.'
                : 'Заказов с подтверждённым номером для переноса нет.';
            await this.loadOrders();
        } catch (error) {
            this.error = apiMessage(error, 'Не удалось добавить заказы. Можно повторить без нового SMS.');
        } finally {
            this.claiming = false;
        }
    }

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

    logout(): void {
        this.authService.logout().subscribe(() => {
            this.router.navigate(['/']);
        });
    }
}
