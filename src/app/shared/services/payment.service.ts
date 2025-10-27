import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { OrderMinimalModel } from '../models/order.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class PaymentService {
    constructor(private http: HttpClient) {}

    processPayment(order: OrderMinimalModel) {
        return this.http.post<{ formUrl: string; orderId: string }>(`${environment.server_url}/payments/process`, order);
    }
}
