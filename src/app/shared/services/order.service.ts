import { Injectable } from '@angular/core';
import { DataService } from '../base/services/data.service';
import { OrderModel } from '../models/order.model';
import { CreateOrderSchema, FilterOrderSchema, UpdateOrderSchema } from '../schemas/order.schema';

@Injectable({
    providedIn: 'root',
})
export class OrderService extends DataService<OrderModel, CreateOrderSchema, UpdateOrderSchema, FilterOrderSchema> {
    protected override endpoint = 'order';

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
}
