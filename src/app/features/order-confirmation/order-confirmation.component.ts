import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IconsModule } from '../../shared/base/icons/icons.module';
import { ListResponse } from '../../shared/base/schemas/base_schema';
import { OrderModel, OrderProductModel } from '../../shared/models/order.model';
import { PersonModel } from '../../shared/models/person.model';
import { PromocodeModel } from '../../shared/models/promocode.model';
import { PromotionModel } from '../../shared/models/promotion.model';
import { PostPlacement } from '../../shared/models/utils.interface';
import { UpdateOrderSchema } from '../../shared/schemas/order.schema';
import { AuthService } from '../../shared/services/auth.service';
import { CartService } from '../../shared/services/cart.service';
import { OrderService } from '../../shared/services/order.service';
import { PaymentService } from '../../shared/services/payment.service';
import { PostService } from '../../shared/services/post.service';
import { PromocodeService } from '../../shared/services/promocode.service';
import { PromotionService } from '../../shared/services/promotion.service';
import { ToastService } from '../../shared/services/toast.service';
import { ImageUrlPipe } from '../../shared/utils/image-url.pipe';
import { calculateDiscountedPrice, PriceInfo } from '../../shared/utils/promotion.utils';

@Component({
    selector: 'app-order-confirmation',
    templateUrl: './order-confirmation.component.html',
    styleUrl: './order-confirmation.component.scss',
    imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, IconsModule, ImageUrlPipe],
})
export class OrderConfirmationComponent implements OnInit {
    confirmationForm: FormGroup;
    isSubmitting = false;
    publicOfferUrl = environment.public_offer_url;
    currentUser$: Observable<PersonModel | null> = new Observable<PersonModel | null>();
    cartItems$: BehaviorSubject<OrderProductModel[]> = new BehaviorSubject<OrderProductModel[]>([]);
    totalPrice$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    loading = true;
    postPlacements$: BehaviorSubject<PostPlacement[]> = new BehaviorSubject<PostPlacement[]>([]);
    filteredPostPlacements$: BehaviorSubject<PostPlacement[]> = new BehaviorSubject<PostPlacement[]>([]);
    showDropdown = false;
    selectedPlacementText = '';
    currentOrder: OrderModel | null = null;

    promocode = '';
    appliedPromocode: PromocodeModel | null = null;
    promocodeDiscount = 0;
    applyingPromocode = false;
    private productPromotions: Record<string, PromotionModel[]> = {};

