import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { IconsModule } from '../../shared/base/icons/icons.module';
import { ListResponse } from '../../shared/base/schemas/base_schema';
import { OrderModel, OrderProductModel } from '../../shared/models/order.model';
import { PersonModel } from '../../shared/models/person.model';
import { PostPlacement } from '../../shared/models/utils.interface';
import { UpdateOrderSchema } from '../../shared/schemas/order.schema';
import { AuthService } from '../../shared/services/auth.service';
import { CartService } from '../../shared/services/cart.service';
import { OrderService } from '../../shared/services/order.service';
import { PostService } from '../../shared/services/post.service';
import { ToastService } from '../../shared/services/toast.service';
import { ImageUrlPipe } from '../../shared/utils/image-url.pipe';
import { PaymentService } from '../../shared/services/payment.service';

@Component({
    selector: 'app-order-confirmation',
    templateUrl: './order-confirmation.component.html',
    styleUrl: './order-confirmation.component.scss',
    imports: [CommonModule, ReactiveFormsModule, RouterModule, IconsModule, ImageUrlPipe],
})
export class OrderConfirmationComponent implements OnInit {
    confirmationForm: FormGroup;
    isSubmitting = false;
    currentUser$: Observable<PersonModel | null> = new Observable<PersonModel | null>();
    cartItems$: BehaviorSubject<OrderProductModel[]> = new BehaviorSubject<OrderProductModel[]>([]);
    totalPrice$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    loading = true;
    postPlacements$: BehaviorSubject<PostPlacement[]> = new BehaviorSubject<PostPlacement[]>([]);
    filteredPostPlacements$: BehaviorSubject<PostPlacement[]> = new BehaviorSubject<PostPlacement[]>([]);
    showDropdown = false;
    selectedPlacementText = '';
    currentOrder: OrderModel | null = null;

