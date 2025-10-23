import { ProductModel, ProductVariantModel } from './product.model';

export interface OrderMinimalModel {
    id: string;
    personId: string;
    status: string;
    paymentStatus: string;
    paymentId: string | null;
    paymentFormUrl: string | null;
    totalPrice: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderModel extends OrderMinimalModel {
    products: OrderProductModel[];
    deliveryMethod: string;
    deliveryDate: Date;
    deliveryAddress: string;
    deliveryPostAddress: string;
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
