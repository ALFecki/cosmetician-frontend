import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { CartService } from './cart.service';
import { AuthService } from './auth.service';
import { OrderService } from './order.service';
import { CartModel } from '../models/cart.model';
import { OrderModel } from '../models/order.model';

describe('Cart row and order totals', () => {
    let service: CartService;
    let order: OrderModel;
    beforeEach(() => {
        order = {
            totalPrice: 402,
            discountAmount: 0,
            products: [
                { product: { id: 'a', promotions: [] }, variant: { id: 'v1', price: 102 }, quantity: 1 },
                { product: { id: 'b', promotions: [] }, variant: { id: 'v2', price: 300 }, quantity: 1 },
            ],
        } as unknown as OrderModel;
        service = new CartService(
            { getLoginStatus: () => of(false), checkAuth: () => of(null) } as unknown as AuthService,
            {
                addProductToOrder: () => Promise.resolve(order),
                changeBatchQuantities: () => Promise.resolve(order),
            } as unknown as OrderService,
        );
    });
    afterEach(() => service.ngOnDestroy());
    it('uses backend order total once for two distinct variants (102 + 300 = 402)', async () => {
        await service.addProductToCart('v2');
        expect(await firstValueFrom(service.getTotalPrice())).toBe(402);
        expect((await firstValueFrom(service.getCartItems())).map(item => item.totalPrice)).toEqual([102, 300]);
    });
    it('keeps unchanged rows independent when quantity changes and reconciles server total', fakeAsync(() => {
        service.addProductToCart('v2');
        flushMicrotasks();
        let items: CartModel[] = [];
        service.getCartItems().subscribe(value => (items = value));
        service.increaseQuantity(items[0]);
        let total = 0;
        service.getTotalPrice().subscribe(value => (total = value));
        expect(total).toBe(504);
        order = { ...order, totalPrice: 500 };
        tick(3000);
        flushMicrotasks();
        expect(total).toBe(500);
    }));
    it('retains server discounts during optimistic quantity changes', async () => {
        order.totalPrice = 390;
        order.discountAmount = 12;
        await service.addProductToCart('v2');
        const items = await firstValueFrom(service.getCartItems());
        service.increaseQuantity(items[0]);
        expect(await firstValueFrom(service.getTotalPrice())).toBe(492);
        service.decreaseQuantity((await firstValueFrom(service.getCartItems()))[0]);
        expect(await firstValueFrom(service.getTotalPrice())).toBe(390);
    });
});
