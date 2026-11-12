import { PhoneAuthComponent } from '../../shared/components/phone-auth/phone-auth.component';
import { CartQuote, CheckoutDetails, CheckoutRequest } from '../../shared/models/checkout.model';
import { LoginModalService } from '../../shared/services/login-modal.service';
import { apiMessage } from '../../shared/utils/api-message';
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, firstValueFrom, Observable, Subscription } from 'rxjs';
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
    imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, IconsModule, ImageUrlPipe, PhoneAuthComponent],
})
export class OrderConfirmationComponent implements OnInit, OnDestroy {
    confirmationForm: FormGroup;
    phoneCheckout = false;
    checkoutQuote: CartQuote | null = null;
    checkoutError: string | null = null;
    quoteLoading = false;
    private quoteVersion = 0;
    private subscriptions = new Subscription();
    private savedPlacementId: number | null = null;
    private restoredCustomer: string | null = null;
    private orderSaved = false;
    get needsPhone(): boolean {
        return this.phoneCheckout && !this.authService.getCurrentUserSync()?.verifiedPhone;
    }
    get phonePurpose(): 'login' | 'link' {
        return this.authService.isLoggedIn() ? 'link' : 'login';
    }

    isSubmitting = false;
    publicOfferUrl = environment.public_offer_url;
    currentUser$: Observable<PersonModel | null> = new Observable<PersonModel | null>();
    cartItems$: BehaviorSubject<OrderProductModel[]> = new BehaviorSubject<OrderProductModel[]>([]);
    totalPrice$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    loading = true;
    postPlacements$: BehaviorSubject<PostPlacement[]> = new BehaviorSubject<PostPlacement[]>([]);
    filteredPostPlacements$: BehaviorSubject<PostPlacement[]> = new BehaviorSubject<PostPlacement[]>([]);
    postPlacementsLoading = true;
    postPlacementsError = false;
    activePlacementIndex = -1;
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
        public loginModalService: LoginModalService,
    ) {
        this.currentUser$ = this.authService.getCurrentUser();
        this.loadPostPlacements();

        this.confirmationForm = this.formBuilder.group({
            firstName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
            lastName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
            email: ['', [Validators.required, Validators.email]],
            phone: ['', [Validators.required, Validators.pattern(/^\+375 \(\d{2}\) \d{3}-\d{2}-\d{2}$/)]],
            city: [''],
            street: [''],
            house: [''],
            building: [''],
            apartment: [''],
            postalCode: [''],
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
            if (filterText !== this.selectedPlacementText) {
                this.confirmationForm.get('postPlacement')?.setValue('');
                this.selectedPlacementText = '';
            }
            this.filterPostPlacements(filterText || '');
            this.activePlacementIndex = -1;
            this.showDropdown = true;
        });

        this.confirmationForm.get('deliveryMethod')?.valueChanges.subscribe(() => {
            if (this.phoneCheckout) void this.refreshQuote().catch(() => undefined);
        });
        this.confirmationForm.get('courierDelivery')?.valueChanges.subscribe(() => {
            if (this.phoneCheckout) void this.refreshQuote().catch(() => undefined);
        });
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

    async ngOnInit(): Promise<void> {
        await this.authService.ready;
        this.phoneCheckout = this.authService.phoneCheckoutEnabled;
        if (this.phoneCheckout) {
            this.confirmationForm.get('email')?.setValidators([Validators.email]);
            this.confirmationForm.get('email')?.updateValueAndValidity({ emitEvent: false });
            await this.cartService.ready;
            this.subscriptions.add(
                this.cartService.quote$.subscribe(quote => {
                    if (!quote || this.orderSaved) return;
                    this.currentOrder = quote.order;
                    this.cartItems$.next(quote.order.products);
                    this.totalPrice$.next(quote.totalCents / 100);
                    void this.refreshQuote().catch(() => undefined);
                }),
            );
        } else {
            if (!this.authService.isLoggedIn()) {
                void this.router.navigate(['/']);
                return;
            }
            this.loadCartItems();
        }
        this.subscriptions.add(
            this.currentUser$.subscribe(user => {
                if (user) {
                    this.confirmationForm.patchValue({
                        firstName: user.firstName || '',
                        lastName: user.secondName || '',
                        email: this.phoneCheckout && user.verifiedPhone ? user.contactEmail || '' : user.email || '',
                        phone: this.formatBelarusPhone(user.verifiedPhone || user.phone || ''),
                    });
                    if (this.phoneCheckout && this.restoredCustomer !== user.id) {
                        this.restoredCustomer = user.id;
                        this.restoreDelivery(user.checkoutDetails);
                    }
                }
                this.loading = false;
            }),
        );
        this.loading = false;
        if (this.phoneCheckout && this.authService.isLoggedIn()) await this.recoverOrder().catch(() => false);
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        this.quoteVersion++;
    }

    private restoreDelivery(details: CheckoutDetails | null | undefined): void {
        if (!details) return;
        this.confirmationForm.patchValue({
            deliveryMethod: details.deliveryMethod,
            courierDelivery: details.isCourierDelivery,
            paymentMethod: details.paymentMethod,
            city: details.address?.city || '',
            street: details.address?.street || '',
            house: details.address?.house || '',
            building: details.address?.building || '',
            apartment: details.address?.apartment || '',
            postalCode: details.address?.postalCode || '',
        });
        this.savedPlacementId = details.postPlacementId;
        this.restorePlacement();
    }

    private restorePlacement(): void {
        const placement = this.postPlacements$.value.find(item => item.id === this.savedPlacementId);
        if (placement && this.confirmationForm.get('deliveryMethod')?.value === 'post') this.selectPostPlacement(placement);
    }

    async phoneAuthenticated(): Promise<void> {
        this.checkoutError = null;
        try {
            await this.cartService.refresh();
            await this.refreshQuote();
            await this.recoverOrder();
        } catch (error) {
            this.checkoutError = apiMessage(error);
        }
    }

    async refreshQuote(): Promise<void> {
        const cart = this.cartService.currentQuote;
        if (!this.phoneCheckout || !cart || this.orderSaved) return;
        const version = ++this.quoteVersion;
        this.quoteLoading = true;
        try {
            const quote = await this.orderService.quoteCart({
                items: cart.items,
                promoCode: cart.promoCode,
                deliveryMethod: this.confirmationForm.get('deliveryMethod')?.value,
                isCourierDelivery: this.confirmationForm.get('courierDelivery')?.value,
            });
            if (version === this.quoteVersion) {
                this.checkoutQuote = quote;
                this.promocodeDiscount = quote.promoCodeDiscountCents / 100;
            }
        } catch (error) {
            if (version === this.quoteVersion) this.checkoutError = apiMessage(error, 'Не удалось проверить итог заказа');
            throw error;
        } finally {
            if (version === this.quoteVersion) this.quoteLoading = false;
        }
    }

    private pendingKey(): string {
        return `skviderm.checkout.${this.authService.getCurrentUserSync()?.id || ''}`;
    }

    private pendingAttempt(): { key: string; cartId: string } | null {
        try {
            const pending = JSON.parse(sessionStorage.getItem(this.pendingKey()) || 'null');
            return pending && /^[0-9a-f-]{36}$/i.test(pending.key) && /^[0-9a-f-]{36}$/i.test(pending.cartId) ? pending : null;
        } catch {
            return null;
        }
    }

    get hasPendingOrder(): boolean {
        return this.phoneCheckout && !!this.pendingAttempt();
    }

    async retryPreviousOrder(): Promise<void> {
        if (this.isSubmitting) return;
        this.isSubmitting = true;
        this.checkoutError = null;
        try {
            if (!(await this.recoverOrder())) {
                this.checkoutError = 'Предыдущий заказ пока не найден. Проверьте корзину перед оформлением.';
                await this.cartService.refresh();
                await this.refreshQuote();
            }
        } catch (error) {
            this.checkoutError = apiMessage(error, 'Не удалось проверить заказ. Попробуйте ещё раз.');
        } finally {
            this.isSubmitting = false;
        }
    }

    private async recoverOrder(): Promise<boolean> {
        const pending = this.pendingAttempt();
        if (!pending) return false;
        try {
            const order = await this.orderService.findCheckoutAttempt(pending.key);
            if (!order) return false;
            this.orderSaved = true;
            sessionStorage.removeItem(this.pendingKey());
            this.cartService.clearAfterCheckout();
            this.toastService.show('Ваш заказ уже сохранён', 'success');
            await this.router.navigate(['/order', order.id]);
            return true;
        } catch (error) {
            this.checkoutError = apiMessage(error, 'Пока не удалось проверить предыдущий заказ. Повторите проверку');
            throw error;
        }
    }

    private checkoutDetails(): CheckoutDetails {
        const value = this.confirmationForm.getRawValue();
        const placement = this.postPlacements$.value.find(item => item.id === value.postPlacement);
        return {
            firstName: value.firstName.trim(),
            secondName: value.lastName.trim(),
            email: value.email?.trim() || null,
            deliveryMethod: value.deliveryMethod,
            paymentMethod: value.paymentMethod,
            isCourierDelivery: value.courierDelivery,
            address: {
                city: value.city,
                street: value.street,
                house: value.house,
                building: value.building,
                apartment: value.apartment,
                postalCode: value.postalCode,
            },
            postPlacementId: value.deliveryMethod === 'post' ? placement?.id || null : null,
            deliveryPostAddress:
                value.deliveryMethod === 'post' && placement ? `Отделение №${placement.number} - ${placement.address}` : null,
            comment: value.comments?.trim() || null,
            offerConsent: value.offerConsent,
        };
    }

    private async confirmPhoneOrder(): Promise<void> {
        if (this.isSubmitting || this.orderSaved) return;
        if (this.needsPhone) {
            this.checkoutError = 'Сначала подтвердите номер телефона';
            return;
        }
        if (this.confirmationForm.invalid) {
            this.markFormGroupTouched();
            this.scrollToFirstError();
            return;
        }
        this.isSubmitting = true;
        this.checkoutError = null;
        try {
            if (await this.recoverOrder()) return;
            await this.cartService.flushPendingUpdates();
            if (this.cartService.hasUnavailableItems || !this.cartService.currentQuote?.items.length) {
                this.checkoutError = 'Проверьте товары в корзине перед оформлением';
                return;
            }
            const shownTotal = this.checkoutQuote?.totalCents;
            await this.refreshQuote();
            if (this.checkoutQuote?.promoCodeError) {
                this.checkoutError = this.checkoutQuote.promoCodeError;
                return;
            }
            if (shownTotal !== this.checkoutQuote?.totalCents) {
                this.checkoutError = 'Итог изменился. Проверьте сумму и подтвердите заказ ещё раз';
                return;
            }
            const cart = this.cartService.currentQuote!;
            const pending = this.pendingAttempt();
            const key = pending?.cartId === cart.order.id ? pending.key : crypto.randomUUID();
            sessionStorage.setItem(this.pendingKey(), JSON.stringify({ key, cartId: cart.order.id }));
            const request: CheckoutRequest = {
                checkoutKey: key,
                cartId: cart.order.id,
                expectedRevision: cart.order.cartRevision!,
                items: cart.items,
                promoCode: cart.promoCode,
                expectedTotalCents: this.checkoutQuote!.totalCents,
                details: this.checkoutDetails(),
            };
            const order = await this.orderService.confirmCheckout(request);
            this.orderSaved = true;
            sessionStorage.removeItem(this.pendingKey());
            this.cartService.clearAfterCheckout();
            this.toastService.show('Заказ оформлен', 'success');
            if (order.paymentMethod === 'online') {
                try {
                    const payment = await firstValueFrom(this.paymentService.processPayment(order));
                    window.location.assign(payment.formUrl);
                    return;
                } catch (error) {
                    this.toastService.show(apiMessage(error, 'Заказ сохранён. Перейти к оплате можно со страницы заказа'), 'warning');
                }
            }
            await this.router.navigate(['/order', order.id]);
        } catch (error) {
            this.checkoutError = apiMessage(error, 'Не удалось получить подтверждение. Повторите проверку — второй заказ создан не будет');
            if ((error as { status: number }).status === 409) {
                await this.cartService.refresh();
                await this.refreshQuote();
            }
        } finally {
            this.isSubmitting = false;
        }
    }

    async confirmOrder(): Promise<void> {
        if (this.phoneCheckout) {
            await this.confirmPhoneOrder();
            return;
        }
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

        try {
            await this.cartService.flushPendingUpdates();
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
            const result = await this.cartService.checkout(this.confirmationForm.get('paymentMethod')?.value === 'online');

            if (result) {
                this.toastService.show('Заказ успешно оформлен!', 'success');
                if (this.confirmationForm.get('paymentMethod')?.value === 'online') {
                    const orderMinimal = await firstValueFrom(this.orderService.getMinimalById(this.currentOrder!.id));
                    const paymentResponse = await this.paymentService.processPayment(orderMinimal!).toPromise();
                    if (paymentResponse && paymentResponse.formUrl) {
                        window.location.href = paymentResponse.formUrl;
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
        const firstInvalid = document.querySelector<HTMLElement>('.form-control.is-invalid, .form-check-input.is-invalid, .is-invalid');
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
        if (this.phoneCheckout) return this.checkoutQuote?.order.deliveryCost || 0;
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
        const promotions = this.phoneCheckout ? item.product.promotions || [] : this.productPromotions[item.product.id] || [];
        return calculateDiscountedPrice(item.variant.price, promotions);
    }

    getItemTotal(item: OrderProductModel): number {
        const priceInfo = this.getItemPriceInfo(item);
        const price = priceInfo.hasDiscount ? priceInfo.discountedPrice! : priceInfo.originalPrice;
        return price * item.quantity;
    }

    getCartTotal(): number {
        if (this.phoneCheckout)
            return this.checkoutQuote ? (this.checkoutQuote.subtotalCents - this.checkoutQuote.promotionDiscountCents) / 100 : 0;
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
        if (this.phoneCheckout) return (this.checkoutQuote?.totalCents || 0) / 100;
        const cartTotal = this.getCartTotal();
        const totalWithDiscount = Math.max(0, cartTotal - this.promocodeDiscount);
        return totalWithDiscount + this.getDeliveryPrice();
    }

    async applyPromocode(): Promise<void> {
        if (this.phoneCheckout) {
            this.applyingPromocode = true;
            try {
                await this.cartService.applyPhonePromocode(this.promocode);
                await this.refreshQuote();
            } catch (error) {
                this.checkoutError = apiMessage(error);
            } finally {
                this.applyingPromocode = false;
            }
            return;
        }
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
        if (this.phoneCheckout) {
            this.promocode = '';
            void this.cartService
                .applyPhonePromocode(null)
                .then(() => this.refreshQuote())
                .catch(error => {
                    this.checkoutError = apiMessage(error);
                });
            return;
        }
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
        this.confirmationForm.get('postPlacementFilter')?.setValue(this.selectedPlacementText, { emitEvent: false });
        this.showDropdown = false;

        this.confirmationForm.get('postPlacementFilter')?.updateValueAndValidity({ emitEvent: false });
    }

    onFilterFocus(): void {
        this.showDropdown = true;
        this.filterPostPlacements('');
    }

    onFilterBlur(): void {
        setTimeout(() => {
            this.showDropdown = false;
            this.confirmationForm.get('postPlacementFilter')?.markAsTouched();
        }, 150);
    }

    onPlacementKeydown(event: KeyboardEvent): void {
        const placements = this.filteredPostPlacements$.value;
        if (event.key === 'Escape') {
            this.showDropdown = false;
            event.preventDefault();
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            this.showDropdown = true;
            this.activePlacementIndex = placements.length
                ? Math.max(0, Math.min(placements.length - 1, this.activePlacementIndex + (event.key === 'ArrowDown' ? 1 : -1)))
                : -1;
            document.getElementById(`placement-${this.activePlacementIndex}`)?.scrollIntoView({ block: 'nearest' });
        } else if (event.key === 'Enter' && this.showDropdown && placements[this.activePlacementIndex]) {
            event.preventDefault();
            this.selectPostPlacement(placements[this.activePlacementIndex]);
        }
    }

    loadPostPlacements(): void {
        this.postPlacementsLoading = true;
        this.postPlacementsError = false;
        this.getPostPlacements().subscribe({
            next: data => {
                this.postPlacementsLoading = false;
                this.postPlacementsError = data.status !== 'success';
                if (data.status === 'success') {
                    this.postPlacements$.next(data.data);
                    this.filteredPostPlacements$.next(data.data);
                    this.restorePlacement();
                }
            },
            error: () => {
                this.postPlacementsLoading = false;
                this.postPlacementsError = true;
            },
        });
    }

    private validPostPlacementValidator(): ValidatorFn {
        return (control: AbstractControl): Record<string, unknown> | null => {
            if (!control.value) {
                return null;
            }

            const allPlacements = this.postPlacements$.getValue();
            const isValid = allPlacements.some(placement => {
                const placementText = `Отделение №${placement.number} - ${placement.address}`;
                return placementText === control.value && placement.id === this.confirmationForm.get('postPlacement')?.value;
            });

            return isValid ? null : { invalidPostPlacement: { value: control.value } };
        };
    }

    getPostPlacements(): Observable<ListResponse<PostPlacement>> {
        return this.postService.getPostPlacements();
    }
}
