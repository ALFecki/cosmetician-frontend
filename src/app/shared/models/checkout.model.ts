import { OrderModel } from './order.model';

export interface CartItemInput {
    variantId: string;
    quantity: number;
}
export interface DeliveryAddress {
    city: string;
    street: string;
    house: string;
    building: string;
    apartment: string;
    postalCode: string;
}
export interface CheckoutDetails {
    firstName: string;
    secondName: string;
    email: string | null;
    deliveryMethod: string;
    paymentMethod: string;
    isCourierDelivery: boolean;
    address: DeliveryAddress | null;
    postPlacementId: number | null;
    deliveryPostAddress: string | null;
    comment: string | null;
    offerConsent: boolean;
}
export interface CartQuote {
    order: OrderModel;
    items: CartItemInput[];
    unavailableItems: CartItemInput[];
    promoCode: string | null;
    promoCodeError: string | null;
    subtotalCents: number;
    promotionDiscountCents: number;
    promoCodeDiscountCents: number;
    totalCents: number;
}
export interface QuoteRequest {
    items: CartItemInput[];
    promoCode?: string | null;
    deliveryMethod?: string;
    isCourierDelivery?: boolean;
}
export interface CheckoutRequest extends QuoteRequest {
    cartId: string;
    expectedRevision: number;
    checkoutKey: string;
    details: CheckoutDetails;
    expectedTotalCents: number;
}
export interface PhoneChallenge {
    challengeId: string;
    csrfToken: string;
    retryAfter: number;
    expiresIn: number;
}
export interface PhoneConfig {
    enabled: boolean;
    phoneLoginAvailable: boolean;
}
