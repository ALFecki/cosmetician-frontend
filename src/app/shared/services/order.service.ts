import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, map, Observable, of } from 'rxjs';
import { environment } from '../../../../environment';
import { DataService } from '../base/services/data.service';
import { OrderModel } from '../models/order.model';
import { CreateOrderSchema, FilterOrderSchema, UpdateOrderSchema } from '../schemas/order.schema';
import { ToastService } from './toast.service';

@Injectable({
    providedIn: 'root',
})
export class OrderService extends DataService<OrderModel, CreateOrderSchema, UpdateOrderSchema, FilterOrderSchema> {
    protected override endpoint = 'order';
    currentOrder: OrderModel | null = null;
    toastService: ToastService = inject(ToastService);

    constructor(private httpClient: HttpClient) {
        super(httpClient);
    }

    getProductCount(): Observable<number> {
        if (this.currentOrder) {
            return of(this.currentOrder.products.length);
        }
        return of(0);
    }

    async addProductToOrder(variantId: string): Promise<OrderModel | null> {
        const order = await firstValueFrom(
            this.http.post<OrderModel>(`${environment.server_url}/${this.endpoint}/attach_product/${variantId}`, {}),
        );

        if (order) {
            this.currentOrder = order;
            this.toastService.show('Товар добавлен в заказ', 'success');
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
                    if (order.status && order.data) {
                        this.currentOrder = order.data;
                        return this.currentOrder;
                    } else {
                        return null;
                    }
                }),
                catchError(() => {
                    this.toastService.show('Ошибка получения последнего заказа', 'error');
                    return of(null);
                }),
            );
    }

    async changeQuantity(variantId: string, quantity: number): Promise<OrderModel | null> {
        console.log('Current order:', this.currentOrder);
        if (this.currentOrder) {
            const cartItem = this.currentOrder.products.find(item => item.variant.id === variantId);
            const newOrder = await firstValueFrom(
                this.http.patch<OrderModel>(
                    `${environment.server_url}/${this.endpoint}/product/${variantId}/quantity/${quantity}`,
                    cartItem,
                ),
            );
            this.currentOrder = newOrder;
            this.toastService.show('Количество товара изменено', 'success');
            return this.currentOrder;
        }
        return null;
    }

    async changeBatchQuantities(cartItems: Record<string, number>): Promise<OrderModel | null> {
        const result = await firstValueFrom(
            this.http.put<{ status: boolean; data: OrderModel }>(
                `${environment.server_url}/${this.endpoint}/batch-quantity`,
                { variants: cartItems },
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
            this.toastService.show('Товар удален из заказа', 'success');
            return this.currentOrder;
        }
        return null;
    }

    async syncOrder(): Promise<OrderModel | null> {
        await firstValueFrom(
            this.http.get(`${environment.server_url}/${this.endpoint}/products/sync`, {
                withCredentials: true,
            }),
        );
        this.currentOrder = null;
        return this.currentOrder;
    }

    async checkout(): Promise<OrderModel | null> {
        try {
            const order = await firstValueFrom(
                this.http.get<OrderModel>(`${environment.server_url}/${this.endpoint}/person/checkout`, {
                    withCredentials: true,
                }),
            );

            if (order) {
                this.currentOrder = null; // Clear current order after checkout
                this.toastService.show('Заказ успешно оформлен', 'success');
                return order;
            }
            return null;
        } catch (error) {
            this.toastService.show('Ошибка при оформлении заказа', 'error');
            throw error;
        }
    }

    getUserOrders(): Observable<OrderModel[]> {
        return this.getAll({ personId: this.currentOrder?.personId }).pipe(
            map(response => {
                if (response.status) {
                    return response.data;
                } else {
                    this.toastService.show('Ошибка получения заказов', 'error');
                    return [];
                }
            }),
        );
    }
}
