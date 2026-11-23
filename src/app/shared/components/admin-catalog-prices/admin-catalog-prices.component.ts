import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, TemplateRef, ViewChild, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { catchError, finalize, of } from 'rxjs';
import { IconsModule } from '../../base/icons/icons.module';
import { BrandModel } from '../../models/brand.model';
import { ProductModel } from '../../models/product.model';
import {
    AdminCatalogPricesService,
    CatalogPriceChange,
    CatalogPricePreview,
    CatalogPriceReceipt,
} from '../../services/admin-catalog-prices.service';
import { ToastService } from '../../services/toast.service';

type PriceScope = 'products' | 'brand';
type CatalogProduct = Pick<ProductModel, 'id' | 'title' | 'fullTitle' | 'isDeleted'> & { brand?: Pick<BrandModel, 'title'> | null };
type CatalogBrand = Pick<BrandModel, 'id' | 'title'> & { isDeleted?: boolean };

const unconfirmedApply = 'Сервер не подтвердил изменение. Повторите подтверждение, чтобы проверить результат этой операции.';
const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'BYN', currencyDisplay: 'code' });

function parseBasisPoints(percent: string): number | null {
    const match = /^([+−-]?)(\d*)(?:[,.](\d{1,2}))?$/.exec(percent.trim());
    if (!match) return null;
    const [, sign, whole, fraction = ''] = match;
    const basisPoints = Number(whole + fraction.padEnd(2, '0')) * (sign === '-' || sign === '−' ? -1 : 1);
    return basisPoints !== 0 && basisPoints >= -10000 && basisPoints <= 2147483647 ? basisPoints : null;
}

@Component({
    selector: 'app-admin-catalog-prices',
    imports: [FormsModule, IconsModule],
    templateUrl: './admin-catalog-prices.component.html',
    styleUrl: './admin-catalog-prices.component.scss',
})
export class AdminCatalogPricesComponent implements OnInit {
    readonly products = input.required<CatalogProduct[]>();
    readonly brands = input.required<CatalogBrand[]>();
    readonly disabled = input(false);
    readonly applied = output<void>();

    @ViewChild('priceDialog', { static: true }) private dialogTemplate!: TemplateRef<unknown>;

