import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environment';

@Injectable({
    providedIn: 'root',
})
export class CartService {
    private apiUrl = environment.server_url;
    private cart: { productId: string; quantity: number }[] = [];

    constructor(private http: HttpClient) {}

    addToCart(orderId: string, productId: string, quantity: number) {
        const existingProduct = this.cart.find(item => item.productId === productId);
        if (existingProduct) {
            existingProduct.quantity += quantity;
            this.http.patch(`${this.apiUrl}/order/${orderId}/product/${productId}/quantity/${existingProduct.quantity}`, {}).subscribe();
        } else {
            this.cart.push({ productId, quantity });
            this.http.post(`${this.apiUrl}/order/${orderId}/attach_products`, { product_ids: [productId] }).subscribe();
        }
    }

    removeFromCart(orderId: string, productId: string) {
        const existingProduct = this.cart.find(item => item.productId === productId);
        if (existingProduct && existingProduct.quantity > 1) {
            existingProduct.quantity -= 1;
            this.http.patch(`${this.apiUrl}/order/${orderId}/product/${productId}/quantity/${existingProduct.quantity}`, {}).subscribe();
        } else {
            this.cart = this.cart.filter(item => item.productId !== productId);
            this.http.delete(`${this.apiUrl}/order/${orderId}/product/${productId}`).subscribe();
        }
    }
}
