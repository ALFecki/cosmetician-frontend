import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ListResponse, SingleResponse } from '../base/schemas/base_schema';
import { CheckoutDetails, CheckoutRequest } from '../models/checkout.model';
import { OrderMinimalModel, OrderModel } from '../models/order.model';
import { PersonModel } from '../models/person.model';

export interface GuestSession {
    csrfToken: string;
    expiresAt: number;
    customer: PersonModel;
}

@Injectable({ providedIn: 'root' })
export class GuestCheckoutService {
    private readonly url = `${environment.server_url}/checkout/guest`;
    session: GuestSession | null = null;
    readonly ready: Promise<GuestSession | null>;

    constructor(private http: HttpClient) {
        this.ready = Promise.resolve()
            .then(() => (typeof window === 'undefined' ? null : this.restore()))
            .catch(() => null);
    }

    async restore(): Promise<GuestSession | null> {
        try {
            this.session = await firstValueFrom(this.http.get<GuestSession>(`${this.url}/session`, { withCredentials: true }));
        } catch (error) {
            if (![401, 404].includes((error as { status: number }).status)) throw error;
            this.session = null;
        }
        return this.session;
    }

    async ensureSession(details: CheckoutDetails): Promise<GuestSession> {
        await this.ready;
        if (typeof navigator === 'undefined' || !navigator.locks) {
            if (await this.restore()) return this.session!;
            throw new Error('Оформление без регистрации недоступно. Войдите в аккаунт или свяжитесь с магазином.');
        }
        return navigator.locks.request('skviderm-guest-session', async () => {
            const restored = await this.restore();
            if (restored) return restored;
            this.session = await firstValueFrom(this.http.post<GuestSession>(`${this.url}/session`, details, { withCredentials: true }));
            return this.session;
        });
    }

    private options() {
        if (!this.session || this.session.expiresAt * 1000 <= Date.now())
            throw new Error('Не удалось открыть заказ. Свяжитесь с магазином — мы поможем.');
        return { withCredentials: true, headers: { 'X-Guest-CSRF': this.session.csrfToken } };
    }

    checkout(request: CheckoutRequest): Promise<OrderModel> {
        return firstValueFrom(this.http.post<OrderModel>(this.url, request, this.options()));
    }

    getOrders(page = 1): Promise<ListResponse<OrderMinimalModel>> {
        return firstValueFrom(this.http.get<ListResponse<OrderMinimalModel>>(`${this.url}/orders?page=${page}&limit=20`, this.options()));
    }

    getOrder(id: string) {
        return this.http.get<SingleResponse<OrderModel>>(`${this.url}/orders/${id}`, this.options());
    }

    async findAttempt(key: string): Promise<OrderModel | null> {
        try {
            return await firstValueFrom(this.http.get<OrderModel>(`${this.url}/attempt/${key}`, this.options()));
        } catch (error) {
            if ((error as { status: number }).status === 404) return null;
            throw error;
        }
    }

    pay(id: string) {
        return this.http.post<{ formUrl: string; orderId: string }>(`${this.url}/payments/process`, { id }, this.options());
    }

    claim(): Promise<{ claimed: number }> {
        return firstValueFrom(this.http.post<{ claimed: number }>(`${this.url}/claim`, {}, this.options()));
    }
}
