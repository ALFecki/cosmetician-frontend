import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-pagination',
    templateUrl: './pagination.component.html',
    styleUrls: ['./pagination.component.scss'],
    imports: [FormsModule],
})
export class PaginationComponent implements OnChanges {
    @Input() totalItems = 0;
    @Input() itemsPerPage = 10;
    @Input() currentPage = 1;
    @Input() pageSizeOptions: number[] = [10, 20, 50];

    @Output() pageChange = new EventEmitter<number>();
    @Output() itemsPerPageChange = new EventEmitter<number>();

    totalPages = 0;
    Math = Math;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['totalItems'] || changes['itemsPerPage']) {
            this.calculateTotalPages();
        }
    }

    calculateTotalPages(): void {
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    }

    onPageChange(page: number): void {
        if (page < 1 || page > this.totalPages || page === this.currentPage) {
            return;
        }
        this.pageChange.emit(page);
    }

    onItemsPerPageChange(event: Event): void {
        const value = parseInt((event.target as HTMLSelectElement).value, 10);
        this.itemsPerPageChange.emit(value);
    }

    getPageRange(): number[] {
        const maxPagesToShow = 5;
        const pages: number[] = [];

        let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = startPage + maxPagesToShow - 1;

        if (endPage > this.totalPages) {
            endPage = this.totalPages;
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return pages;
    }
}
