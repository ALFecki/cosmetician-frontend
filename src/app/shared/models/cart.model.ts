import { ProductModel, ProductVariantModel } from './product.model';

export interface CartModel {
    product: ProductModel;
    variant: ProductVariantModel;
    quantity: number;
    totalPrice: number;
}
