import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-personal-data-redirect',
    template: '<p>Перенаправление...</p>',
    standalone: true,
})
export class PersonalDataRedirectComponent implements OnInit {
    ngOnInit() {
        window.location.href = environment.personal_data_url;
    }
}
