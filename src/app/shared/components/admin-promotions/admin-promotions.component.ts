import { formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnInit, ViewChild, inject, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, distinctUntilChanged, map, of, switchMap, timer } from 'rxjs';
import { IconsModule } from '../../base/icons/icons.module';
import { DiscountType, TargetType } from '../../models/promotion.model';
import { AdminPromotion, AdminPromotionInput, AdminPromotionService, PromotionProduct } from '../../services/admin-promotion.service';
import { calculatePromotionSavingCents } from '../../utils/promotion.utils';

const statuses = {
    active: 'Действует',
    scheduled: 'Запланирована',
    draft: 'Черновик',
    ended: 'Завершилась',
    paused: 'Выключена',
};
const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'BYN', currencyDisplay: 'code' });
const minskOffset = '+0300';

function dateInput(value?: string | null): string {
    return value ? formatDate(value, "yyyy-MM-dd'T'HH:mm", 'en-US', minskOffset) : '';
}

function dateOutput(value: string, original?: string | null): string | null {
    if (value === dateInput(original)) return original ?? null;
    const date = new Date(value + '+03:00');
    return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function isManagedTarget(promotion: AdminPromotionInput): boolean {
    return promotion.targetType === TargetType.ALL || promotion.targetType === TargetType.PRODUCT;
}

function includesProduct(promotion: AdminPromotionInput, id: string): boolean {
    return promotion.targetType === TargetType.ALL || (promotion.targetType === TargetType.PRODUCT && !!promotion.productIds?.includes(id));
}

@Component({
    selector: 'app-admin-promotions',
    imports: [ReactiveFormsModule, IconsModule],
    templateUrl: './admin-promotions.component.html',
    styleUrl: './admin-promotions.component.scss',
})
export class AdminPromotionsComponent implements OnInit {
    readonly unavailable = output<void>();
    private readonly api = inject(AdminPromotionService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly fb = inject(NonNullableFormBuilder);
    private searchInput?: ElementRef<HTMLInputElement>;

    @ViewChild('searchInput') set pickerSearch(input: ElementRef<HTMLInputElement> | undefined) {
        this.searchInput = input;
        input?.nativeElement.focus();
    }

    readonly statuses = statuses;
    readonly statusKeys = Object.keys(statuses) as (keyof typeof statuses)[];
    readonly statusFilter = new FormControl<'all' | keyof typeof statuses>('all', { nonNullable: true });
    readonly form = this.fb.group({
        title: '',
        discountType: DiscountType.PERCENTAGE,
        discountValue: new FormControl<number | null>(null),
        targetType: TargetType.ALL,
        validFrom: '',
        validUntil: '',
    });
    readonly search = this.fb.control('');
    readonly previewProductId = this.fb.control('');
    readonly maxProducts = 200;

    promotions: AdminPromotion[] = [];
    editing: AdminPromotion | null = null;
    editorOpen = false;
    loading = false;
    saving = false;
    error = '';
    feedback = '';

    pickerOpen = false;
    selectedProducts: PromotionProduct[] = [];
    selectedProductsError = false;
    sampleProducts: PromotionProduct[] = [];
    samplesLoaded = false;
    samplesLoading = false;
    matches: PromotionProduct[] | null = [];
    searchError = false;

    ngOnInit(): void {
        this.search.valueChanges
            .pipe(
                map(value => value.trim()),
                distinctUntilChanged(),
                switchMap(query => {
                    this.searchError = false;
                    if (!query) return of([]);
                    this.matches = null;
                    return timer(300).pipe(
                        switchMap(() => this.api.products({ q: query })),
                        catchError(() => {
                            this.searchError = true;
                            return of([]);
                        }),
                    );
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(matches => (this.matches = matches));
        this.load();
    }

    load(): void {
        this.loading = true;
        this.error = '';
        this.api
            .list()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: promotions => {
                    this.promotions = promotions;
                    this.loading = false;
                },
                error: (error: HttpErrorResponse) => {
                    this.loading = false;
                    if (error.status === 404) this.unavailable.emit();
                    else this.error = 'Не удалось загрузить акции.';
                },
            });
    }

    get visiblePromotions(): AdminPromotion[] {
        const filter = this.statusFilter.value;
        return filter === 'all' ? this.promotions : this.promotions.filter(promotion => this.status(promotion) === filter);
    }

    status(promotion: AdminPromotion): keyof typeof statuses {
        if (promotion.isDraft) return 'draft';
        if (!promotion.isActive) return 'paused';
        const now = Date.now();
        if (promotion.validUntil && Date.parse(promotion.validUntil) < now) return 'ended';
        if (promotion.validFrom && Date.parse(promotion.validFrom) > now) return 'scheduled';
        return 'active';
    }

    scopeLabel(promotion: AdminPromotionInput): string {
        switch (promotion.targetType) {
            case TargetType.PRODUCT:
                return 'Выбранные товары · ' + (promotion.productIds?.length ?? 0);
            case TargetType.BRAND:
                return 'Бренд';
            case TargetType.CATEGORY:
                return 'Категория';
            default:
                return 'Весь каталог';
        }
    }

    formatPrice(cents: number): string {
        return money.format(cents / 100);
    }

    formatDate(value: string): string {
        return formatDate(value, 'dd.MM.yyyy HH:mm', 'en-US', minskOffset);
    }

    discountLabel({ discountType, discountValue }: AdminPromotionInput): string {
        if (!discountValue) return '—';
        return discountType === DiscountType.PERCENTAGE
            ? '−' + discountValue.toLocaleString('ru-RU') + '%'
            : '−' + this.formatPrice(Math.round(discountValue * 100));
    }

    get hasPendingChanges(): boolean {
        return this.saving || (this.editorOpen && this.form.dirty);
    }

    canLeave(): boolean {
        if (this.saving) return false;
        return !this.hasPendingChanges || window.confirm('Есть несохранённые изменения. Выйти без сохранения?');
    }

    openEditor(promotion: AdminPromotion | null = null): void {
        this.editing = promotion;
        this.editorOpen = true;
        this.feedback = '';
        this.error = '';
        this.search.reset();
        this.previewProductId.reset();
        this.pickerOpen = false;
        this.selectedProductsError = false;
        this.selectedProducts = (promotion?.productIds ?? []).map(id => ({
            id,
            title: id,
            fullTitle: '',
            brandTitle: '',
            priceCents: null,
        }));
        this.form.reset({
            title: promotion?.title ?? '',
            discountType: promotion?.discountType ?? DiscountType.PERCENTAGE,
            discountValue: promotion?.discountValue || null,
            targetType: promotion?.targetType ?? TargetType.ALL,
            validFrom: dateInput(promotion?.validFrom),
            validUntil: dateInput(promotion?.validUntil),
        });
        if (this.isLegacyTarget) return;
        this.loadSamples();
        this.loadSelectedProducts();
    }

    closeEditor(): void {
        if (!this.canLeave()) return;
        this.editorOpen = false;
        this.editing = null;
        this.error = '';
    }

    loadSamples(): void {
        if (this.samplesLoaded || this.samplesLoading) return;
        this.samplesLoading = true;
        this.api
            .products()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: products => {
                    this.sampleProducts = products;
                    this.samplesLoaded = true;
                    this.samplesLoading = false;
                },
                error: () => (this.samplesLoading = false),
            });
    }

    loadSelectedProducts(): void {
        const editing = this.editing;
        const ids = this.selectedProducts.map(product => product.id);
        if (!ids.length) return;
        this.selectedProductsError = false;
        this.api
            .products({ ids: ids.join(',') })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: products => {
                    if (this.editing !== editing) return;
                    const byId = new Map(products.map(product => [product.id, product]));
                    this.selectedProducts = this.selectedProducts.map(product => byId.get(product.id) ?? product);
                },
                error: () => {
                    if (this.editing === editing) this.selectedProductsError = true;
                },
            });
    }

    get isLegacyTarget(): boolean {
        return !!this.editing && !isManagedTarget(this.editing);
    }

    get productMatches(): PromotionProduct[] {
        const products = this.search.value.trim() ? (this.matches ?? []) : this.sampleProducts;
        const selected = new Set(this.selectedProducts.map(product => product.id));
        return products.filter(product => !selected.has(product.id));
    }

    togglePicker(): void {
        this.pickerOpen = !this.pickerOpen;
    }

    selectProduct(product: PromotionProduct): void {
        if (this.selectedProducts.length >= this.maxProducts || this.selectedProducts.some(item => item.id === product.id)) return;
        this.selectedProducts = [...this.selectedProducts, product];
        this.form.markAsDirty();
        this.searchInput?.nativeElement.focus();
    }

    removeProduct(id: string): void {
        this.selectedProducts = this.selectedProducts.filter(item => item.id !== id);
        this.form.markAsDirty();
    }

    get previewProducts(): PromotionProduct[] {
        const chosen = this.form.controls.targetType.value === TargetType.PRODUCT ? this.selectedProducts : [];
        const unique = new Map<string, PromotionProduct>();
        for (const product of [...chosen, ...this.sampleProducts]) {
            if (product.priceCents !== null && !unique.has(product.id)) unique.set(product.id, product);
        }
        return [...unique.values()];
    }

    get previewProduct(): PromotionProduct | undefined {
        const products = this.previewProducts;
        return products.find(item => item.id === this.previewProductId.value) ?? products[0];
    }

    get editorInput(): AdminPromotionInput {
        const form = this.form.getRawValue();
        return {
            title: form.title.trim(),
            targetType: form.targetType,
            productIds: form.targetType === TargetType.PRODUCT ? this.selectedProducts.map(product => product.id) : [],
            discountType: form.discountType,
            discountValue: form.discountValue ?? 0,
            validFrom: dateOutput(form.validFrom, this.editing?.validFrom),
            validUntil: dateOutput(form.validUntil, this.editing?.validUntil),
            isDraft: true,
            isActive: false,
        };
    }

    private validDiscount(input: AdminPromotionInput): boolean {
        return (
            Number.isFinite(input.discountValue) &&
            (input.discountType === DiscountType.PERCENTAGE ? input.discountValue <= 100 : input.discountValue <= 1_000_000) &&
            calculatePromotionSavingCents(10000, input.discountType, input.discountValue) > 0
        );
    }

    private dateError(input: AdminPromotionInput): string {
        if (!input.validFrom || !input.validUntil || Date.parse(input.validFrom) >= Date.parse(input.validUntil)) {
            return 'Окончание акции должно быть позже начала.';
        }
        if (Date.parse(input.validUntil) < Date.now()) return 'Дата окончания должна быть в будущем.';
        return '';
    }

    get preview() {
        const product = this.previewProduct;
        if (!product || product.priceCents === null) return null;
        const input = this.editorInput;
        const base = product.priceCents;
        const applies = includesProduct(input, product.id);
        const usable = this.validDiscount(input) && !this.dateError(input);
        const proposed = usable && applies ? calculatePromotionSavingCents(base, input.discountType, input.discountValue) : 0;
        const onDate = Math.max(Date.now(), input.validFrom ? Date.parse(input.validFrom) : 0);
        let better = 0;
        let bestOffer: AdminPromotion | undefined;
        for (const promotion of this.promotions) {
            if (
                promotion.id === this.editing?.id ||
                !promotion.isActive ||
                promotion.isDraft ||
                !promotion.validFrom ||
                !promotion.validUntil ||
                Date.parse(promotion.validFrom) > onDate ||
                Date.parse(promotion.validUntil) < onDate ||
                !includesProduct(promotion, product.id)
            )
                continue;
            const saving = calculatePromotionSavingCents(base, promotion.discountType, promotion.discountValue);
            const winsTie =
                bestOffer &&
                (promotion.priority > bestOffer.priority || (promotion.priority === bestOffer.priority && promotion.id < bestOffer.id));
            if (saving > better || (saving === better && winsTie)) {
                better = saving;
                bestOffer = promotion;
            }
        }
        let note = 'На товар действует одна самая выгодная акция.';
        if (bestOffer && better > proposed) note = 'Применится «' + bestOffer.title + '» со скидкой ' + this.formatPrice(better) + '.';
        else if (bestOffer && better === proposed) note = 'Обе акции дают одинаковую цену.';
        else if (bestOffer) note = 'Новая акция выгоднее, чем «' + bestOffer.title + '» со скидкой ' + this.formatPrice(better) + '.';
        return {
            base,
            proposed: !applies ? 'Товар вне акции' : usable ? this.formatPrice(base - proposed) : '—',
            final: base - Math.max(proposed, better),
            note,
        };
    }

    get publishLabel(): string {
        const start = this.editorInput.validFrom;
        if (start && Date.parse(start) > Date.now()) return 'Запланировать';
        return this.editing?.isActive ? 'Сохранить изменения' : 'Опубликовать';
    }

    saveDraftOrPublish(asDraft: boolean): void {
        if (this.isLegacyTarget || this.saving) return;
        const input = this.editorInput;
        input.isDraft = asDraft;
        input.isActive = !asDraft;
        this.error = '';
        if (!input.title || (input.title.length > 80 && input.title !== this.editing?.title)) {
            this.error = 'Введите название акции до 80 символов.';
        } else if (!asDraft) {
            if (input.targetType === TargetType.PRODUCT && !input.productIds?.length) {
                this.error = 'Выберите хотя бы один товар.';
            } else if (!this.validDiscount(input)) {
                this.error =
                    input.discountType === DiscountType.PERCENTAGE
                        ? 'Укажите скидку больше 0 и до 100%.'
                        : 'Укажите сумму скидки больше 0.';
            } else {
                this.error = this.dateError(input);
            }
        }
        if (!this.error) this.save(input);
    }

    pause(): void {
        if (!this.editing?.isActive || this.saving) return;
        if (this.form.dirty && !window.confirm('Выключить акцию и выйти без сохранения изменений?')) return;
        const { title, targetType, productIds, discountType, discountValue, validFrom, validUntil, isDraft } = this.editing;
        this.save({
            title,
            targetType,
            productIds: productIds ?? [],
            discountType,
            discountValue,
            validFrom,
            validUntil,
            isDraft,
            isActive: false,
        });
    }

    private save(input: AdminPromotionInput): void {
        this.error = '';
        this.saving = true;
        this.api
            .save(input, this.editing?.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: promotion => {
                    const index = this.promotions.findIndex(item => item.id === promotion.id);
                    if (index === -1) this.promotions = [promotion, ...this.promotions];
                    else this.promotions[index] = promotion;
                    const state = this.status(promotion);
                    if (state === 'draft') this.feedback = 'Черновик сохранён.';
                    else if (state === 'paused') this.feedback = 'Акция выключена.';
                    else if (state === 'scheduled') this.feedback = 'Акция запланирована.';
                    else this.feedback = 'Изменения сохранены.';
                    this.editorOpen = false;
                    this.editing = null;
                    this.statusFilter.reset();
                    this.saving = false;
                },
                error: (error: HttpErrorResponse) => {
                    const message = typeof error.error === 'string' ? error.error.trim() : '';
                    this.error = error.status >= 400 && error.status < 500 && message ? message : 'Не удалось сохранить акцию.';
                    this.saving = false;
                },
            });
    }
}
