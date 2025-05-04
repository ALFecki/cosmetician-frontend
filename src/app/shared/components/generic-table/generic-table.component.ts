/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconsModule } from '../../base/icons/icons.module';


@Component({
    selector: 'app-generic-table',
    standalone: true,
    imports: [CommonModule, IconsModule],
    templateUrl: './generic-table.component.html',
    styleUrl: './generic-table.component.scss',
})
export class GenericTableComponent {
    @Input() data: any[] = [];
    @Input() columns: { key: string; title: string; type?: string }[] = [];
    @Input() key = '';

    @Output() editItem = new EventEmitter<any>();
    @Output() deleteItem = new EventEmitter<any>();
    @Output() cascadeDeleteItem = new EventEmitter<any>();
    @Output() restoreItem = new EventEmitter<any>();

    getNestedProperty(obj: any, path: string): any {
        return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
    }

    onEdit(item: any) {
        this.editItem.emit(item);
    }

    onDelete(item: any) {
        this.deleteItem.emit(item);
    }

    onCascadeDelete(item: any) {
        this.cascadeDeleteItem.emit(item);
    }

    onRestore(item: any) {
        this.restoreItem.emit(item);
    }
    
}
