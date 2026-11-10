import { environment } from '../../../environments/environment';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconsModule } from '../../shared/base/icons/icons.module';

@Component({
    selector: 'app-delivery-payment',
    imports: [RouterModule, IconsModule],
    templateUrl: './delivery-payment.component.html',
    styleUrl: './delivery-payment.component.scss',
})
export class DeliveryPaymentComponent {
    publicOfferUrl = environment.public_offer_url;
    personalDataUrl = environment.personal_data_url;
    receiptExampleUrl = environment.receipt_example_url;
}
