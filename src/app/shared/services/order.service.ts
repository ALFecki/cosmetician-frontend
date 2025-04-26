import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { DataService } from '../base/services/data.service';
import { OrderModel } from '../models/order.model';
import { CreateOrderSchema, FilterOrderSchema, UpdateOrderSchema } from '../schemas/order.schema';
import { environment } from '../../../../environment';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
    providedIn: 'root',
})
export class OrderService extends DataService<OrderModel, CreateOrderSchema, UpdateOrderSchema, FilterOrderSchema> {
    protected override endpoint = 'order';
    currentOrder: OrderModel | null = null;

    override transformModel(data: OrderModel): OrderModel {
        return {
            id: data.id,
            personId: data.personId,
            totalPrice: data.totalPrice,
            status: data.status,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
        } as unknown as OrderModel;
    }

    getLastNotCheckedOrder(): Observable<OrderModel | null> {
        return this.http.get<{status: boolean, data: OrderModel}>(`${environment.server_url}/${this.endpoint}/person/last_non_checked`, { headers: new HttpHeaders({"X-Csrf-Token": ""}), withCredentials: true}).pipe(
            map((order) => {
                if (order.status) {
                    this.currentOrder = order.data;
                    return this.currentOrder;
                } else {
                    return null;
                }
            }),
            catchError(() => {
                return of(null);
            })
        );
    }

    // increaseQuantity(cartItem: OrderModel): void {
}
