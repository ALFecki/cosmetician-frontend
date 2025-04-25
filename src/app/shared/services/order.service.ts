import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { DataService } from '../base/services/data.service';
import { OrderModel } from '../models/order.model';
import { CreateOrderSchema, FilterOrderSchema, UpdateOrderSchema } from '../schemas/order.schema';

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

    getLastNotCheckedOrder(personId: string): Observable<OrderModel | null> {
        const schema = {
            personId: personId,
            status: 'NotChecked',
        } as FilterOrderSchema;

        return this.getByFilterSchema(schema).pipe(
            map(response => {
                if (response.data.length > 0) {
                    this.currentOrder = response.data[0];
                    return response.data[0];
                } else {
                    return null;
                }
            }),
            catchError(error => {
                console.error('Error fetching last not checked order:', error);
                return of(null);
            }),
        );
    }
}
