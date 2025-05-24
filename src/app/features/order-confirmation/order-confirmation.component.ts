import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject} from 'rxjs';
import { OrderProductModel } from '../../shared/models/order.model';
import { AuthService } from '../../shared/services/auth.service';
import { OrderService } from '../../shared/services/order.service';
import { ToastService } from '../../shared/services/toast.service';
import { IconsModule } from '../../shared/base/icons/icons.module';

@Component({
    selector: 'app-order-confirmation',
    templateUrl: './order-confirmation.component.html',
    styleUrl: './order-confirmation.component.scss',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, IconsModule],
})
export class OrderConfirmationComponent implements OnInit {
    private fb = inject(FormBuilder);
    private orderService = inject(OrderService);
    private authService = inject(AuthService);
    private toastService = inject(ToastService);
    private router = inject(Router);

    confirmationForm: FormGroup;
    isSubmitting = false;
    currentUser$ = this.authService.getCurrentUser();
    cartItems$: BehaviorSubject<OrderProductModel[]> = new BehaviorSubject<OrderProductModel[]>([]);
    totalPrice$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    loading = true;

    constructor() {
        this.confirmationForm = this.fb.group({
            firstName: ['', [Validators.required, Validators.minLength(2)]],
            lastName: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            phone: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
            address: ['', [Validators.required, Validators.minLength(10)]],
            city: ['', [Validators.required, Validators.minLength(2)]],
            postalCode: ['', [Validators.required, Validators.pattern(/^\d{5,6}$/)]],
            deliveryMethod: ['standard', Validators.required],
            paymentMethod: ['card', Validators.required],
            comments: [''],
        });

        this.loadCartItems();
    }

    async loadCartItems(): Promise<void> {
        const currentOrder = await this.orderService.getLastNotCheckedOrder().toPromise();
        if (currentOrder) {
            this.cartItems$.next(currentOrder.products);
            this.totalPrice$.next(Number(currentOrder.totalPrice.toFixed(2)));

        }
    }
        

    ngOnInit(): void {
        if (!this.authService.isLoggedIn()) {
            this.router.navigate(['/']);
            return;
        }

        this.currentUser$.subscribe(user => {
            if (user) {
                this.confirmationForm.patchValue({
                    firstName: user.firstName || '',
                    lastName: user.secondName || '',
                    email: user.email || '',
                    phone: user.phone || '',
                });
            }
            this.loading = false;
        });
    }

    async confirmOrder(): Promise<void> {
        if (this.confirmationForm.invalid || this.isSubmitting) {
            this.markFormGroupTouched();
            return;
        }

        this.isSubmitting = true;

        try {
            const result = await this.orderService.checkout();

            if (result) {
                this.toastService.show('Заказ успешно оформлен!', 'success');
                this.router.navigate(['/orders']);
            } else {
                this.toastService.show('Произошла ошибка при оформлении заказа', 'error');
            }
        } catch (error) {
            console.error('Order confirmation error:', error);
            this.toastService.show('Произошла ошибка при оформлении заказа', 'error');
        } finally {
            this.isSubmitting = false;
        }
    }

    goBackToCart(): void {
        this.router.navigate(['/cart']);
    }

    private markFormGroupTouched(): void {
        Object.keys(this.confirmationForm.controls).forEach(key => {
            const control = this.confirmationForm.get(key);
            control?.markAsTouched();
        });
    }

    getFieldError(fieldName: string): string | null {
        const control = this.confirmationForm.get(fieldName);
        if (!control || !control.errors || !control.touched) {
            return null;
        }

        if (control.errors['required']) {
            return 'Это поле обязательно для заполнения';
        }
        if (control.errors['email']) {
            return 'Введите корректный email адрес';
        }
        if (control.errors['minlength']) {
            return `Минимальная длина: ${control.errors['minlength'].requiredLength} символов`;
        }
        if (control.errors['pattern']) {
            if (fieldName === 'phone') {
                return 'Введите корректный номер телефона';
            }
            if (fieldName === 'postalCode') {
                return 'Введите корректный почтовый индекс';
            }
        }

        return null;
    }

    getDeliveryPrice(): number {
        const method = this.confirmationForm.get('deliveryMethod')?.value;
        switch (method) {
            case 'express':
                return 15;
            case 'pickup':
                return 0;
            default:
                return 5;
        }
    }

    getTotalWithDelivery(): number {
        let cartTotal = 0;
        this.totalPrice$.subscribe(total => (cartTotal = total)).unsubscribe();
        return cartTotal + this.getDeliveryPrice();
    }
}
