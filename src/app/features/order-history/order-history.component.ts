import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from '../../shared/services/auth.service';
import { OrderService } from '../../shared/services/order.service';
import { OrderModel } from '../../shared/models/order.model';
import { PersonModel } from '../../shared/models/person.model';

@Component({
    selector: 'app-order-history',
    templateUrl: './order-history.component.html',
    styleUrl: './order-history.component.scss',
    standalone: true,
    imports: [CommonModule, RouterModule],
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
        this.orders$ = this.orderService.getUserOrders();
        this.loading = false;
    }

    getOrderStatusClass(status: string): string {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'bg-success';
            case 'processing':
                return 'bg-primary';
            case 'shipped':
                return 'bg-info';
            case 'cancelled':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    }

    getOrderStatusText(status: string): string {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'Выполнен';
            case 'processing':
                return 'В обработке';
            case 'shipped':
                return 'Отправлен';
            case 'cancelled':
                return 'Отменен';
            default:
                return 'Новый';
        }
    }

    logout(): void {
        this.authService.logout().subscribe(() => {
            this.router.navigate(['/']);
        });
    }
}
