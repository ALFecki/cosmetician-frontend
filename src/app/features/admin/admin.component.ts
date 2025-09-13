import { Component } from '@angular/core';
import { AdminPanelSwitcherComponent } from '../../shared/components/admin-panel-switcher/admin-panel-switcher.component';

@Component({
    selector: 'app-admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.scss'],
    imports: [AdminPanelSwitcherComponent],
})
export class AdminComponent {
    // This component serves as a placeholder for the admin panel.
    // It can be extended in the future to include additional functionality or features.
}
