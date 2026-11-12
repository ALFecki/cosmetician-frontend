import { CheckoutDetails } from './checkout.model';
import { ProductModel, ProductVariantModel } from './product.model';

export interface OrderMinimalModel {
    id: string;
    personId: string;
    orderId: string | null;
    status: string;
    paymentStatus: string;
    paymentId: string | null;
    paymentFormUrl: string | null;
    totalPrice: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderModel extends OrderMinimalModel {
    cartRevision?: number;
    contactSnapshot?: (CheckoutDetails & { phone: string; phoneVerified?: boolean }) | null;
    products: OrderProductModel[];
    deliveryMethod: string;
    deliveryDate: Date;
    deliveryAddress: string;
    deliveryPostAddress: string;
    promoCodeId: string | null;
    discountAmount: number | null;
    deliveryCost: number;
    isCourierDelivery: boolean;
    paymentMethod: string;
    comment: string;
}

export interface OrderProductModel {
    product: ProductModel;
    variant: ProductVariantModel;
    quantity: number;
    historicalPrice: number;
    historicalCostPrice: number;
}
