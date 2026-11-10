import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-personal-data-redirect',
    template: '<p>Перенаправление...</p>',
    standalone: true,
})
export class PersonalDataRedirectComponent implements OnInit {
    private readonly platformId = inject(PLATFORM_ID);

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            window.location.href = environment.personal_data_url;
        }
    }
}