    constructor(
        private formBuilder: FormBuilder,
        private orderService: OrderService,
        private cartService: CartService,
        private authService: AuthService,
        private toastService: ToastService,
        private router: Router,
        private postService: PostService,
        private paymentService: PaymentService,
        private promocodeService: PromocodeService,
        private promotionService: PromotionService,
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
            phone: ['', [Validators.required, Validators.pattern(/^\+375 \(\d{2}\) \d{3}-\d{2}-\d{2}$/)]],
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
            offerConsent: [false, Validators.requiredTrue],
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
                    this.confirmationForm.get('apartment')?.clearValidators();
                    this.confirmationForm.get('apartment')?.setValue('');
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

        this.confirmationForm.get('courierDelivery')?.valueChanges.subscribe(value => {
            if (this.confirmationForm.get('deliveryMethod')?.value === 'post' && value) {
                this.confirmationForm.get('city')?.setValidators([Validators.required, Validators.minLength(2)]);
                this.confirmationForm.get('street')?.setValidators([Validators.required, Validators.minLength(2)]);
                this.confirmationForm.get('house')?.setValidators([Validators.required]);
                this.confirmationForm.get('building')?.clearValidators();
                this.confirmationForm.get('building')?.setValue('');
                this.confirmationForm.get('apartment')?.clearValidators();
                this.confirmationForm.get('apartment')?.setValue('');
            } else {
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
            }

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
                // Load promotions for each product
                order.products.forEach(item => {
                    if (item.product?.id) {
                        this.loadProductPromotions(item.product.id);
                    }
                });
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
                    phone: this.formatBelarusPhone(user.phone || ''),
                });
            }
            this.loading = false;
        });
    }

    async confirmOrder(): Promise<void> {
        if (this.isSubmitting) {
            return;
        }

        if (this.confirmationForm.invalid) {
            this.markFormGroupTouched();
            this.toastService.show('Пожалуйста, проверьте правильность заполнения формы', 'error');
            setTimeout(() => this.scrollToFirstError(), 0);
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
            phone: this.normalizePhone(this.confirmationForm.get('phone')?.value),
            deliveryMethod: this.confirmationForm.get('deliveryMethod')?.value,
            isCourierDelivery: this.confirmationForm.get('courierDelivery')?.value,
            paymentMethod: this.confirmationForm.get('paymentMethod')?.value,
            deliveryAddress: deliveryAddress,
            deliveryPostAddress: postAddress,
            deliveryCost: this.getDeliveryPrice(),
            comment: this.confirmationForm.get('comments')?.value,
        } as UpdateOrderSchema);

        try {
            const result = await this.cartService.checkout(this.confirmationForm.get('paymentMethod')?.value === 'online');

            if (result) {
                this.toastService.show('Заказ успешно оформлен!', 'success');
                if (this.confirmationForm.get('paymentMethod')?.value === 'online') {
                    const orderMinimal = await firstValueFrom(this.orderService.getMinimalById(this.currentOrder!.id));
                    const paymentResponse = await this.paymentService.processPayment(orderMinimal!).toPromise();
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
            control?.updateValueAndValidity({ emitEvent: false });
        });
    }

    private scrollToFirstError(): void {
        const firstInvalid = document.querySelector<HTMLElement>(
            '.form-control.is-invalid, .form-check-input.is-invalid, .is-invalid',
        );
        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalid.focus({ preventScroll: true });
        }
    }

    onPhoneInput(event: Event): void {
        const inputEl = event.target as HTMLInputElement;
        const formatted = this.formatBelarusPhone(inputEl.value);
        inputEl.value = formatted;
        this.confirmationForm.get('phone')?.setValue(formatted, { emitEvent: false });
    }

    /** Приводит любой ввод к виду «+375 (29) 123-45-67», форматируя по мере набора. */
    private formatBelarusPhone(value: string): string {
        let digits = (value || '').replace(/\D/g, '');
        if (digits.startsWith('375')) {
            digits = digits.slice(3);
        } else if (digits.startsWith('80')) {
            digits = digits.slice(2);
        }
        digits = digits.slice(0, 9);

        if (!digits) {
            return '';
        }

        const op = digits.slice(0, 2);
        const a = digits.slice(2, 5);
        const b = digits.slice(5, 7);
        const c = digits.slice(7, 9);

        let result = '+375';
        if (op) {
            result += ` (${op}`;
        }
        if (a) {
            result += `) ${a}`;
        }
        if (b) {
            result += `-${b}`;
        }
        if (c) {
            result += `-${c}`;
        }
        return result;
    }

    /** Нормализует телефон к «+375XXXXXXXXX» для отправки на сервер. */
    private normalizePhone(value: string): string {
        const digits = (value || '').replace(/\D/g, '');
        return digits ? `+${digits}` : '';
    }

    getFieldError(fieldName: string): string | null {
        const control = this.confirmationForm.get(fieldName);
        if (!control || !control.errors || !control.touched) {
            return null;
        }

        if (control.errors['required']) {
            if (fieldName === 'offerConsent') {
                return 'Необходимо принять условия договора публичной оферты';
            }
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
            return 'Некорректный формат';
        }
        if (control.errors['invalidPostPlacement']) {
            return 'Выберите пункт выдачи из списка';
        }

        return 'Некорректное значение';
    }

    getDeliveryPrice(): number {
        if (this.currentOrder?.totalPrice && this.currentOrder.totalPrice >= 250) {
            return 0;
        }
        const method = this.confirmationForm.get('deliveryMethod')?.value;
        switch (method) {
            case 'standart':
                return 10;
            case 'pickup':
                return 0;
            case 'post':
                if (this.confirmationForm.get('courierDelivery')?.value) {
                    return 10;
                }
                return 0;
            default:
                return 5;
        }
    }

    getTotalWithDelivery(): number {
        let cartTotal = 0;
        this.totalPrice$.subscribe(total => (cartTotal = total)).unsubscribe();
        const totalWithDiscount = Math.max(0, cartTotal - this.promocodeDiscount);
        return totalWithDiscount + this.getDeliveryPrice();
    }

    loadProductPromotions(productId: string): void {
        this.promotionService.getProductPromotions(productId).subscribe({
            next: promotions => {
                this.productPromotions[productId] = promotions.data.filter(p => p.isActive);
            },
            error: () => {
                this.productPromotions[productId] = [];
            },
        });
    }

    getItemPriceInfo(item: OrderProductModel): PriceInfo {
        if (!item.product?.id) {
            return {
                originalPrice: item.variant.price,
                discountedPrice: null,
                hasDiscount: false,
                activePromotion: null,
                discountAmount: 0,
                discountLabel: '',
            };
        }
        const promotions = this.productPromotions[item.product.id] || [];
        return calculateDiscountedPrice(item.variant.price, promotions);
    }

    getItemTotal(item: OrderProductModel): number {
        const priceInfo = this.getItemPriceInfo(item);
        const price = priceInfo.hasDiscount ? priceInfo.discountedPrice! : priceInfo.originalPrice;
        return price * item.quantity;
    }

    getCartTotal(): number {
        let total = 0;
        const items = this.cartItems$.value;
        total = items.reduce((sum, item) => sum + this.getItemTotal(item), 0);
        return total;
    }

    getCartTotalWithPromocode(): number {
        const total = this.getCartTotal();
        return Math.max(0, total - this.promocodeDiscount);
    }

    getTotalWithDeliveryAndPromotions(): number {
        const cartTotal = this.getCartTotal();
        const totalWithDiscount = Math.max(0, cartTotal - this.promocodeDiscount);
        return totalWithDiscount + this.getDeliveryPrice();
    }

    async applyPromocode(): Promise<void> {
        if (!this.promocode.trim()) {
            this.toastService.show('Введите промокод', 'warning');
            return;
        }

        this.applyingPromocode = true;

        try {
            const response = await this.orderService.applyPromocode(this.promocode.trim()).toPromise();

            if (response) {
                // this.appliedPromocode = this.promocode;
                this.promocodeDiscount = response.discountAmount!;
                this.toastService.show(`Промокод применён! Скидка: ${response.discountAmount} р.`, 'success');
            }
        } catch (error: unknown) {
            console.error('Error applying promocode:', error);
            const errorMessage = (error as { error?: { message?: string } })?.error?.message || 'Промокод недействителен';
            this.toastService.show(errorMessage, 'error');
        } finally {
            this.applyingPromocode = false;
        }
    }

    removePromocode(): void {
        this.promocode = '';
        this.appliedPromocode = null;
        this.promocodeDiscount = 0;
        this.toastService.show('Промокод удалён', 'info');
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
