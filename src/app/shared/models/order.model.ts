import { ProductModel, ProductVariantModel } from './product.model';

export interface OrderModel {
    id: string;
    personId: string;
    status: string;
    products: OrderProductModel[];
    totalPrice: number;
    deliveryMethod: string;
    deliveryDate: Date;
    deliveryAddress: string;
    deliveryPostAddress: string;
    isCourierDelivery: boolean;
    paymentMethod: string;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderProductModel {
    product: ProductModel;
    variant: ProductVariantModel;
    quantity: number;
    historicalPrice: number;
    historicalCostPrice: number;
}
