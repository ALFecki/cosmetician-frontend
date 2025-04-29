import { Injectable } from '@angular/core';
import { catchError, firstValueFrom, map, Observable, of } from 'rxjs';
import { environment } from '../../../../environment';
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

    getProductCount(): Observable<number> {
        if (this.currentOrder) {
            return of(this.currentOrder.products.length);
        }
        return of(0);
    }

    async addProductToOrder(productId: string): Promise<OrderModel | null> {
        const order = await firstValueFrom(
            this.http.post<OrderModel>(`${environment.server_url}/${this.endpoint}/attach_product/${productId}`, {}),
        );

        if (order) {
            this.currentOrder = order;
            return this.currentOrder;
        } else {
            return null;
        }
    }

    getLastNotCheckedOrder(): Observable<OrderModel | null> {
        return this.http
            .get<{
                status: boolean;
                data: OrderModel;
            }>(`${environment.server_url}/${this.endpoint}/person/last_non_checked`, { withCredentials: true })
            .pipe(
                map(order => {
                    if (order.status) {
                        this.currentOrder = order.data;
                        return this.currentOrder;
                    } else {
                        return null;
                    }
                }),
                catchError(() => {
                    return of(null);
                }),
            );
    }

    async changeQuantity(productId: string, quantity: number): Promise<OrderModel | null> {
        console.log('Current order:', this.currentOrder);
        if (this.currentOrder) {
            const cartItem = this.currentOrder.products.find(item => item.product.id === productId);
            const newOrder = await firstValueFrom(
                this.http.patch<OrderModel>(
                    `${environment.server_url}/${this.endpoint}/product/${productId}/quantity/${quantity}`,
                    cartItem,
                ),
            );
            this.currentOrder = newOrder;
            return this.currentOrder;
        }
        return null;
    }

    async changeBatchQuantities(cartItems: Record<string, number>): Promise<OrderModel | null> {
        const result = await firstValueFrom(
            this.http.put<{ status: boolean; data: OrderModel }>(
                `${environment.server_url}/${this.endpoint}/batch-quantity`,
                { products: cartItems },
                { withCredentials: true },
            ),
        )
            .then(order => {
                if (order.status) {
                    this.currentOrder = order.data;
                    return this.currentOrder;
                } else {
                    return null;
                }
            })
            .catch(() => {
                return null;
            });
        return result;
    }

    async removeProduct(productId: string): Promise<OrderModel | null> {
        if (this.currentOrder) {
            const newOrder = await firstValueFrom(
                this.http.delete<OrderModel>(`${environment.server_url}/${this.endpoint}/product/${productId}`),
            );
            this.currentOrder = newOrder;
            console.log('Updated order after removing product:', this.currentOrder);
            return this.currentOrder;
        }
        return null;
    }
}
