import { Component, ViewChild } from '@angular/core';
import { AdminPanelSwitcherComponent } from '../../shared/components/admin-panel-switcher/admin-panel-switcher.component';

@Component({
    selector: 'app-admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.scss'],
    imports: [AdminPanelSwitcherComponent],
})
export class AdminComponent {
    @ViewChild(AdminPanelSwitcherComponent) panel?: AdminPanelSwitcherComponent;
    canLeave(): boolean {
        return this.panel?.canLeave() ?? true;
    }
}
