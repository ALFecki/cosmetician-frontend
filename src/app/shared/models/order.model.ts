import { ProductModel, ProductVariantModel } from './product.model';

export interface OrderModel {
    id: string;
    personId: string;
    status: string;
    products: OrderProductModel[];
    totalPrice: number;
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
