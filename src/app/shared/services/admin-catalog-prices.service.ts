import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { defer, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SingleResponse } from '../base/schemas/base_schema';

export type CatalogPriceChange = ({ brandId: string } | { productIds: string[] }) & {
    changeBasisPoints: number;
};

export interface CatalogPricePreview {
    operationId: string;
    revision: string;
    changedCount: number;
    items: {
        variantId: string;
        productId: string;
        title: string;
        volume: number;
        oldPriceCents: number;
        newPriceCents: number;
    }[];
}

export type CatalogPriceReceipt = CatalogPriceChange & Pick<CatalogPricePreview, 'operationId' | 'revision'>;

const receiptStorageKey = 'skviderm.admin.catalog-prices.pending';

@Injectable({ providedIn: 'root' })
export class AdminCatalogPricesService {
    private readonly http = inject(HttpClient);
    private readonly url = environment.server_url + '/admin/catalog-prices';
    private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
    private unresolvedReceipt = this.readReceipt();

    get pendingReceipt(): CatalogPriceReceipt | undefined {
        return this.unresolvedReceipt;
    }

    enabled() {
        return this.http
            .get<SingleResponse<{ enabled: boolean }>>(this.url)
            .pipe(map(response => response.status === 'success' && response.data?.enabled === true));
    }

    preview(change: CatalogPriceChange) {
        return this.http.post<SingleResponse<CatalogPricePreview>>(this.url + '/preview', change).pipe(map(response => response.data));
    }

    apply(receipt: CatalogPriceReceipt) {
        return defer(() => {
            const retry = !!this.unresolvedReceipt;
            this.storeReceipt(receipt);
            return this.http.post<SingleResponse<{ updatedCount: number }>>(this.url + '/apply', receipt).pipe(
                map(response => {
                    if (response.status !== 'success' || !Number.isInteger(response.data?.updatedCount)) {
                        throw new Error('Invalid catalog price apply response');
                    }
                    return response.data;
                }),
                tap({
                    next: () => this.storeReceipt(),
                    error: (error: HttpErrorResponse) => {
                        if (error.status === 409 || (!retry && error.status >= 400 && error.status < 500)) this.storeReceipt();
                    },
                }),
            );
        });
    }

    private readReceipt(): CatalogPriceReceipt | undefined {
        if (!this.browser) return undefined;
        try {
            const receipt = JSON.parse(sessionStorage.getItem(receiptStorageKey) ?? 'null') as CatalogPriceReceipt | null;
            if (
                typeof receipt?.operationId === 'string' &&
                typeof receipt.revision === 'string' &&
                Number.isInteger(receipt.changeBasisPoints) &&
                ('brandId' in receipt ? typeof receipt.brandId === 'string' : Array.isArray(receipt.productIds))
            ) {
                return receipt;
            }
        } catch {
            return undefined;
        }
        return undefined;
    }

    private storeReceipt(receipt?: CatalogPriceReceipt): void {
        this.unresolvedReceipt = receipt;
        if (!this.browser) return;
        try {
            if (receipt) sessionStorage.setItem(receiptStorageKey, JSON.stringify(receipt));
            else sessionStorage.removeItem(receiptStorageKey);
        } catch {
            // The in-memory receipt still covers navigation within this tab.
        }
    }
}
