import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { IconsModule } from '../../shared/base/icons/icons.module';
import { OrderProductModel } from '../../shared/models/order.model';
import { PersonModel } from '../../shared/models/person.model';
import { AuthService } from '../../shared/services/auth.service';
import { OrderService } from '../../shared/services/order.service';
import { ToastService } from '../../shared/services/toast.service';
import { ImageUrlPipe } from '../../shared/utils/image-url.pipe';
import { CartService } from '../../shared/services/cart.service';

@Component({
    selector: 'app-order-confirmation',
    templateUrl: './order-confirmation.component.html',
    styleUrl: './order-confirmation.component.scss',
    imports: [CommonModule, ReactiveFormsModule, RouterModule, IconsModule, ImageUrlPipe]
})
export class OrderConfirmationComponent implements OnInit {
    confirmationForm: FormGroup;
    isSubmitting = false;
    currentUser$: Observable<PersonModel | null> = new Observable<PersonModel | null>();
    cartItems$: BehaviorSubject<OrderProductModel[]> = new BehaviorSubject<OrderProductModel[]>([]);
    totalPrice$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    loading = true;

    constructor(
        private formBuilder: FormBuilder,
        private orderService: OrderService,
        private cartService: CartService,
        private authService: AuthService,
        private toastService: ToastService,
        private router: Router,
    ) {
        this.currentUser$ = this.authService.getCurrentUser();

        this.confirmationForm = this.formBuilder.group({
            firstName: ['', [Validators.required, Validators.minLength(2)]],
            lastName: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]\d{1,14}$/)]],
            address: [''],
            city: [''],
            postalCode: [''],
            deliveryMethod: ['pickup', Validators.required],
            paymentMethod: ['card', Validators.required],
            comments: [''],
        });

        this.confirmationForm.get('deliveryMethod')?.valueChanges.subscribe(value => {
            if (value === 'express' || value === 'standard') {
                this.confirmationForm.get('address')?.setValidators([Validators.required, Validators.minLength(10)]);
                this.confirmationForm.get('city')?.setValidators([Validators.required, Validators.minLength(2)]);
                this.confirmationForm.get('postalCode')?.setValidators([Validators.required, Validators.pattern(/^\d{5,6}$/)]);
            } else {
                this.confirmationForm.get('address')?.clearValidators();
                this.confirmationForm.get('address')?.setValue('');
                this.confirmationForm.get('city')?.clearValidators();
                this.confirmationForm.get('city')?.setValue('');
                this.confirmationForm.get('postalCode')?.clearValidators();
                this.confirmationForm.get('postalCode')?.setValue('');
            }
            this.confirmationForm.get('address')?.updateValueAndValidity();
            this.confirmationForm.get('city')?.updateValueAndValidity();
            this.confirmationForm.get('postalCode')?.updateValueAndValidity();
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
            const result = await this.cartService.checkout();

            if (result) {
                this.toastService.show('Заказ успешно оформлен!', 'success');
                this.router.navigate(['/products']);
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
