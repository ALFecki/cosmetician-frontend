import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconsModule } from '../../shared/base/icons/icons.module';

@Component({
    selector: 'app-delivery-payment',
    imports: [CommonModule, RouterModule, IconsModule],
    templateUrl: './delivery-payment.component.html',
    styleUrl: './delivery-payment.component.scss'
})
export class DeliveryPaymentComponent {}
