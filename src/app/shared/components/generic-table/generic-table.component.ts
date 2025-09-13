/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { IconsModule } from '../../base/icons/icons.module';
import { ImageUrlPipe } from '../../utils/image-url.pipe';

@Component({
    selector: 'app-generic-table',
    imports: [CommonModule, IconsModule, ImageUrlPipe],
    templateUrl: './generic-table.component.html',
    styleUrls: ['./generic-table.component.scss'],
})
export class GenericTableComponent {
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

    getNestedProperty(obj: any, path: string): any {
        return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
    }
}
