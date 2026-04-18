/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { IconsModule } from '../../base/icons/icons.module';
import { ImageUrlPipe } from '../../utils/image-url.pipe';
import { IconName } from 'ngx-bootstrap-icons';

@Component({
    selector: 'app-generic-table',
    imports: [CommonModule, IconsModule, ImageUrlPipe],
    templateUrl: './generic-table.component.html',
    styleUrls: ['./generic-table.component.scss'],
})
export class GenericTableComponent implements OnChanges {
    @ViewChild('tableContainer') tableContainer!: ElementRef;

    @Input() data: any[] = [];
    @Input() columns: { key: string; title: string; type?: string }[] = [];
    @Input() key = '';

    @Output() editItem = new EventEmitter<any>();
    @Output() deleteItem = new EventEmitter<any>();
    @Output() cascadeDeleteItem = new EventEmitter<any>();
    @Output() restoreItem = new EventEmitter<any>();

    isDragging = false;
    startX = 0;
    scrollLeft = 0;
    expandedCells = new Set<string>();

    sortedData: any[] = [];
    sortColumn: string | null = null;
    sortDirection: 'asc' | 'desc' | null = null;

    private readonly UNSORTABLE_TYPES = ['image', 'variants', 'array'];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data']) {
            this.sortedData = [...this.data];
            if (this.sortColumn && this.sortDirection) {
                this.applySorting();
            }
        }
    }

    startDrag(e: MouseEvent): void {
        this.isDragging = true;
        this.startX = e.pageX - this.tableContainer.nativeElement.offsetLeft;
        this.scrollLeft = this.tableContainer.nativeElement.scrollLeft;
        this.tableContainer.nativeElement.style.cursor = 'grabbing';
        e.preventDefault();
    }

    onDrag(e: MouseEvent): void {
        if (!this.isDragging) return;
        e.preventDefault();
        const x = e.pageX - this.tableContainer.nativeElement.offsetLeft;
        const walk = (x - this.startX) * 2;
        this.tableContainer.nativeElement.scrollLeft = this.scrollLeft - walk;
    }

    stopDrag(): void {
        this.isDragging = false;
        this.tableContainer.nativeElement.style.cursor = 'grab';
    }

    onEdit(item: any): void {
        this.editItem.emit(item);
    }

    onDelete(item: any): void {
        this.deleteItem.emit(item);
    }

    onCascadeDelete(item: any): void {
        this.cascadeDeleteItem.emit(item);
    }

    onRestore(item: any): void {
        this.restoreItem.emit(item);
    }

    sortBy(columnKey: string, columnType?: string): void {
        if (this.isUnsortable(columnType)) return;

        if (this.sortColumn === columnKey) {
            if (this.sortDirection === 'asc') {
                this.sortDirection = 'desc';
            } else if (this.sortDirection === 'desc') {
                // Третий клик — сброс сортировки
                this.sortColumn = null;
                this.sortDirection = null;
            }
        } else {
            this.sortColumn = columnKey;
            this.sortDirection = 'asc';
        }

        this.applySorting();
    }

    private applySorting(): void {
        if (!this.sortColumn || !this.sortDirection) {
            this.sortedData = [...this.data];
            return;
        }

        const column = this.sortColumn;
        const direction = this.sortDirection;

        this.sortedData = [...this.data].sort((a, b) => {
            const valA = this.getNestedProperty(a, column);
            const valB = this.getNestedProperty(b, column);

            if (valA == null && valB == null) return 0;
            if (valA == null) return 1;
            if (valB == null) return -1;

            if (typeof valA === 'string' && typeof valB === 'string' && !isNaN(Date.parse(valA)) && valA.includes('-')) {
                const diff = new Date(valA).getTime() - new Date(valB).getTime();
                return direction === 'asc' ? diff : -diff;
            }

            if (typeof valA === 'number' && typeof valB === 'number') {
                return direction === 'asc' ? valA - valB : valB - valA;
            }

            if (typeof valA === 'boolean' && typeof valB === 'boolean') {
                return direction === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
            }

            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            if (strA < strB) return direction === 'asc' ? -1 : 1;
            if (strA > strB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    getSortIcon(columnKey: string, columnType?: string): IconName {
        if (this.isUnsortable(columnType)) return 'circle';
        if (this.sortColumn !== columnKey) return 'arrow-down-up';
        if (this.sortDirection === 'asc') return 'sort-alpha-down';
        return 'sort-alpha-up';
    }

    isUnsortable(columnType?: string): boolean {
        return !!columnType && this.UNSORTABLE_TYPES.includes(columnType);
    }

    getNestedProperty(obj: any, path: string): any {
        return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
    }

    truncateText(text: string, maxLength = 75): string {
        if (!text) return '—';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    toggleCell(itemId: string | number, columnKey: string): void {
        const key = `${itemId}_${columnKey}`;
        if (this.expandedCells.has(key)) {
            this.expandedCells.delete(key);
        } else {
            this.expandedCells.add(key);
        }
    }

    isCellExpanded(itemId: string | number, columnKey: string): boolean {
        return this.expandedCells.has(`${itemId}_${columnKey}`);
    }
}