    constructor(
        private formBuilder: FormBuilder,
        private orderService: OrderService,
        private cartService: CartService,
        private authService: AuthService,
        private toastService: ToastService,
        private router: Router,
        private postService: PostService,
        private paymentService: PaymentService,
    ) {
        this.currentUser$ = this.authService.getCurrentUser();
        this.getPostPlacements().subscribe(data => {
            if (data.status == 'success') {
                this.postPlacements$.next(data.data);
                this.filteredPostPlacements$.next(data.data);
            }
        });

        this.confirmationForm = this.formBuilder.group({
            firstName: ['', [Validators.required, Validators.minLength(2)]],
            lastName: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]\d{1,14}$/)]],
            city: [''],
            street: [''],
            house: [''],
            building: [''],
            apartment: [''],
            deliveryMethod: ['pickup', Validators.required],
            courierDelivery: [false],
            paymentMethod: ['card', Validators.required],
            postPlacement: [''],
            postPlacementFilter: [''],
            comments: [''],
        });

        this.confirmationForm.get('deliveryMethod')?.valueChanges.subscribe(value => {
            this.confirmationForm.get('postPlacement')?.clearValidators();
            this.confirmationForm.get('postPlacement')?.setValue('');
            this.confirmationForm.get('postPlacementFilter')?.clearValidators();
            this.confirmationForm.get('postPlacementFilter')?.setValue('');
            this.selectedPlacementText = '';
            this.showDropdown = false;
            this.confirmationForm.get('city')?.clearValidators();
            this.confirmationForm.get('city')?.setValue('');
            this.confirmationForm.get('street')?.clearValidators();
            this.confirmationForm.get('street')?.setValue('');
            this.confirmationForm.get('house')?.clearValidators();
            this.confirmationForm.get('house')?.setValue('');
            this.confirmationForm.get('building')?.clearValidators();
            this.confirmationForm.get('building')?.setValue('');
            this.confirmationForm.get('apartment')?.clearValidators();
            this.confirmationForm.get('apartment')?.setValue('');
            if (value === 'standart') {
                this.confirmationForm.get('city')?.setValidators([Validators.required, Validators.minLength(2)]);
                this.confirmationForm.get('street')?.setValidators([Validators.required, Validators.minLength(2)]);
                this.confirmationForm.get('house')?.setValidators([Validators.required]);
                this.confirmationForm.get('building')?.clearValidators();
                this.confirmationForm.get('building')?.setValue('');
                this.confirmationForm.get('apartment')?.clearValidators();
                this.confirmationForm.get('apartment')?.setValue('');
            } else if (value === 'post') {
                this.confirmationForm.get('postPlacement')?.setValidators([Validators.required]);
                this.confirmationForm.get('postPlacementFilter')?.setValidators([Validators.required, this.validPostPlacementValidator()]);
                if (this.confirmationForm.get('courierDelivery')?.value) {
                    this.confirmationForm.get('city')?.setValidators([Validators.required, Validators.minLength(2)]);
                    this.confirmationForm.get('street')?.setValidators([Validators.required, Validators.minLength(2)]);
                    this.confirmationForm.get('house')?.setValidators([Validators.required]);
                    this.confirmationForm.get('building')?.clearValidators();
                    this.confirmationForm.get('building')?.setValue('');
                    this.confirmationForm.get('apartment')?.setValidators([Validators.required]);
                }
            }

            this.confirmationForm.get('postPlacement')?.updateValueAndValidity();
            this.confirmationForm.get('postPlacementFilter')?.updateValueAndValidity();
            this.confirmationForm.get('city')?.updateValueAndValidity();
            this.confirmationForm.get('street')?.updateValueAndValidity();
            this.confirmationForm.get('house')?.updateValueAndValidity();
            this.confirmationForm.get('building')?.updateValueAndValidity();
            this.confirmationForm.get('apartment')?.updateValueAndValidity();
        });

        this.confirmationForm.get('postPlacementFilter')?.valueChanges.subscribe(filterText => {
            this.filterPostPlacements(filterText || '');
        });

        this.loadCartItems();
    }

    loadCartItems(): void {
        this.orderService.getLastNotCheckedOrder().subscribe(order => {
            this.currentOrder = order;
            if (order) {
                this.cartItems$.next(order.products);
                this.totalPrice$.next(Number(order.totalPrice.toFixed(2)));
            }
        });
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

        let deliveryAddress = null;
        if (
            this.confirmationForm.get('deliveryMethod')?.value === 'standart' ||
            (this.confirmationForm.get('deliveryMethod')?.value === 'post' && this.confirmationForm.get('courierDelivery')?.value)
        ) {
            deliveryAddress = `${this.confirmationForm.get('city')?.value}, ${this.confirmationForm.get('street')?.value}, ${this.confirmationForm.get('house')?.value}`;
            if (this.confirmationForm.get('building')?.value) {
                deliveryAddress += `, корпус ${this.confirmationForm.get('building')?.value}`;
            }
            if (this.confirmationForm.get('apartment')?.value) {
                deliveryAddress += `, кв. ${this.confirmationForm.get('apartment')?.value}`;
            }
        }
        let postAddress = null;
        if (this.confirmationForm.get('deliveryMethod')?.value === 'post') {
            const placement = this.postPlacements$.getValue().find(p => p.id === this.confirmationForm.get('postPlacement')?.value);
            postAddress = `Отделение №${placement?.number} - ${placement?.address}`;
        }

        await this.orderService.update(this.currentOrder!.id, {
            firstName: this.confirmationForm.get('firstName')?.value,
            secondName: this.confirmationForm.get('lastName')?.value,
            email: this.confirmationForm.get('email')?.value,
            phone: this.confirmationForm.get('phone')?.value,
            deliveryMethod: this.confirmationForm.get('deliveryMethod')?.value,
            isCourierDelivery: this.confirmationForm.get('courierDelivery')?.value,
            paymentMethod: this.confirmationForm.get('paymentMethod')?.value,
            deliveryAddress: deliveryAddress,
            deliveryPostAddress: postAddress,
            comment: this.confirmationForm.get('comments')?.value,
        } as UpdateOrderSchema);

        try {
            const result = await this.cartService.checkout(this.confirmationForm.get('paymentMethod')?.value === 'online');

            if (result) {
                this.toastService.show('Заказ успешно оформлен!', 'success');
                if (this.confirmationForm.get('paymentMethod')?.value === 'online') {
                    const paymentResponse = await this.paymentService.processPayment(this.currentOrder!).toPromise();
                    if (paymentResponse && paymentResponse.formUrl) {
                        window.location.href = paymentResponse.formUrl;
                        this.orderService.update(this.currentOrder!.id, { paymentStatus: 'Processing' } as UpdateOrderSchema);
                        return;
                    } else {
                        this.toastService.show('Ошибка при переходе к оплате', 'error');
                    }
                }
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
        if (control.errors['invalidPostPlacement']) {
            return 'Выберите пункт выдачи из списка';
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

    filterPostPlacements(filterText: string): void {
        const allPlacements = this.postPlacements$.getValue();
        if (!filterText.trim()) {
            this.filteredPostPlacements$.next(allPlacements);
            return;
        }

        const filtered = allPlacements.filter(
            placement =>
                placement.address.toLowerCase().includes(filterText.toLowerCase()) || placement.number.toString().includes(filterText),
        );
        this.filteredPostPlacements$.next(filtered);
    }

    selectPostPlacement(placement: PostPlacement): void {
        this.confirmationForm.get('postPlacement')?.setValue(placement.id);
        this.selectedPlacementText = `Отделение №${placement.number} - ${placement.address}`;
        this.confirmationForm.get('postPlacementFilter')?.setValue(this.selectedPlacementText);
        this.showDropdown = false;

        this.confirmationForm.get('postPlacementFilter')?.updateValueAndValidity();
    }

    onFilterFocus(): void {
        this.showDropdown = true;
        if (this.confirmationForm.get('postPlacementFilter')?.value === this.selectedPlacementText) {
            this.confirmationForm.get('postPlacementFilter')?.setValue('');
        }
    }

    onFilterBlur(): void {
        setTimeout(() => {
            this.showDropdown = false;

            const filterValue = this.confirmationForm.get('postPlacementFilter')?.value;
            const allPlacements = this.postPlacements$.getValue();

            const matchedPlacement = allPlacements.find(placement => {
                const placementText = `Отделение №${placement.number} - ${placement.address}`;
                return placementText === filterValue;
            });

            if (matchedPlacement) {
                this.confirmationForm.get('postPlacement')?.setValue(matchedPlacement.id);
                this.selectedPlacementText = filterValue;
            } else {
                this.confirmationForm.get('postPlacement')?.setValue('');
                if (!filterValue && this.selectedPlacementText) {
                    this.confirmationForm.get('postPlacementFilter')?.setValue(this.selectedPlacementText);
                }
            }

            this.confirmationForm.get('postPlacementFilter')?.updateValueAndValidity();
        }, 200);
    }

    private validPostPlacementValidator(): ValidatorFn {
        return (control: AbstractControl): Record<string, unknown> | null => {
            if (!control.value) {
                return null;
            }

            const allPlacements = this.postPlacements$.getValue();
            const isValid = allPlacements.some(placement => {
                const placementText = `Отделение №${placement.number} - ${placement.address}`;
                return placementText === control.value;
            });

            return isValid ? null : { invalidPostPlacement: { value: control.value } };
        };
    }

    getPostPlacements(): Observable<ListResponse<PostPlacement>> {
        return this.postService.getPostPlacements();
    }
}
