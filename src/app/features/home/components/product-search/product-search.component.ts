import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductModel } from '../../../../shared/models/product.model';
import { ProductService } from '../../../../shared/services/product.service';
import { ImageUrlPipe } from '../../../../shared/utils/image-url.pipe';

@Component({
    selector: 'app-product-search',
    templateUrl: './product-search.component.html',
    styleUrls: ['./product-search.component.scss'],
    imports: [CommonModule, FormsModule, ImageUrlPipe],
})
export class ProductSearchComponent implements OnInit, OnDestroy {
    @Output() closeSearch = new EventEmitter<void>();

    searchQuery = '';
    searchResults: ProductModel[] = [];
    isLoading = false;
    selectedIndex = -1;

    private searchSubject = new Subject<string>();
    private subscription?: Subscription;

    constructor(
        private productService: ProductService,
        private router: Router,
    ) {}

    ngOnInit(): void {
        this.subscription = this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(query => {
            this.performSearch(query);
        });

        setTimeout(() => {
            const input = document.querySelector('.search-input') as HTMLInputElement;
            input?.focus();
        }, 100);
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }

    onSearchInput(query: string): void {
        this.searchQuery = query;
        this.selectedIndex = -1;

        if (query.trim().length === 0) {
            this.searchResults = [];
            this.isLoading = false;
            return;
        }

        this.isLoading = true;
        this.searchSubject.next(query);
    }

    private performSearch(query: string): void {
        const filters = {
            title: query,
            limit: 8,
        };

        this.productService.getAll(filters).subscribe({
            next: response => {
                this.searchResults = response.data;
                this.isLoading = false;
            },
            error: error => {
                console.error('Search error:', error);
                this.searchResults = [];
                this.isLoading = false;
            },
        });
    }

    selectProduct(product: ProductModel): void {
        this.router.navigate(['/product', product.id]);
        this.close();
    }

    close(): void {
        this.closeSearch.emit();
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        this.close();
    }

    handleKeyboardEvent(event: KeyboardEvent): void {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.searchResults.length - 1);
                this.scrollToSelected();
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.scrollToSelected();
                break;
            case 'Enter':
                event.preventDefault();
                if (this.selectedIndex >= 0 && this.searchResults[this.selectedIndex]) {
                    this.selectProduct(this.searchResults[this.selectedIndex]);
                }
                break;
        }
    }

    private scrollToSelected(): void {
        setTimeout(() => {
            const selected = document.querySelector('.search-result-item.selected');
            selected?.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                block: 'nearest',
            });
        });
    }

    getProductImage(product: ProductModel): string {
        return product.image || 'assets/images/placeholder.png';
    }

    getProductPrice(product: ProductModel): string {
        if (product.isPriceHidden) {
            return 'Цена по запросу';
        }

        const variants = product.variants?.filter(variant => !variant.isDeleted);
        const defaultVariant = variants?.find(variant => variant.isDefault) || variants?.[0];
        if (defaultVariant?.promotionPrice) {
            return `${(defaultVariant.promotionPrice.finalCents / 100).toFixed(2)} р.`;
        }
        if (defaultVariant) {
            return `${defaultVariant.price} р.`;
        }

        return 'Нет в наличии';
    }
}
