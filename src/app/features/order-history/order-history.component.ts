import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProfileSidebarComponent } from '../../shared/components/profile-sidebar/profile-sidebar.component';
import { OrderModel } from '../../shared/models/order.model';
import { PersonModel } from '../../shared/models/person.model';
import { AuthService } from '../../shared/services/auth.service';
import { OrderService } from '../../shared/services/order.service';

@Component({
    selector: 'app-order-history',
    templateUrl: './order-history.component.html',
    styleUrl: './order-history.component.scss',
    imports: [CommonModule, RouterModule, ProfileSidebarComponent]
})
export class OrderHistoryComponent implements OnInit {
    orders$!: Observable<OrderModel[]>;
    loading = true;
    error: string | null = null;
    currentUser: BehaviorSubject<PersonModel | null> = new BehaviorSubject<PersonModel | null>(null);

    constructor(
        public authService: AuthService,
        private orderService: OrderService,
        public router: Router,
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

        this.loadOrders();
    }

    loadOrders(): void {
        this.loading = true;
        this.orders$ = this.orderService.getUserOrders().pipe(
            map(orders => {
                const filteredOrders = orders.filter(order => order.status !== 'NotChecked');
                filteredOrders.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                return filteredOrders;
            }),
        );
        this.loading = false;
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

    logout(): void {
        this.authService.logout().subscribe(() => {
            this.router.navigate(['/']);
        });
    }
}