    private readonly api = inject(AdminCatalogPricesService);
    private readonly modals = inject(NgbModal);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);
    private dialog?: NgbModalRef;
    private receipt?: CatalogPriceReceipt;

    protected available = false;
    protected scope: PriceScope = 'products';
    protected brandId = '';
    protected percent = '';
    protected readonly search = signal('');
    protected readonly selectedProductIds = new Set<string>();
    protected readonly activeBrands = computed(() => this.brands().filter(brand => !brand.isDeleted));
    private readonly activeProducts = computed(() =>
        this.products()
            .filter(product => !product.isDeleted)
            .sort((first, second) => first.title.localeCompare(second.title, 'ru')),
    );
    protected readonly matchingProducts = computed(() => {
        const query = this.search().trim().toLocaleLowerCase('ru');
        return this.activeProducts().filter(product =>
            [product.title, product.fullTitle, product.brand?.title].some(value => value?.toLocaleLowerCase('ru').includes(query)),
        );
    });
    protected preview?: CatalogPricePreview;
    protected pending: 'preview' | 'apply' | null = null;
    protected retryApply = false;
    protected error = '';

    ngOnInit(): void {
        this.destroyRef.onDestroy(() => this.dialog?.close());
        this.api
            .enabled()
            .pipe(
                catchError(() => of(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(enabled => (this.available = enabled));
    }

    get applying(): boolean {
        return this.pending === 'apply';
    }

    protected get basisPoints(): number | null {
        return parseBasisPoints(this.percent);
    }

    protected get canPreview(): boolean {
        const hasSelection = this.scope === 'brand' ? this.brandId !== '' : this.selectedProductIds.size > 0;
        return !this.pending && !this.retryApply && this.basisPoints !== null && hasSelection;
    }

    protected get canApply(): boolean {
        return !this.pending && !!this.receipt && (this.retryApply || !!this.preview?.changedCount);
    }

    protected get restoredChangeLabel(): string {
        const receipt = this.receipt;
        if (!this.retryApply || this.preview || !receipt) return '';
        const target =
            'brandId' in receipt
                ? this.activeBrands().find(brand => brand.id === receipt.brandId)?.title || 'Бренд'
                : `Выбрано товаров: ${receipt.productIds.length}`;
        const percent = (receipt.changeBasisPoints / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2, signDisplay: 'always' });
        return `${target} · ${percent}%`;
    }

    protected get launchDisabled(): boolean {
        return this.disabled() && !this.api.pendingReceipt;
    }

    protected open(): void {
        if (this.dialog || !this.available || this.launchDisabled) return;
        const pendingReceipt = this.api.pendingReceipt;
        this.retryApply = !!pendingReceipt;
        if (pendingReceipt) {
            this.receipt = pendingReceipt;
            this.error = unconfirmedApply;
        } else {
            this.changeScope('products');
            this.percent = '';
        }
        this.dialog = this.modals.open(this.dialogTemplate, {
            size: 'lg',
            windowClass: 'skviderm-admin-modal',
            ariaLabelledBy: 'bulk-price-dialog-title',
            backdrop: 'static',
            scrollable: true,
            beforeDismiss: () => !this.pending,
        });
        this.dialog.hidden.subscribe(() => (this.dialog = undefined));
    }

    protected changeScope(scope: PriceScope): void {
        this.scope = scope;
        this.brandId = '';
        this.selectedProductIds.clear();
        this.search.set('');
        this.clearPreview();
    }

    protected toggleProduct(productId: string, checked: boolean): void {
        if (checked) this.selectedProductIds.add(productId);
        else this.selectedProductIds.delete(productId);
        this.clearPreview();
    }

    protected clearPreview(): void {
        this.receipt = undefined;
        this.preview = undefined;
        this.error = '';
    }

    protected formatPrice(cents: number): string {
        return money.format(cents / 100);
    }

    protected calculate(): void {
        const changeBasisPoints = this.basisPoints;
        if (!this.canPreview || changeBasisPoints === null) return;
        const change: CatalogPriceChange =
            this.scope === 'brand'
                ? { brandId: this.brandId, changeBasisPoints }
                : { productIds: [...this.selectedProductIds], changeBasisPoints };
        this.clearPreview();
        this.pending = 'preview';
        this.api
            .preview(change)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => (this.pending = null)),
            )
            .subscribe({
                next: preview => {
                    this.preview = preview;
                    this.receipt = { ...change, operationId: preview.operationId, revision: preview.revision };
                },
                error: (error: HttpErrorResponse) => {
                    this.error =
                        error.status === 400 && typeof error.error === 'string'
                            ? error.error
                            : 'Не удалось рассчитать цены. Попробуйте ещё раз.';
                },
            });
    }

    protected apply(): void {
        if (!this.canApply || !this.receipt) return;
        this.error = '';
        this.pending = 'apply';
        this.api
            .apply(this.receipt)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => (this.pending = null)),
            )
            .subscribe({
                next: ({ updatedCount }) => {
                    this.retryApply = false;
                    this.clearPreview();
                    this.dialog?.close();
                    this.toast.show(`Обновлено цен: ${updatedCount}`, 'success');
                    this.applied.emit();
                },
                error: (error: HttpErrorResponse) => {
                    if (error.status === 409) {
                        this.retryApply = false;
                        this.clearPreview();
                        this.error = 'Каталог изменился. Рассчитайте цены заново.';
                    } else {
                        this.retryApply = !!this.api.pendingReceipt;
                        this.error = this.retryApply ? unconfirmedApply : 'Не удалось применить цены. Попробуйте ещё раз.';
                    }
                },
            });
    }
}
